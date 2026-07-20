import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import ChatBox, { clearChatHistory } from "../../components/customer/ChatBox";
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
import { mediaUrl } from "../../utils/mediaUrl";

const fallbackProfile = {
  full_name: "Khách hàng ViVuGo",
  email: "khachhang@vivugo.vn",
  phone: "Chưa cập nhật",
  avatar_url: "",
};

const domesticDestinationTerms = [
  "đà nẵng",
  "hội an",
  "phú quốc",
  "sa pa",
  "sapa",
  "hà nội",
  "hạ long",
  "nha trang",
  "đà lạt",
  "mũi né",
  "huế",
  "quảng ninh",
  "việt nam",
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getAvailableSlots(departure) {
  if (!departure) return 0;

  if (
    departure.available_slots !== undefined &&
    departure.available_slots !== null
  ) {
    return Math.max(0, toNumber(departure.available_slots));
  }

  return Math.max(
    0,
    toNumber(departure.total_slots) - toNumber(departure.booked_slots),
  );
}

function getNextDeparture(tour) {
  const departures = Array.isArray(tour.departures) ? tour.departures : [];

  const availableDepartures = departures
    .filter((departure) => {
      const isOpen = !departure.status || departure.status === "open";

      return isOpen && getAvailableSlots(departure) > 0;
    })
    .sort((a, b) => {
      const dateA = new Date(a.departure_date || 0).getTime();
      const dateB = new Date(b.departure_date || 0).getTime();

      return dateA - dateB;
    });

  return availableDepartures[0] || departures[0] || null;
}

function getTourImage(tour, fallbackImage = "") {
  const itineraryImage = Array.isArray(tour.itineraries)
    ? tour.itineraries
      .flatMap((itinerary) =>
        Array.isArray(itinerary.images) ? itinerary.images : [],
      )
      .find(Boolean)
    : null;

  const imagePath =
    tour.thumbnail_url ||
    tour.image ||
    tour.thumbnail?.image_url ||
    tour.thumbnail?.url ||
    itineraryImage?.image_url ||
    itineraryImage?.url ||
    fallbackImage;

  return mediaUrl(imagePath);
}

function isDomesticTour(tour) {
  const destinations = Array.isArray(tour.destinations)
    ? tour.destinations
    : [];

  const countries = [
    tour.destinationInfo?.country,
    tour.destination_info?.country,
    ...destinations.map((destination) => destination?.country),
  ]
    .filter(Boolean)
    .map((country) => String(country).trim().toLowerCase());

  const destinationText = [
    typeof tour.destination === "string" ? tour.destination : "",
    tour.destinationInfo?.name,
    tour.destination_info?.name,
    ...destinations.map((destination) => destination?.name),
    tour.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchesLegacyTerms = domesticDestinationTerms.some((term) =>
    destinationText.includes(term),
  );

  return (
    countries.includes("việt nam") ||
    countries.includes("viet nam") ||
    matchesLegacyTerms
  );
}

function normalizeTour(tour) {
  const nextDeparture = getNextDeparture(tour);

  const destinations = Array.isArray(tour.destinations)
    ? tour.destinations
    : [];

  const rawDestination =
    tour.destination_info ||
    tour.destinationInfo ||
    (typeof tour.destination === "object" ? tour.destination : null) ||
    destinations[0] ||
    null;

  const destinationNames = destinations
    .map((destination) => destination?.name)
    .filter(Boolean);

  const categoryName =
    tour.category_name ||
    (typeof tour.category === "string" ? tour.category : null) ||
    tour.category_info?.name ||
    tour.category?.name ||
    "Chưa phân loại";

  const destinationName =
    tour.destination_name ||
    (typeof tour.destination === "string" ? tour.destination : null) ||
    (destinationNames.length ? destinationNames.join(" - ") : null) ||
    rawDestination?.name ||
    "Chưa cập nhật";

  const basePrice = toNumber(
    nextDeparture?.base_price ??
    tour.base_price ??
    tour.price?.base,
    0,
  );

  const discountValue =
    nextDeparture?.discount_price ?? tour.discount_price ?? tour.price?.discount ?? null;

  const discountPrice =
    discountValue !== null && discountValue !== undefined
      ? toNumber(discountValue)
      : null;

  const maxSlots = nextDeparture
    ? toNumber(nextDeparture.total_slots)
    : toNumber(tour.max_slots ?? tour.slots?.max);

  const availableSlots = nextDeparture
    ? getAvailableSlots(nextDeparture)
    : toNumber(tour.available_slots ?? tour.slots?.available);

  const duration =
    tour.duration ||
    (tour.duration_days
      ? `${tour.duration_days} ngày ${tour.duration_nights ?? 0} đêm`
      : "Đang cập nhật");

  return {
    ...tour,

    id: tour.id,
    title: tour.title || "Tour chưa có tên",
    slug: tour.slug || String(tour.id),
    summary: tour.summary || tour.description || "",
    image: getTourImage(tour),

    category: categoryName,
    travelStyle: tour.travel_style || tour.travelStyle,
    destination: destinationName,
    duration,

    price: {
      base: basePrice,
      discount: discountPrice,
    },

    slots: {
      max: maxSlots,
      available: availableSlots,
    },

    rating: {
      average: toNumber(
        tour.average_rating ?? tour.rating?.average,
        0,
      ),
      count: toNumber(
        tour.review_count ?? tour.rating?.count,
        0,
      ),
    },

    nextDeparture: nextDeparture
      ? {
        id: nextDeparture.id,
        departure_date: nextDeparture.departure_date,
        return_date: nextDeparture.return_date,
        price: toNumber(nextDeparture.price),
        base_price: toNumber(nextDeparture.base_price),
        discount_price:
          nextDeparture.discount_price !== null && nextDeparture.discount_price !== undefined
            ? toNumber(nextDeparture.discount_price)
            : null,
        total_slots: toNumber(nextDeparture.total_slots),
        booked_slots: toNumber(nextDeparture.booked_slots),
        available_slots: getAvailableSlots(nextDeparture),
        status: nextDeparture.status,
      }
      : null,

    nextDepartureDate:
      tour.next_departure_date ??
      nextDeparture?.departure_date ??
      null,

    minDeparturePrice:
      tour.min_departure_price !== undefined &&
        tour.min_departure_price !== null
        ? toNumber(tour.min_departure_price)
        : null,

    destinations,

    destinationInfo: {
      id: rawDestination?.id ?? null,
      name: destinationName,
      slug: rawDestination?.slug ?? "",
      province_city: rawDestination?.province_city ?? "",
      country: rawDestination?.country ?? "",
      description: rawDestination?.description ?? "",
      thumbnail_url: rawDestination?.thumbnail_url ?? "",
      status: rawDestination?.status ?? "",
    },
  };
}

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

  const pendingPaymentCount = useMemo(() => bookings.filter((booking) => (
    booking.status === "pending"
    && booking.payment_status === "unpaid"
    && booking.payment?.payment_method === "vnpay"
    && booking.payment?.status === "pending"
    && new Date(booking.payment.expires_at).getTime() > currentTime
  )).length, [bookings, currentTime]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHomeContent() {
      try {
        const content = await fetchHomeContent();

        if (active) {
          setHomeContent(content);
          setHomeLoadError("");
        }
      } catch {
        if (active) {
          setHomeContent({});
          setHomeLoadError("Không thể tải nội dung trang chủ.");
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
  }, [location.search]);

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

    const timer = window.setInterval(loadReviewNotifications, 60000);

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
  async function logout() {
    try {
      await logoutApi();
    } catch {
      // Token có thể đã hết hạn.
    }

    clearSession();
    clearChatHistory(); // <-- thêm dòng này
    setUser(null);
    setFavorites(readStoredFavorites());
  }

  const favoriteTours = normalizedTours.filter((tour) =>
    favorites.includes(tour.id),
  );

  const route = location.pathname;
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
      favorites={favorites}
      homeContent={normalizedHomeContent}
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
        tours={normalizedTours}
        favorites={favorites}
        loadError={tourLoadError}
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
      <Header
        user={user}
        onLogout={logout}
        pendingCount={pendingPaymentCount}
        reviewNotifications={reviewNotifications}
        reviewNotificationCount={reviewNotifications.length}
      />
      {content}
      <Footer />
      <ChatBox />
    </div>
  );
}

export default CustomerPage;