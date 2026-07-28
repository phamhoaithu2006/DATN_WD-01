import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import ChatBox from "../../components/customer/ChatBox";
import CustomerPresenceHeartbeat from "../../components/customer/CustomerPresenceHeartbeat";
import { resetChatSession } from "../../components/customer/chatbot/chatStorage";
import Footer from "../../components/customer/Footer";
import Header from "../../components/customer/Header";



import {
  addWishlist,
  fetchBookings,
  fetchGuideReviewableBookings,
  fetchHomeContent,
  fetchProfileSummary,
  fetchTours,
  fetchWishlist,
  removeWishlist,
} from "../../services/customerApi";
import { getPublicWidgets } from "../../services/publicWidgetApi";
import { logout as logoutApi } from "../../services/authApi";
import {
  clearSession,
  readSession,
  readToken,
} from "../../services/authStorage";
import "../../styles/customer.css";
import DestinationsPage from "./DestinationsPage";
import HomePage from "./HomePage";
import ProfileDashboard from "./ProfileDashboard";
import ProfileForm from "./ProfileForm";
import ToursPage from "./ToursPage";
import CustomerTourDetailPage from "./TourDetailPage";
import CustomerSupportPage from "./CustomerSupportPage";
import {
  isDomesticTour,
  normalizeTour,
} from "../../utils/tourNormalizer";

const fallbackProfile = {
  full_name: "Khách hàng ViVuGo",
  email: "khachhang@vivugo.vn",
  phone: "Chưa cập nhật",
  avatar_url: "",
};

function readStoredFavorites() {
  try {
    return JSON.parse(localStorage.getItem("vivugo_favorites") || "[]");
  } catch {
    return [];
  }
}

function CustomerPage() {
  const location = useLocation();
  const token = readToken();

  const [user, setUser] = useState(readSession);
  const [tours, setTours] = useState([]);
  const [hasLiveTours, setHasLiveTours] = useState(false);
  const [favorites, setFavorites] = useState(readStoredFavorites);
  const [bookings, setBookings] = useState([]);
  const [reviewNotifications, setReviewNotifications] = useState([]);
  const [homeContent, setHomeContent] = useState({});
  const [homeBanners, setHomeBanners] = useState([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeLoadError, setHomeLoadError] = useState("");
  const [tourLoadError, setTourLoadError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const [summary, setSummary] = useState({
    bookings_count: 0,
    wishlist_count: 0,
  });

  const [profile, setProfile] = useState(() => ({
    ...fallbackProfile,
    ...readSession(),
  }));

  const normalizedTours = useMemo(
    () => tours.map(normalizeTour),
    [tours],
  );

  const normalizedHomeContent = useMemo(() => ({
    ...homeContent,
    featured_tours: Array.isArray(homeContent.featured_tours)
      ? homeContent.featured_tours.map(normalizeTour)
      : [],
  }), [homeContent]);

  const homeInternationalTours = useMemo(() => {
    const international = normalizedTours
      .filter((tour) => !isDomesticTour(tour))
      .slice(0, 4);

    return international;
  }, [normalizedTours]);

  const discountedTours = useMemo(() => {
    return normalizedTours
      .filter((tour) => {
        const base = tour.price?.base || 0;
        const discount = tour.price?.discount;
        return discount !== null && discount !== undefined && discount > 0 && discount < base;
      })
      .slice(0, 6);
  }, [normalizedTours]);

  // Tour sắp khởi hành: lấy các tour có ngày khởi hành gần hiện tại nhất
  // (không giới hạn cửa sổ ngày để section luôn có dữ liệu).
  const upcomingTours = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return normalizedTours
      .filter((tour) => {
        const depDate = tour.nextDepartureDate || tour.nextDeparture?.departure_date;
        if (!depDate) return false;
        return new Date(depDate).getTime() >= startOfToday.getTime();
      })
      .sort((a, b) => {
        const dateA = new Date(a.nextDepartureDate || a.nextDeparture?.departure_date).getTime();
        const dateB = new Date(b.nextDepartureDate || b.nextDeparture?.departure_date).getTime();
        return dateA - dateB;
      })
      .slice(0, 4);
  }, [normalizedTours]);

  const pendingPaymentCount = useMemo(() => bookings.filter((booking) => (
    booking.status === "pending"
    && booking.payment_status === "unpaid"
    && booking.payment?.payment_method === "vnpay"
    && booking.payment?.status === "pending"
    && new Date(booking.payment.expires_at).getTime() > currentTime
  )).length, [bookings, currentTime]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 5000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHomeContent() {
      try {
        setHomeLoading(true);
        const [content, widgetRes] = await Promise.all([
          fetchHomeContent().catch(() => ({})),
          getPublicWidgets({ page: "home" }).catch(() => ({ data: [] })),
        ]);

        if (active) {
          setHomeContent(content || {});
          const bannerList = Array.isArray(widgetRes?.data)
            ? widgetRes.data
            : Array.isArray(widgetRes)
            ? widgetRes
            : [];
          setHomeBanners(bannerList);
          setHomeLoadError("");
        }
      } catch {
        if (active) {
          setHomeContent({});
          setHomeBanners([]);
          setHomeLoadError("Không thể tải nội dung trang chủ.");
        }
      } finally {
        if (active) {
          setHomeLoading(false);
        }
      }
    }

    loadHomeContent();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    // Các trang danh sách tour tự fetch với bộ lọc nâng cao (ToursPage);
    // tránh gọi API trùng lặp ở đây.
    const selfFetchingRoutes = ["/tours", "/deals", "/customer/search"];

    if (selfFetchingRoutes.includes(location.pathname)) {
      return undefined;
    }

    async function loadTours() {
      const query = new URLSearchParams(location.search);

      const rawCategory =
        query.get("category_id") || query.get("category");

      const categoryId = /^\d+$/.test(String(rawCategory || ""))
        ? rawCategory
        : undefined;

      const scope = query.get("scope");

      const searchParams = {
        keyword: query.get("q") || undefined,
        category_id: categoryId,
        destination_id: query.get("destination_id") || undefined,
        departure_date:
          query.get("departure_date") || query.get("date") || undefined,
        guests: query.get("guests") || query.get("min_slots") || undefined,
        min_price: query.get("min_price") || undefined,
        max_price: query.get("max_price") || undefined,
        duration_days: query.get("duration_days") || undefined,
        sort: query.get("sort") || undefined,
      };

      try {
        if (active) {
          setTourLoadError("");
        }

        const response = await fetchTours(searchParams);
        const items = Array.isArray(response) ? response : [];

        const scopedItems =
          scope === "domestic"
            ? items.filter((tour, index) =>
              isDomesticTour(normalizeTour(tour, index)),
            )
            : scope === "international"
              ? items.filter(
                (tour, index) =>
                  !isDomesticTour(normalizeTour(tour, index)),
              )
              : items;

        if (!active) return;

        setTours(scopedItems);
        setHasLiveTours(true);
      } catch (error) {
        console.error("Không thể tải danh sách tour:", error);

        if (active) {
          setTours([]);
          setHasLiveTours(false);
          setTourLoadError("Không thể tải danh sách tour.");
        }
      }
    }

    loadTours();

    return () => {
      active = false;
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    Promise.all([
      fetchWishlist(),
      fetchProfileSummary(),
      fetchBookings(),
    ])
      .then(([wishlist, account, accountBookings]) => {
        if (!active) return;

        setFavorites(
          (wishlist || [])
            .map((item) => item.tour_id || item.tour?.id || item.id)
            .filter(Boolean),
        );

        setSummary(account || {});
        setBookings(accountBookings || []);

        setProfile((current) => ({
          ...current,
          ...(account || {}),
        }));

        setUser((current) => ({
          ...current,
          ...(account || {}),
        }));
      })
      .catch(() => { });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || location.pathname !== "/customer/bookings") return undefined;

    let active = true;

    fetchBookings()
      .then((accountBookings) => {
        if (active) setBookings(accountBookings || []);
      })
      .catch(() => { });

    return () => {
      active = false;
    };
  }, [location.pathname, token]);

  useEffect(() => {
    if (!token) {
      setReviewNotifications([]);
      return undefined;
    }

    let active = true;

    async function loadReviewNotifications() {
      try {
        const items = await fetchGuideReviewableBookings();

        if (active) {
          setReviewNotifications(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        console.error("Không thể tải thông báo đánh giá:", error);

        if (active) {
          setReviewNotifications([]);
        }
      }
    }

    loadReviewNotifications();

    const timer = window.setInterval(loadReviewNotifications, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token, location.pathname]);

  function updateBooking(updatedBooking) {
    setBookings((current) => current.map((booking) => (
      booking.id === updatedBooking.id
        ? {
          ...booking,
          ...updatedBooking,
          tour: updatedBooking.tour || booking.tour,
          tour_departure: updatedBooking.tour_departure || booking.tour_departure,
        }
        : booking
    )));
  }

  async function toggleFavorite(tour) {
    const exists = favorites.includes(tour.id);

    const next = exists
      ? favorites.filter((id) => id !== tour.id)
      : [...favorites, tour.id];

    setFavorites(next);
    localStorage.setItem("vivugo_favorites", JSON.stringify(next));

    if (!token) return;

    try {
      if (exists) {
        await removeWishlist(tour.id);
      } else {
        await addWishlist(tour.id);
      }
    } catch {
      // Giữ trạng thái local nếu API chưa phản hồi được.
    }
  }
  function logout() {
    const currentUserId = user?.id ?? null;
    const tokenToRevoke = readToken();

    resetChatSession(currentUserId);
    clearSession();
    resetChatSession(null);
    setUser(null);
    setFavorites(readStoredFavorites());

    void logoutApi(tokenToRevoke).catch(() => {
      // Token có thể đã hết hạn; client session đã được xóa an toàn.
    });
  }

  const favoriteTours = normalizedTours.filter((tour) =>
    favorites.includes(tour.id),
  );

  const route = location.pathname;
  const chatUserId = token && user?.id ? user.id : null;
  const canRenderChat = !token || chatUserId;
  const pageParams = new URLSearchParams(location.search);
  const isSupportPage =
    route === "/customer/support" ||
    (route === "/customer/profile" && pageParams.get("view") === "support");

  const matchGuideReview = route.match(
    /^\/customer\/reviews\/(\d+)$/,
  );
  const matchTourDetail = route.match(/^\/tours\/([^/]+)$/);

  const accountRoutes = [
    "/customer/profile",
    "/customer/bookings",
    "/customer/favorites",
    "/customer/settings",
  ];

  let content = (
    <HomePage
      tours={normalizedTours}
      internationalTours={homeInternationalTours}
      discountedTours={discountedTours}
      upcomingTours={upcomingTours}
      banners={homeBanners}
      favorites={favorites}
      homeContent={normalizedHomeContent}
      loading={homeLoading}
      tourLoadError={homeLoadError || tourLoadError}
      onFavorite={toggleFavorite}
    />
  );

  if (matchGuideReview) {
    content = user ? (
      <GuideReviewPage bookingId={matchGuideReview[1]} />
    ) : (
      <Navigate to="/auth/login" replace />
    );
  } else if (matchTourDetail) {
    content = (
      <CustomerTourDetailPage
        tourId={matchTourDetail[1]}
        tours={normalizedTours}
        hasLiveTours={hasLiveTours}
        favorites={favorites}
        onFavorite={toggleFavorite}
      />
    );
  } else if (
    route === "/tours" ||
    route === "/deals" ||
    route === "/customer/search"
  ) {
    content = (
      <ToursPage
        favorites={favorites}
        onFavorite={toggleFavorite}
      />
    );
  } else if (route === "/destinations") {
    content = <DestinationsPage />;
  } else if (isSupportPage) {
    content = user ? (
      <CustomerSupportPage profile={profile} />
    ) : (
      <Navigate to="/auth/login" replace />
    );
  } else if (accountRoutes.includes(route)) {
    content = user ? (
      <ProfileDashboard
        route={route}
        profile={profile}
        summary={summary}
        bookings={bookings}
        favoriteTours={favoriteTours}
        onFavorite={toggleFavorite}
        onBookingUpdated={updateBooking}
      />
    ) : (
      <Navigate to="/auth/login" replace />
    );
  } else if (route === "/customer/profile/edit") {
    content = user ? (
      <ProfileForm profile={profile} setProfile={setProfile} />
    ) : (
      <Navigate to="/auth/login" replace />
    );
  } else if (route === "/customer/password") {
    content = user ? (
      <ProfileForm
        profile={profile}
        setProfile={setProfile}
        password
      />
    ) : (
      <Navigate to="/auth/login" replace />
    );
  }

  return (
    <div
      className={`vg-app ${location.pathname === "/" ? "is-home-page" : ""
        }`}
    >
      {token ? <CustomerPresenceHeartbeat /> : null}
      <Header
        user={user}
        onLogout={logout}
        pendingCount={pendingPaymentCount}
        reviewNotifications={reviewNotifications}
        reviewNotificationCount={reviewNotifications.length}
      />
      {content}
      <Footer />
      {canRenderChat ? (
        <ChatBox
          key={chatUserId ? `user-${chatUserId}` : "guest"}
          userId={chatUserId}
        />
      ) : null}
    </div>
  );
}

export default CustomerPage;
