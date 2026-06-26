import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
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
  const destinationText = `${tour.destination || ""} ${tour.title || ""}`.toLowerCase();
  return domesticDestinationTerms.some((term) => destinationText.includes(term));
}

function normalizeTour(tour, index = 0) {
  const fallback = demoTours[index % demoTours.length];

  return {
    ...fallback,
    ...tour,
    image: tour.image || tour.thumbnail || fallback.image,
    category: tour.category || fallback.category,
    travelStyle:
      tour.travelStyle || tour.travel_style || fallback.travelStyle,
    destination: tour.destination || fallback.destination,
    price: {
      base: tour.price?.base || tour.base_price || fallback.price.base,
      discount:
        tour.price?.discount ||
        tour.discount_price ||
        fallback.price.discount,
    },
    slots: {
      max: tour.slots?.max || tour.max_slots || fallback.slots.max,
      available:
        tour.slots?.available ||
        tour.available_slots ||
        fallback.slots.available,
    },
    rating: {
      average:
        tour.rating?.average ||
        tour.average_rating ||
        fallback.rating.average,
      count:
        tour.rating?.count || tour.review_count || fallback.rating.count,
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
  const [tours, setTours] = useState(demoTours);
  const [favorites, setFavorites] = useState(readStoredFavorites);
  const [bookings, setBookings] = useState([]);
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

    async function loadTours() {
      const query = new URLSearchParams(location.search);
      const category = query.get("category");
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

        if (!active) return;
        if (items.length || hasFilters) {
          setTours(items.map(normalizeTour));
        } else {
          setTours(demoTours);
        }
      } catch {
        if (active) setTours(demoTours);
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
      onFavorite={toggleFavorite}
    />
  );

  if (route === "/tours" || route === "/deals" || route === "/customer/search")
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
      <Navigate to="/auth" replace />
    );
  else if (route === "/customer/profile/edit")
    content = user ? (
      <ProfileForm profile={profile} setProfile={setProfile} />
    ) : (
      <Navigate to="/auth" replace />
    );
  else if (route === "/customer/password")
    content = user ? (
      <ProfileForm profile={profile} setProfile={setProfile} password />
    ) : (
      <Navigate to="/auth" replace />
    );

  return (
    <div className="vg-app">
      <Header user={user} onLogout={logout} />
      {content}
      <Footer />
      <ChatBox />
    </div>
  );
}

export default CustomerPage;
