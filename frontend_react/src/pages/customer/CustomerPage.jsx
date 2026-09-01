import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import CustomerPresenceHeartbeat from "../../components/customer/CustomerPresenceHeartbeat";
import { resetChatSession } from "../../components/customer/chatbot/chatStorage";
import Footer from "../../components/customer/Footer";
import Header from "../../components/customer/Header";



import {
  addWishlist,
  fetchBookings,
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
import {
  isDomesticTour,
  normalizeTour,
} from "../../utils/tourNormalizer";

const ChatBox = lazy(() => import("../../components/customer/ChatBox"));
const DestinationsPage = lazy(() => import("./DestinationsPage"));
const HomePage = lazy(() => import("./HomePage"));
const ProfileDashboard = lazy(() => import("./ProfileDashboard"));
const ProfileForm = lazy(() => import("./ProfileForm"));
const ToursPage = lazy(() => import("./ToursPage"));
const CustomerTourDetailPage = lazy(() => import("./TourDetailPage"));
const CustomerSupportPage = lazy(() => import("./CustomerSupportPage"));
const FaqPage = lazy(() => import("./FaqPage"));
const PolicyPage = lazy(() => import("./PolicyPage"));

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
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [reviewNotifications, setReviewNotifications] = useState([]);
  const [homeContent, setHomeContent] = useState({});
  const [homeBanners, setHomeBanners] = useState([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [tourLoading, setTourLoading] = useState(true);
  const [homeLoadError, setHomeLoadError] = useState("");
  const [tourLoadError, setTourLoadError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [summary, setSummary] = useState({
    bookings_count: 0,
    wishlist_count: 0,
  });

  useEffect(() => {
    const updateScrollTopVisibility = () => setShowScrollTop(window.scrollY > 420);

    updateScrollTopVisibility();
    window.addEventListener("scroll", updateScrollTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollTopVisibility);
  }, []);

  const [profile, setProfile] = useState(() => ({
    ...fallbackProfile,
    ...readSession(),
  }));

  // CustomerPage là vỏ chung của mọi trang khách hàng: chỉ yêu cầu dữ liệu
  // đúng với route hiện tại, không tải trước toàn bộ dữ liệu tài khoản.
  const route = location.pathname;
  const isHomeRoute = route === "/";
  const isTourListRoute = ["/tours", "/deals", "/customer/search"].includes(route);
  const isTourDetailRoute = /^\/tours\/[^/]+$/.test(route);
  const isAccountRoute = ["/customer/profile", "/customer/bookings", "/customer/favorites", "/customer/settings", "/customer/profile/edit", "/customer/password"].includes(route);
  const isSupportRoute = route === "/customer/support" || (route === "/customer/profile" && new URLSearchParams(location.search).get("view") === "support");

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
      .slice(0, 6);

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
      .slice(0, 6);
  }, [normalizedTours]);

  const pendingPaymentCount = useMemo(() => bookings.filter((booking) => (
    booking.status === "awaiting_payment"
    && booking.payment_status === "unpaid"
    && booking.payment?.payment_method === "vnpay"
    && booking.payment?.status === "pending"
    && new Date(booking.payment.expires_at).getTime() > currentTime
  )).length, [bookings, currentTime]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 15000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isHomeRoute) return undefined;
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
  }, [isHomeRoute]);

  useEffect(() => {
    let active = true;

    // Các trang danh sách tour tự fetch với bộ lọc nâng cao (ToursPage);
    // tránh gọi API trùng lặp ở đây.
    if (!isHomeRoute || isTourListRoute || isTourDetailRoute) {
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
          setTourLoading(true);
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
      } finally {
        if (active) {
          setTourLoading(false);
        }
      }
    }

    loadTours();

    return () => {
      active = false;
    };
  }, [isHomeRoute, isTourDetailRoute, isTourListRoute, location.search]);

  useEffect(() => {
    if (!token || !(isAccountRoute || isSupportRoute)) return undefined;

    let active = true;
    fetchProfileSummary()
      .then((account) => {
        if (!active) return;

        setSummary(account || {});

        setProfile((current) => ({
          ...current,
          ...(account || {}),
        }));

        setUser((current) => ({
          ...current,
          ...(account || {}),
        }));
      })
      .catch(() => {
        // Dùng dữ liệu phiên cục bộ nếu API hồ sơ tạm thời lỗi.
      });

    return () => {
      active = false;
    };
  }, [isAccountRoute, isSupportRoute, token]);

  useEffect(() => {
    if (!token || route !== "/customer/bookings") return undefined;

    let active = true;
    setBookingsLoaded(false);

    fetchBookings()
      .then((accountBookings) => {
        if (active) {
          setBookings(accountBookings || []);
          setBookingsLoaded(true);
        }
      })
      .catch(() => {
        if (active) setBookingsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [route, token]);

  useEffect(() => {
    if (!token || route !== "/customer/bookings") {
      setReviewNotifications([]);
      return undefined;
    }

    let active = true;

    async function loadReviewNotifications() {
      try {
        // Đánh giá được tải tại ProfileDashboard khi người dùng mở mục
        // "Chuyến đi"; không gọi API nền từ vỏ trang chung.
        const items = [];

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

    const timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') loadReviewNotifications();
      }, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [route, token]);

  useEffect(() => {
    const needsFavorites = token && (isHomeRoute || isTourListRoute || isTourDetailRoute || route === "/customer/favorites");
    if (!needsFavorites) return undefined;

    let active = true;
    setFavoritesLoaded(false);
    fetchWishlist()
      .then((wishlist) => {
        if (active) setFavorites((wishlist || []).map((item) => item.tour_id || item.tour?.id || item.id).filter(Boolean));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setFavoritesLoaded(true);
      });

    return () => { active = false; };
  }, [isHomeRoute, isTourDetailRoute, isTourListRoute, route, token]);

  function updateBooking(updatedBooking) {
    const cancellationCount = updatedBooking.customer_cancellation_count;
    const cancellationLimit = updatedBooking.customer_cancellation_limit;

    setBookings((current) => current.map((booking) => (
      booking.id === updatedBooking.id
        ? {
          ...booking,
          ...updatedBooking,
          tour: updatedBooking.tour || booking.tour,
          tour_departure: updatedBooking.tour_departure || booking.tour_departure,
        }
        : {
          ...booking,
          ...(cancellationCount === undefined ? {} : {
            customer_cancellation_count: cancellationCount,
            customer_cancellation_limit: cancellationLimit,
          }),
        }
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

  const chatUserId = token && user?.id ? user.id : null;
  const chatFeatureEnabled = String(import.meta.env.VITE_ENABLE_CHAT || '1') === '1';
  const canRenderChat = chatFeatureEnabled && (!token || chatUserId);
  const pageParams = new URLSearchParams(location.search);
  const isSupportPage =
    route === "/customer/support" ||
    (route === "/customer/profile" && pageParams.get("view") === "support");

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
      loading={homeLoading || tourLoading}
      tourLoadError={homeLoadError || tourLoadError}
      onFavorite={toggleFavorite}
    />
  );

  if (matchTourDetail) {
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
  } else if (route === "/faqs") {
    content = <FaqPage />;
  } else if (route.startsWith("/policies")) {
    content = <PolicyPage />;
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
        setProfile={setProfile}
        summary={summary}
        bookings={bookings}
        bookingsLoading={!bookingsLoaded}
        favoriteTours={favoriteTours}
        favoritesLoading={!favoritesLoaded || tourLoading}
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
      <Suspense fallback={<main className="vg-container customer-content-loading" role="status" aria-live="polite">
        <div className="customer-content-loading__heading"><i /><i /></div>
        <div className="customer-content-loading__grid"><i /><i /><i /></div>
        <span>Đang tải nội dung hành trình...</span>
      </main>}>
        {content}
      </Suspense>
      <Footer />
      {showScrollTop ? (
        <button
          type="button"
          className="vg-scroll-top"
          aria-label="Lên đầu trang"
          title="Lên đầu trang"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ↑
        </button>
      ) : null}
      {canRenderChat ? (
        <Suspense fallback={null}>
          <ChatBox
            key={chatUserId ? `user-${chatUserId}` : "guest"}
            userId={chatUserId}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

export default CustomerPage;
