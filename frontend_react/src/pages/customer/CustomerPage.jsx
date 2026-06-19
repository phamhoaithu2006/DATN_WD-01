<<<<<<< HEAD
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import ChatBox from "../../components/customer/ChatBox";
import Footer from "../../components/customer/Footer";
import Header from "../../components/customer/Header";
import { demoTours } from "../../data/customerDemoData";
=======
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  categoryLabels,
  demoDestinations,
  demoTours,
  quickFilters,
} from "../../data/customerDemoData";
>>>>>>> e49d8bbfe76bf1019d95fc6c2dd2aa909467d596
import {
  addWishlist,
  fetchBookings,
  fetchProfileSummary,
  fetchTours,
  fetchWishlist,
  removeWishlist,
} from "../../services/customerApi";
<<<<<<< HEAD
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
=======
import { readSession, saveSession } from "../../services/authStorage";
import BrandLogo from "../../components/BrandLogo";
import "../../styles/customer.css";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
>>>>>>> e49d8bbfe76bf1019d95fc6c2dd2aa909467d596

const emptyProfile = {
  full_name: "Minh Anh Nguyen",
  email: "minhanh@example.com",
  phone: "0901234567",
  address: "Hanoi, Vietnam",
};

<<<<<<< HEAD
=======
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

  return (
    <header className="vg-header">
      <div className="vg-container vg-navbar">
        <BrandLogo />
        <button
          className="vg-mobile-menu"
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Mở menu"
        >
          <Icon name="menu" />
        </button>
        <nav className={mobileOpen ? "vg-nav-links is-open" : "vg-nav-links"}>
          <NavLink to="/">Trang chủ</NavLink>
          <div className="vg-tour-menu">
            <NavLink to="/tours">
              Tour <span>⌄</span>
            </NavLink>
            <div className="vg-dropdown vg-tour-dropdown">
              <Link to="/tours">Tất cả tour</Link>
              <Link to="/tours?category=Biển đảo">Du lịch biển đảo</Link>
              <Link to="/tours?category=Phiêu lưu">Tour phiêu lưu</Link>
              <Link to="/tours?category=Văn hóa">Tour văn hóa</Link>
            </div>
          </div>
          <NavLink to="/destinations">Điểm đến</NavLink>
          <NavLink to="/deals">Ưu đãi</NavLink>
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
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <Link className="vg-login-link" to="/auth">
              <Icon name="user" /> Đăng nhập
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
    <article className="vg-tour-card">
      <div className="vg-tour-photo">
        <img src={tour.image} alt={tour.title} />
        <div className="vg-tour-badges">
          {tour.featured ? <span>Nổi bật</span> : null}
          {tour.discountLabel ? <strong>{tour.discountLabel}</strong> : null}
        </div>
        <button
          className={`heart-button ${isFavorite ? "is-active" : ""}`}
          type="button"
          onClick={() => onFavorite(tour)}
          aria-label="Thêm tour yêu thích"
        >
          <Icon name="heart" size={19} />
        </button>
        <span className="vg-place">
          <Icon name="map" size={15} /> {tour.destination}
        </span>
      </div>
      <div className="vg-tour-info">
        <div className="vg-tour-meta">
          <span>{tour.category}</span>
          <b>★ {tour.rating.average}</b>
          <small>({tour.rating.count.toLocaleString("en-US")})</small>
        </div>
        <h3>{tour.title}</h3>
        <p>{tour.summary}</p>
        <div className="vg-tour-facts">
          <span>
            <Icon name="clock" size={16} /> {tour.duration}
          </span>
          <span>
            <Icon name="users" size={16} /> Tối đa {tour.slots?.max || 12}
          </span>
        </div>
        <div className="vg-tour-footer">
          <div>
            <strong>{currency.format(discountPrice)}</strong>
            {tour.price.base > discountPrice ? (
              <del>{currency.format(tour.price.base)}</del>
            ) : null}
            <small>per person</small>
          </div>
          <button type="button">Xem chi tiết</button>
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
    <div className="vg-chat">
      {open ? (
        <section className="vg-chat-panel" aria-label="Trợ lý du lịch ViVuGo">
          <header>
            <div className="vg-ai-avatar">
              <Icon name="sparkle" />
            </div>
            <div>
              <strong>Trợ lý ViVuGo AI</strong>
              <span>
                <i /> Đang trực tuyến
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>
          <div className="vg-chat-content">
            <p className="vg-chat-date">Hôm nay</p>
            {messages.map((message, index) => (
              <div
                key={`${message.from}-${index}`}
                className={`vg-message ${message.from}`}
              >
                {message.text}
              </div>
            ))}
            {loading ? (
              <div className="vg-message ai vg-typing">
                <i />
                <i />
                <i />
              </div>
            ) : null}
          </div>
          {messages.length === 1 ? (
            <div className="vg-quick-prompts">
              {[
                "Gợi ý tour biển",
                "Tour dưới 10 triệu",
                "Đi đâu tháng này?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={(event) => sendMessage(event, prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
          <form onSubmit={sendMessage}>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
            />
            <button type="submit" aria-label="Gửi tin nhắn">
              <Icon name="send" />
            </button>
          </form>
          <small className="vg-chat-note">
            ViVuGo AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
          </small>
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
      <section className="vg-hero">
        <div className="vg-container vg-hero-content">
          <span className="vg-trust">★ Được hơn 50.000 du khách tin tưởng</span>
          <h1>
            Khám phá hành trình
            <br />
            <em>tuyệt vời tiếp theo</em>
          </h1>
          <p>
            Explore breathtaking destinations, book amazing tours, and create
            unforgettable memories with ViVuGo, your trusted travel companion.
          </p>
          <form className="vg-search-box" onSubmit={submitSearch}>
            <label>
              <span>
                <Icon name="map" size={18} /> Điểm đến
              </span>
              <input
                value={search.keyword}
                onChange={(event) =>
                  setSearch({ ...search, keyword: event.target.value })
                }
                placeholder="Where are you going?"
              />
            </label>
            <label>
              <span>
                <Icon name="calendar" size={18} /> Ngày khởi hành
              </span>
              <input
                type="date"
                value={search.start_date}
                onChange={(event) =>
                  setSearch({ ...search, start_date: event.target.value })
                }
              />
            </label>
            <label>
              <span>
                <Icon name="users" size={18} /> Số khách
              </span>
              <input
                type="number"
                min="1"
                value={search.guests}
                onChange={(event) =>
                  setSearch({ ...search, guests: event.target.value })
                }
              />
            </label>
            <button type="submit">
              <Icon name="search" /> Tìm kiếm
            </button>
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

      <section className="vg-section vg-container">
        <div className="vg-section-heading">
          <div>
            <span>HÀNH TRÌNH NỔI BẬT</span>
            <h2>Tour được yêu thích nhất</h2>
            <p>
              Những hành trình được tuyển chọn dành riêng cho kỳ nghỉ của bạn.
            </p>
          </div>
          <Link to="/tours">Xem tất cả tour →</Link>
        </div>
        <div className="vg-tour-grid">
          {tours.slice(0, 3).map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              favorite={favorites.includes(tour.id)}
              onFavorite={onFavorite}
            />
          ))}
        </div>
      </section>

      <section className="vg-destination-section">
        <div className="vg-container">
          <div className="vg-centered-heading">
            <span>KHÁM PHÁ THẾ GIỚI</span>
            <h2>Điểm đến phổ biến</h2>
            <p>Đến những nơi được du khách ViVuGo yêu thích nhất.</p>
          </div>
          <div className="vg-destination-grid">
            {demoDestinations.map((destination) => (
              <Link
                to={`/tours?q=${encodeURIComponent(destination.name)}`}
                className="vg-destination-card"
                key={destination.name}
              >
                <img src={destination.image} alt={destination.name} />
                <div>
                  <h3>{destination.name}</h3>
                  <span>{destination.tours} tour đang mở</span>
                </div>
              </Link>
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
            min="5000000"
            max="70000000"
            step="1000000"
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
          />
          <div>
            <span>5 triệu</span>
            <strong>{money.format(maxPrice)}</strong>
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
                favorite={favorites.includes(tour.id)}
                onFavorite={onFavorite}
              />
            ))}
          </div>
        </div>
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
          <Link to="/tours">Khám phá tour</Link>
          <Link to="/auth">Tạo tài khoản</Link>
        </div>
      </section>
      <div className="vg-container vg-footer-grid">
        <div>
          <BrandLogo footer />
          <p>Người bạn đồng hành đáng tin cậy cho mọi chuyến đi đáng nhớ.</p>
        </div>
        <div>
          <h3>Khám phá</h3>
          <Link to="/tours">Tất cả tour</Link>
          <Link to="/destinations">Điểm đến</Link>
          <Link to="/deals">Ưu đãi</Link>
        </div>
        <div>
          <h3>Hỗ trợ</h3>
          <a>Trung tâm trợ giúp</a>
          <a>Chính sách hủy</a>
          <a>Điều khoản sử dụng</a>
        </div>
        <div>
          <h3>Liên hệ</h3>
          <p>123 Đường Du Lịch, Hà Nội</p>
          <p>1900 1234</p>
          <p>hello@vivugo.vn</p>
        </div>
      </div>
      <div className="vg-container vg-copyright">
        <span>© 2026 ViVuGo. Đã đăng ký bản quyền.</span>
        <span>Điều khoản · Quyền riêng tư · Cookie</span>
      </div>
    </footer>
  );
}

>>>>>>> e49d8bbfe76bf1019d95fc6c2dd2aa909467d596
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
<<<<<<< HEAD
    fetchTours()
      .then((items) => {
        if (active && items.length) {
          setTours(
            items.map((item, index) => ({
              ...demoTours[index % demoTours.length],
              ...item,
              image: item.image || demoTours[index % demoTours.length].image,
            })),
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
=======
>>>>>>> e49d8bbfe76bf1019d95fc6c2dd2aa909467d596

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

<<<<<<< HEAD
    let active = true;
    Promise.all([fetchWishlist(), fetchProfileSummary(), fetchBookings()])
      .then(([wishlist, account, accountBookings]) => {
        if (!active) return;
        setFavorites(wishlist.map((item) => item.id));
        setSummary(account || {});
        setBookings(accountBookings);
        setProfile((current) => ({ ...current, ...account }));
        setUser((current) => ({ ...current, ...account }));
      })
      .catch(() => {});
=======
    loadTours();

>>>>>>> e49d8bbfe76bf1019d95fc6c2dd2aa909467d596
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
<<<<<<< HEAD
      if (exists) await removeWishlist(tour.id);
      else await addWishlist(tour.id);
    } catch {}
  }

  async function logout() {
    try {
      await logoutApi();
    } catch {}
    clearSession();
=======
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
>>>>>>> e49d8bbfe76bf1019d95fc6c2dd2aa909467d596
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
    <div className="vg-app">
      <Header user={user} onLogout={logout} />
      {content}
      <Footer />
      <ChatBox />
    </div>
  );
}

export default CustomerPage;
