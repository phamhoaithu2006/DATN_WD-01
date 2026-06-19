import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  categoryLabels,
  demoDestinations,
  demoTours,
  quickFilters,
} from "../../data/customerDemoData";
import {
  addWishlist,
  changePassword,
  fetchTours,
  fetchWishlist,
  filterTours,
  removeWishlist,
  updateProfile,
} from "../../services/customerApi";
import { readSession, saveSession } from "../../services/authStorage";
import BrandLogo from "../../components/BrandLogo";
import "../../styles/customer.css";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const emptyProfile = {
  full_name: "Minh Anh Nguyen",
  email: "minhanh@example.com",
  phone: "0901234567",
  address: "Hanoi, Vietnam",
};

function normalizeTour(tour, index = 0) {
  const fallback = demoTours[index % demoTours.length];

  return {
    ...fallback,
    ...tour,
    image: tour.image || tour.thumbnail || fallback.image,
    category: tour.category || fallback.category,
    travelStyle: tour.travelStyle || tour.travel_style || fallback.travelStyle,
    destination: tour.destination || fallback.destination,
    price: {
      base: tour.price?.base || tour.base_price || fallback.price.base,
      discount:
        tour.price?.discount || tour.discount_price || fallback.price.discount,
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
        tour.rating?.average || tour.average_rating || fallback.rating.average,
      count: tour.rating?.count || tour.review_count || fallback.rating.count,
    },
  };
}

function CategoryIcon({ type }) {
  if (type === "Flights") return <span aria-hidden="true">✈</span>;
  if (type === "Hotels") return <span aria-hidden="true">▣</span>;
  if (type === "Beach") return <span aria-hidden="true">☂</span>;
  return <span aria-hidden="true">△</span>;
}

function CustomerHeader({ user, onLogout }) {
  return (
    <header className="customer-header">
      <div className="customer-shell customer-nav">
        <BrandLogo />
        <nav className="customer-menu" aria-label="Customer navigation">
          <NavLink to="/">Home</NavLink>
          <div className="tour-menu-wrap">
            <NavLink to="/tours" className="tour-menu-trigger">
              Tours <span aria-hidden="true">⌄</span>
            </NavLink>
            <div className="tour-dropdown">
              <Link to="/tours">All Tours</Link>
              <Link to="/tours?category=Beach">Beach Tours</Link>
              <Link to="/tours?category=Adventure">Adventure Tours</Link>
              <Link to="/tours?category=Cultural">Cultural Tours</Link>
              <Link to="/tours?category=Cruises">Cruises</Link>
              <Link to="/tours?category=Luxury">Luxury Tours</Link>
            </div>
          </div>
          <NavLink to="/destinations">Destinations</NavLink>
          <NavLink to="/deals">Deals</NavLink>
        </nav>
        <div className="customer-actions">
          <NavLink
            className="icon-link"
            to="/customer/favorites"
            title="Favorites"
          >
            ♡
          </NavLink>
          {user ? (
            <div className="account-menu">
              <NavLink
                className="icon-link"
                to="/customer/profile"
                title="Account"
              >
                ♙
              </NavLink>
              <div className="account-dropdown">
                <Link to="/customer/profile">Personal Information</Link>
                <Link to="/customer/bookings">My Bookings</Link>
                <Link to="/customer/favorites">Favorite Tours</Link>
                <Link to="/customer/settings">Settings</Link>
                <button type="button" onClick={onLogout}>
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <Link className="login-pill" to="/auth">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function TourCard({ tour, isFavorite, onFavorite }) {
  const discountPrice = tour.price.discount || tour.price.base;

  return (
    <article className="tour-card">
      <div className="tour-image">
        <img src={tour.image} alt={tour.title} />
        <div className="tour-badges">
          {tour.featured ? <span>Featured</span> : null}
          {tour.discountLabel ? <strong>{tour.discountLabel}</strong> : null}
        </div>
        <button
          className={`heart-button ${isFavorite ? "is-active" : ""}`}
          type="button"
          onClick={() => onFavorite(tour)}
          aria-label="Save favorite tour"
        >
          ♡
        </button>
        <span className="place-chip">⌖ {tour.destination}</span>
      </div>
      <div className="tour-content">
        <div className="tour-meta">
          <span>{tour.category}</span>
          <b>★ {tour.rating.average}</b>
          <small>({tour.rating.count.toLocaleString("en-US")})</small>
        </div>
        <h3>{tour.title}</h3>
        <p>{tour.summary}</p>
        <div className="tour-facts">
          <span>◷ {tour.duration}</span>
          <span>♙ Max {tour.slots.max}</span>
        </div>
        <div className="tour-bottom">
          <div>
            <strong>{currency.format(discountPrice)}</strong>
            {tour.price.base > discountPrice ? (
              <del>{currency.format(tour.price.base)}</del>
            ) : null}
            <small>per person</small>
          </div>
          <button type="button">View Details</button>
        </div>
      </div>
    </article>
  );
}

function ChatBox() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Hi, I am your ViVuGo assistant. Which destination or travel style are you looking for?",
    },
  ]);
  const [text, setText] = useState("");

  function sendMessage(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;

    setMessages((current) => [
      ...current,
      { from: "user", text: value },
      {
        from: "ai",
        text: "Great. Try Flights, Hotels, Beach, or Adventure to load matching tours automatically.",
      },
    ]);
    setText("");
  }

  return (
    <div className="chat-widget">
      {open ? (
        <section className="chat-panel" aria-label="AI chat">
          <header>
            <div>
              <strong>ViVuGo AI Assistant</strong>
              <span>Ready to help</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <p key={`${message.from}-${index}`} className={message.from}>
                {message.text}
              </p>
            ))}
          </div>
          <form onSubmit={sendMessage}>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Ask about a tour..."
            />
            <button type="submit">Send</button>
          </form>
        </section>
      ) : null}
      <button
        className="chat-fab"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        ◌
      </button>
    </div>
  );
}

function HomePage({ tours, favorites, onFavorite }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState({
    keyword: "",
    start_date: "",
    guests: 2,
  });
  const featuredTours = tours.slice(0, 3);

  function submitSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.keyword) params.set("q", search.keyword);
    if (search.start_date) params.set("date", search.start_date);
    if (search.guests) params.set("guests", search.guests);
    navigate(`/tours?${params.toString()}`);
  }

  function goToQuickFilter(value) {
    const key =
      value === "Beach" || value === "Adventure" ? "category" : "style";
    navigate(`/tours?${key}=${encodeURIComponent(value)}`);
  }

  return (
    <>
      <section className="home-hero">
        <div className="customer-shell hero-inner">
          <p className="trust-pill">★ Trusted by 50,000+ travelers</p>
          <h1>
            Discover Your Next <span>Adventure</span>
          </h1>
          <p>
            Explore breathtaking destinations, book amazing tours, and create
            unforgettable memories with ViVuGo, your trusted travel companion.
          </p>
          <form className="search-panel" onSubmit={submitSearch}>
            <label>
              <span>Destination</span>
              <input
                value={search.keyword}
                onChange={(event) =>
                  setSearch({ ...search, keyword: event.target.value })
                }
                placeholder="Where are you going?"
              />
            </label>
            <label>
              <span>Travel Date</span>
              <input
                type="date"
                value={search.start_date}
                onChange={(event) =>
                  setSearch({ ...search, start_date: event.target.value })
                }
              />
            </label>
            <label>
              <span>Guests</span>
              <input
                type="number"
                min="1"
                value={search.guests}
                onChange={(event) =>
                  setSearch({ ...search, guests: event.target.value })
                }
              />
            </label>
            <button type="submit">⌕ Search</button>
          </form>
          <div className="travel-tags" aria-label="Quick tour filters">
            {quickFilters.map((filter) => (
              <button
                type="button"
                key={filter.value}
                onClick={() => goToQuickFilter(filter.value)}
              >
                <CategoryIcon type={filter.value} />
                {filter.label}
              </button>
            ))}
          </div>
          <div className="hero-stats">
            <strong>
              50K+<span>Happy Travelers</span>
            </strong>
            <strong>
              200+<span>Tour Packages</span>
            </strong>
            <strong>
              50+<span>Destinations</span>
            </strong>
            <strong>
              4.9<span>Average Rating</span>
            </strong>
          </div>
        </div>
      </section>

      <section className="customer-section customer-shell">
        <div className="section-heading">
          <div>
            <h2>Featured Tours</h2>
            <p>Hand-picked destinations for your next adventure</p>
          </div>
          <Link className="outline-link" to="/tours">
            View All Tours →
          </Link>
        </div>
        <div className="tour-grid">
          {featuredTours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              isFavorite={favorites.includes(tour.id)}
              onFavorite={onFavorite}
            />
          ))}
        </div>
      </section>

      <section className="destinations-band">
        <div className="customer-shell">
          <div className="center-heading">
            <h2>Popular Destinations</h2>
            <p>Explore our most loved travel destinations around the world</p>
          </div>
          <div className="destination-grid">
            {demoDestinations.map((destination) => (
              <article className="destination-tile" key={destination.name}>
                <img src={destination.image} alt={destination.name} />
                <div>
                  <h3>{destination.name}</h3>
                  <span>{destination.tours} tours available</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="why-band">
        <div className="customer-shell why-grid">
          {[
            "Best Price Guarantee",
            "24/7 Support",
            "Flexible Payment",
            "Verified Tours",
          ].map((item) => (
            <article key={item}>
              <span>◎</span>
              <h3>{item}</h3>
              <p>Clear, safe, and convenient service for every traveler.</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ToursPage({ tours, favorites, onFavorite }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [query, setQuery] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "All");
  const [travelStyle, setTravelStyle] = useState(params.get("style") || "All");
  const [maxPrice, setMaxPrice] = useState(2500);
  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("recommended");

  useEffect(() => {
    const nextParams = new URLSearchParams(location.search);
    setQuery(nextParams.get("q") || "");
    setCategory(nextParams.get("category") || "All");
    setTravelStyle(nextParams.get("style") || "All");
  }, [location.search]);

  const visibleTours = useMemo(() => {
    const result = tours.filter((tour) => {
      const searchable = `${tour.title} ${tour.destination} ${tour.category} ${tour.travelStyle}`;
      const matchesQuery = searchable
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesCategory = category === "All" || tour.category === category;
      const matchesStyle =
        travelStyle === "All" || tour.travelStyle === travelStyle;
      const matchesPrice = (tour.price.discount || tour.price.base) <= maxPrice;

      return matchesQuery && matchesCategory && matchesStyle && matchesPrice;
    });

    if (sort === "price") {
      return [...result].sort(
        (a, b) =>
          (a.price.discount || a.price.base) -
          (b.price.discount || b.price.base),
      );
    }

    return result;
  }, [category, maxPrice, query, sort, tours, travelStyle]);

  return (
    <>
      <section className="tours-hero">
        <div className="customer-shell">
          <h1>Explore Tours</h1>
          <p>Discover amazing destinations and experiences</p>
          <div className="tour-toolbar">
            <label>
              <span>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tours, destinations..."
              />
            </label>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recommended">Recommended</option>
              <option value="price">Lowest Price</option>
            </select>
            <div className="view-toggle">
              <button
                className={view === "grid" ? "active" : ""}
                type="button"
                onClick={() => setView("grid")}
              >
                ▦
              </button>
              <button
                className={view === "list" ? "active" : ""}
                type="button"
                onClick={() => setView("list")}
              >
                ☷
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="customer-shell tours-layout">
        <aside className="filter-panel">
          <h2>Filters</h2>
          <h3>Categories</h3>
          <div className="filter-chips">
            {categoryLabels.map((label) => (
              <button
                className={category === label ? "active" : ""}
                key={label}
                type="button"
                onClick={() => setCategory(label)}
              >
                {label}
              </button>
            ))}
          </div>
          <h3>Travel Style</h3>
          <div className="filter-chips">
            {["All", ...quickFilters.map((filter) => filter.value)].map(
              (label) => (
                <button
                  className={travelStyle === label ? "active" : ""}
                  key={label}
                  type="button"
                  onClick={() => setTravelStyle(label)}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          <h3>Price Range</h3>
          <input
            type="range"
            min="500"
            max="2500"
            step="100"
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
          />
          <div className="range-row">
            <span>$500</span>
            <span>{currency.format(maxPrice)}</span>
          </div>
          <h3>Duration</h3>
          {["1-3 days", "4-6 days", "7+ days"].map((item) => (
            <label className="check-row" key={item}>
              <input type="checkbox" />
              <span>{item}</span>
            </label>
          ))}
          <h3>Rating</h3>
          {["4.5+ stars", "4+ stars", "3.5+ stars"].map((item) => (
            <label className="check-row" key={item}>
              <input type="checkbox" />
              <span>★ {item}</span>
            </label>
          ))}
        </aside>
        <main>
          <h2 className="result-count">{visibleTours.length} tours found</h2>
          <div className={view === "grid" ? "tour-grid" : "tour-list"}>
            {visibleTours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                isFavorite={favorites.includes(tour.id)}
                onFavorite={onFavorite}
              />
            ))}
          </div>
        </main>
      </section>
    </>
  );
}

function ProfilePage({ profile, setProfile, mode }) {
  const [form, setForm] = useState(profile);
  const [notice, setNotice] = useState("");

  async function submitProfile(event) {
    event.preventDefault();
    setProfile(form);
    saveSession({ ...readSession(), ...form, name: form.full_name });
    setNotice("Your profile has been updated.");

    try {
      await updateProfile({ full_name: form.full_name, phone: form.phone });
    } catch {
      setNotice(
        "Saved locally. The API will sync when the backend and token are available.",
      );
    }
  }

  if (mode === "password") {
    return <PasswordPage />;
  }

  return (
    <section className="customer-shell account-page">
      <AccountSidebar />
      <main className="account-content">
        <h1>
          {mode === "edit"
            ? "Edit Customer Information"
            : "Customer Information"}
        </h1>
        <form className="profile-form" onSubmit={submitProfile}>
          <label>
            <span>Full Name</span>
            <input
              readOnly={mode !== "edit"}
              value={form.full_name}
              onChange={(event) =>
                setForm({ ...form, full_name: event.target.value })
              }
            />
          </label>
          <label>
            <span>Email</span>
            <input readOnly value={form.email} />
          </label>
          <label>
            <span>Phone</span>
            <input
              readOnly={mode !== "edit"}
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
          </label>
          <label>
            <span>Address</span>
            <input
              readOnly={mode !== "edit"}
              value={form.address}
              onChange={(event) =>
                setForm({ ...form, address: event.target.value })
              }
            />
          </label>
          {mode === "edit" ? (
            <button type="submit">Save Changes</button>
          ) : (
            <Link to="/customer/profile/edit">Edit</Link>
          )}
          {notice ? <p className="form-notice">{notice}</p> : null}
        </form>
      </main>
    </section>
  );
}

function PasswordPage() {
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  async function submitPassword(event) {
    event.preventDefault();
    try {
      await changePassword(form);
      setNotice("Password changed successfully.");
    } catch {
      setNotice(
        "Could not sync with backend. Please check login/token when the API is running.",
      );
    }
  }

  return (
    <section className="customer-shell account-page">
      <AccountSidebar />
      <main className="account-content">
        <h1>Change Password</h1>
        <form className="profile-form" onSubmit={submitPassword}>
          <label>
            <span>Current Password</span>
            <input
              type="password"
              value={form.current_password}
              onChange={(event) =>
                setForm({ ...form, current_password: event.target.value })
              }
            />
          </label>
          <label>
            <span>New Password</span>
            <input
              type="password"
              value={form.new_password}
              onChange={(event) =>
                setForm({ ...form, new_password: event.target.value })
              }
            />
          </label>
          <label>
            <span>Confirm New Password</span>
            <input
              type="password"
              value={form.new_password_confirmation}
              onChange={(event) =>
                setForm({
                  ...form,
                  new_password_confirmation: event.target.value,
                })
              }
            />
          </label>
          <button type="submit">Update Password</button>
          {notice ? <p className="form-notice">{notice}</p> : null}
        </form>
      </main>
    </section>
  );
}

function AccountSidebar() {
  return (
    <aside className="account-sidebar">
      <NavLink to="/customer/profile">Personal Information</NavLink>
      <NavLink to="/customer/profile/edit">Edit Information</NavLink>
      <NavLink to="/customer/password">Change Password</NavLink>
      <NavLink to="/customer/favorites">Favorite Tours</NavLink>
      <NavLink to="/customer/search">Search</NavLink>
      <NavLink to="/customer/settings">Settings</NavLink>
    </aside>
  );
}

function SimpleAccountPage({ title, children }) {
  return (
    <section className="customer-shell account-page">
      <AccountSidebar />
      <main className="account-content">
        <h1>{title}</h1>
        {children}
      </main>
    </section>
  );
}

function Footer() {
  return (
    <footer className="customer-footer">
      <div className="cta-band">
        <h2>Ready to Start Your Adventure?</h2>
        <p>
          Join thousands of happy travelers and discover the world with ViVuGo.
        </p>
        <div>
          <Link to="/tours">Explore Tours</Link>
          <Link to="/auth">Create Account</Link>
        </div>
      </div>
      <div className="customer-shell footer-grid">
        <div>
          <BrandLogo asLink={false} />
          <p>Your trusted travel companion for unforgettable trips.</p>
        </div>
        <div>
          <h3>Quick Links</h3>
          <Link to="/tours">All Tours</Link>
          <Link to="/tours?category=Beach">Beach Tours</Link>
          <Link to="/tours?category=Adventure">Adventure Tours</Link>
          <Link to="/tours?category=Luxury">Luxury Tours</Link>
        </div>
        <div>
          <h3>Support</h3>
          <a>Help Center</a>
          <a>Cancellation Policy</a>
          <a>Travel Insurance</a>
          <a>Terms & Conditions</a>
        </div>
        <div>
          <h3>Contact Us</h3>
          <p>123 Travel Street, Adventure City</p>
          <p>+84 123 456 789</p>
          <p>hello@vivugo.com</p>
          <form className="subscribe-form">
            <input placeholder="Enter your email" />
            <button type="button">Subscribe</button>
          </form>
        </div>
      </div>
      <div className="customer-shell footer-bottom">
        <span>© 2026 ViVuGo. All rights reserved.</span>
        <span>Terms · Privacy · Cookies</span>
      </div>
    </footer>
  );
}

function CustomerPage() {
  const [tours, setTours] = useState(demoTours);
  const [favorites, setFavorites] = useState([]);
  const [profile, setProfile] = useState(() => {
    const session = readSession();

    return {
      ...emptyProfile,
      full_name: session?.full_name || session?.name || emptyProfile.full_name,
      email: session?.email || emptyProfile.email,
      phone: session?.phone || emptyProfile.phone,
    };
  });
  const [user, setUser] = useState(readSession);
  const location = useLocation();
  const authToken = user?.token || user?.accessToken;

  useEffect(() => {
    let active = true;

    async function loadTours() {
      try {
        const query = new URLSearchParams(location.search);
        const apiTours = query.get("category")
          ? await filterTours({ category: query.get("category") })
          : await fetchTours({
              keyword: query.get("q") || undefined,
              start_date: query.get("date") || undefined,
              guests: query.get("guests") || undefined,
            });

        if (active && apiTours.length > 0) {
          setTours(apiTours.map(normalizeTour));
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
    let active = true;

    async function loadWishlist() {
      const stored = JSON.parse(
        localStorage.getItem("vivugo_favorites") || "[]",
      );

      if (!authToken) {
        if (active) setFavorites(stored);
        return;
      }

      try {
        const items = await fetchWishlist();
        if (active) {
          setFavorites(items.map((item) => item.id));
        }
      } catch {
        if (active) setFavorites(stored);
      }
    }

    loadWishlist();

    return () => {
      active = false;
    };
  }, [authToken]);

  async function toggleFavorite(tour) {
    const exists = favorites.includes(tour.id);
    const next = exists
      ? favorites.filter((id) => id !== tour.id)
      : [...favorites, tour.id];
    setFavorites(next);
    localStorage.setItem("vivugo_favorites", JSON.stringify(next));

    if (!authToken) {
      return;
    }

    try {
      if (exists) {
        await removeWishlist(tour.id);
      } else {
        await addWishlist(tour.id);
      }
    } catch {
      localStorage.setItem("vivugo_favorites", JSON.stringify(next));
    }
  }

  function logout() {
    localStorage.removeItem("skytrail_session");
    setUser(null);
    setFavorites(JSON.parse(localStorage.getItem("vivugo_favorites") || "[]"));
  }

  const favoriteTours = tours.filter((tour) => favorites.includes(tour.id));
  const route = location.pathname;
  let content = (
    <HomePage tours={tours} favorites={favorites} onFavorite={toggleFavorite} />
  );

  if (
    route.startsWith("/tours") ||
    route === "/customer/search" ||
    route === "/deals"
  ) {
    content = (
      <ToursPage
        tours={tours}
        favorites={favorites}
        onFavorite={toggleFavorite}
      />
    );
  } else if (route === "/destinations") {
    content = (
      <section className="destinations-band destinations-page">
        <div className="customer-shell">
          <div className="center-heading">
            <h1>Destinations</h1>
            <p>Choose the place you want to explore next</p>
          </div>
          <div className="destination-grid">
            {demoDestinations.map((destination) => (
              <article className="destination-tile" key={destination.name}>
                <img src={destination.image} alt={destination.name} />
                <div>
                  <h3>{destination.name}</h3>
                  <span>{destination.tours} tours available</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  } else if (route === "/customer/profile") {
    content = (
      <ProfilePage profile={profile} setProfile={setProfile} mode="view" />
    );
  } else if (route === "/customer/profile/edit") {
    content = (
      <ProfilePage profile={profile} setProfile={setProfile} mode="edit" />
    );
  } else if (route === "/customer/password") {
    content = (
      <ProfilePage profile={profile} setProfile={setProfile} mode="password" />
    );
  } else if (route === "/customer/favorites") {
    content = (
      <SimpleAccountPage title="Favorite Tours">
        {favoriteTours.length > 0 ? (
          <div className="tour-grid compact">
            {favoriteTours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                isFavorite
                onFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <p className="empty-state">
            You have not saved any favorite tours yet.
          </p>
        )}
      </SimpleAccountPage>
    );
  } else if (route === "/customer/bookings") {
    content = (
      <SimpleAccountPage title="My Bookings">
        <div className="booking-list">
          <article>
            <strong>No bookings yet</strong>
            <p>Your booked tours will appear here.</p>
          </article>
        </div>
      </SimpleAccountPage>
    );
  } else if (route === "/customer/settings") {
    content = (
      <SimpleAccountPage title="Settings">
        <div className="settings-list">
          <label>
            <input type="checkbox" defaultChecked />
            Receive promotional emails
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            Save tour search history
          </label>
          <label>
            <input type="checkbox" />
            Prefer book-now-pay-later tours
          </label>
        </div>
      </SimpleAccountPage>
    );
  }

  return (
    <div className="customer-app">
      <CustomerHeader user={user} onLogout={logout} />
      {content}
      <Footer />
      <ChatBox />
    </div>
  );
}

export default CustomerPage;
