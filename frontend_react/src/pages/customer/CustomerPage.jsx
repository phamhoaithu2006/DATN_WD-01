import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { categoryApi } from "../../services/categoryApi";
import ChatBox from "../../components/customer/ChatBox";
import Footer from "../../components/customer/Footer";
import Header from "../../components/customer/Header";
import { demoTours } from "../../data/customerDemoData";
import {
  addWishlist,
  fetchBookings,
  fetchProfileSummary,
  fetchTours,
  fetchWishlist,
  filterTours,
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

function isDomesticTour(tour) {
  const country = String(
    tour.destinationInfo?.country ||
    tour.destination_info?.country ||
    tour.country ||
    "",
  ).trim().toLowerCase();
  const destinationText = `${tour.destination || ""} ${tour.title || ""}`.toLowerCase();
  const matchesLegacyTerms = domesticDestinationTerms.some((term) =>
    destinationText.includes(term),
  );

  return country === "việt nam" || country === "viet nam" || matchesLegacyTerms;
}

function normalizeTour(tour, index = 0) {
  const fallback = demoTours[index % demoTours.length];
  
  // Differentiate between mock/demo tour and live database tour
  const isLive = !!(tour.base_price !== undefined || tour.category_info || tour.destination_info || tour.max_slots !== undefined);

  if (!isLive) {
    return {
      ...fallback,
      ...tour,
      price: {
        base: tour.price?.base || fallback.price.base,
        discount: tour.price?.discount || fallback.price.discount,
      },
      slots: {
        max: tour.slots?.max || fallback.slots.max,
        available: tour.slots?.available || fallback.slots.available,
      },
      rating: {
        average: tour.rating?.average || fallback.rating.average,
        count: tour.rating?.count || fallback.rating.count,
      },
    };
  }

  const basePrice = Number(tour.base_price || tour.price?.base || 0);
  const discountPrice = tour.discount_price !== undefined && tour.discount_price !== null
    ? Number(tour.discount_price)
    : (tour.price?.discount !== undefined && tour.price?.discount !== null ? Number(tour.price?.discount) : null);

  const durationStr = tour.duration || (tour.duration_days 
    ? `${tour.duration_days} ngày ${tour.duration_nights} đêm` 
    : `${fallback.duration_days} ngày ${fallback.duration_nights} đêm`);

  const categoryName = tour.category_name || 
    (typeof tour.category === 'string' ? tour.category : null) || 
    tour.category_info?.name || 
    tour.category?.name || 
    fallback.category;

  const destName = tour.destination_name || 
    (typeof tour.destination === 'string' ? tour.destination : null) || 
    tour.destination_info?.name || 
    tour.destination?.name || 
    fallback.destination;

  return {
    id: tour.id,
    title: tour.title || fallback.title,
    slug: tour.slug || fallback.slug,
    summary: tour.summary || tour.description || fallback.summary,
    image: tour.thumbnail_url || tour.image || tour.thumbnail?.image_url || fallback.image,
    category: categoryName,
    travelStyle: tour.travel_style || tour.travelStyle || fallback.travelStyle,
    destination: destName,
    duration: durationStr,
    price: {
      base: basePrice,
      discount: discountPrice,
    },
    slots: {
      max: tour.max_slots || tour.slots?.max || 12,
      available: tour.available_slots || tour.slots?.available || 12,
    },
    rating: {
      average: tour.average_rating !== undefined && tour.average_rating !== null ? Number(tour.average_rating) : 0,
      count: tour.review_count || 0,
    },
    destinationInfo: tour.destination_info || tour.destinationInfo || {
      id: null,
      name: destName,
      slug: "",
      province_city: "",
      country: "",
      description: "",
      thumbnail_url: "",
      status: "",
    }
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
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({
    bookings_count: 0,
    wishlist_count: 0,
  });
  const [profile, setProfile] = useState(() => ({
    ...fallbackProfile,
    ...readSession(),
  }));
  const normalizedTours = useMemo(() => tours.map(normalizeTour), [tours]);
  const homeDomesticTours = useMemo(() => {
    const domestic = normalizedTours.filter(isDomesticTour).slice(0, 4);
    return domestic.length ? domestic : normalizedTours.slice(0, 4);
  }, [normalizedTours]);
  const homeInternationalTours = useMemo(() => {
    const international = normalizedTours
      .filter((tour) => !isDomesticTour(tour))
      .slice(0, 4);
    return international.length ? international : normalizedTours.slice(0, 4);
  }, [normalizedTours]);

  useEffect(() => {
    let active = true;
    async function loadCategories() {
      try {
        const res = await categoryApi.getAll();
        if (active && res.data?.status === 'success') {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadTours() {
      const query = new URLSearchParams(location.search);
      const category = query.get("category");
      const scope = query.get("scope");
      const searchParams = {
        keyword: query.get("q") || undefined,
        start_date: query.get("date") || undefined,
        guests: query.get("guests") || undefined,
      };
      const hasFilters = category || Object.values(searchParams).some(Boolean);

      try {
        const items = category
          ? await filterTours({ category })
          : await fetchTours(searchParams);
        const normalizedItems = items.map(normalizeTour);
        const scopedItems = scope === "domestic"
          ? normalizedItems.filter(isDomesticTour)
          : scope === "international"
            ? normalizedItems.filter((tour) => !isDomesticTour(tour))
            : normalizedItems;

        if (!active) return;
        if (scopedItems.length || hasFilters || scope) {
          setTours(scopedItems);
          setHasLiveTours(true);
        } else {
          setTours(normalizedItems);
          setHasLiveTours(true);
        }
      } catch {
        if (active) {
          setTours([]);
          setHasLiveTours(false);
        }
      }
    }

    loadTours();

    return () => {
      active = false;
    };
  }, [location.search]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let active = true;
    Promise.all([fetchWishlist(), fetchProfileSummary(), fetchBookings()])
      .then(([wishlist, account, accountBookings]) => {
        if (!active) return;
        setFavorites(
          wishlist
            .map((item) => item.tour_id || item.tour?.id || item.id)
            .filter(Boolean),
        );
        setSummary(account || {});
        setBookings(accountBookings);
        setProfile((current) => ({ ...current, ...(account || {}) }));
        setUser((current) => ({ ...current, ...(account || {}) }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);

  async function toggleFavorite(tour) {
    const exists = favorites.includes(tour.id);
    const next = exists
      ? favorites.filter((id) => id !== tour.id)
      : [...favorites, tour.id];
    setFavorites(next);
    localStorage.setItem("vivugo_favorites", JSON.stringify(next));
    if (!token) return;
    try {
      if (exists) await removeWishlist(tour.id);
      else await addWishlist(tour.id);
    } catch {
      // Giữ trạng thái cục bộ nếu API tạm thời không khả dụng.
    }
  }

  async function logout() {
    try {
      await logoutApi();
    } catch {
      /* Token có thể đã hết hạn. */
    }
    clearSession();
    setUser(null);
    setFavorites(readStoredFavorites());
  }

  const favoriteTours = tours.filter((tour) => favorites.includes(tour.id));
  const route = location.pathname;
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
      domesticTours={homeDomesticTours}
      internationalTours={homeInternationalTours}
      favorites={favorites}
      categories={categories}
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
  }
  else if (route === "/tours" || route === "/deals" || route === "/customer/search")
    content = (
      <ToursPage
        tours={tours}
        favorites={favorites}
        onFavorite={toggleFavorite}
      />
    );
  else if (route === "/destinations") content = <DestinationsPage />;
  else if (accountRoutes.includes(route))
    content = user ? (
      <ProfileDashboard
        route={route}
        profile={profile}
        summary={summary}
        bookings={bookings}
        favoriteTours={favoriteTours}
        onFavorite={toggleFavorite}
      />
    ) : (
      <Navigate to="/auth/login" replace />
    );
  else if (route === "/customer/profile/edit")
    content = user ? (
      <ProfileForm profile={profile} setProfile={setProfile} />
    ) : (
      <Navigate to="/auth/login" replace />
    );
  else if (route === "/customer/password")
    content = user ? (
      <ProfileForm profile={profile} setProfile={setProfile} password />
    ) : (
      <Navigate to="/auth/login" replace />
    );

  return (
    <div className={`vg-app ${location.pathname === "/" ? "is-home-page" : ""}`}>
      <Header user={user} onLogout={logout} />
      {content}
      <Footer />
      <ChatBox />
    </div>
  );
}

export default CustomerPage;
