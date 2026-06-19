import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { demoDestinations, demoTours } from "../../data/customerDemoData";
import {
  addWishlist,
  askTravelAssistant,
  changePassword,
  fetchBookings,
  fetchProfileSummary,
  fetchTours,
  fetchWishlist,
  removeWishlist,
  updateProfile,
} from "../../services/customerApi";
import { logout as logoutApi } from "../../services/authApi";
import {
  clearSession,
  readSession,
  readToken,
  saveSession,
} from "../../services/authStorage";
import "../../styles/customer.css";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const fallbackProfile = {
  full_name: "Khách hàng ViVuGo",
  email: "khachhang@vivugo.vn",
  phone: "Chưa cập nhật",
  avatar_url: "",
};

const iconPaths = {
  user: (
    <>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  camera: (
    <>
      <path d="M4 7h3l2-2h6l2 2h3v12H4Z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  map: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  star: (
    <path d="m12 2.8 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9L6.4 20l1.1-6.2L3 9.4l6.2-.9Z" />
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z" />
      <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  headset: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M18 19c0 1-1 2-2 2h-3M4 14h3v5H5a1 1 0 0 1-1-1ZM20 14h-3v5h2a1 1 0 0 0 1-1Z" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 5h15a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V5a3 3 0 0 1 3-3h13" />
      <path d="M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" />
    </>
  ),
};

function Icon({ name, size = 20 }) {
  return (
    <svg
      className="vg-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

function BrandLogo({ footer = false }) {
  const logo = (
    <>
      <span className="vg-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img">
          <path d="M42.1 7.2c1.4 1.4 1 4-.8 5.7L31.1 23l4.7 15.2-3.8 3.8-7.8-12.3-7 7-1.4 6.2-3.1 3.1-2.4-9.7-9.7-2.4 3.1-3.1 6.2-1.4 7-7L4.6 14.6l3.8-3.8 15.2 4.7L33.8 5.4c1.8-1.8 4.9-1.7 8.3 1.8Z" />
        </svg>
      </span>
      <span className="vg-logo-name">
        ViVu<span>Go</span>
      </span>
    </>
  );

  return footer ? (
    <div className="vg-logo">{logo}</div>
  ) : (
    <Link className="vg-logo" to="/">
      {logo}
    </Link>
  );
}

function Header({ user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <div className="vg-nav-actions">
          <NavLink
            className="vg-icon-button"
            to={user ? "/customer/favorites" : "/auth"}
            aria-label="Danh sách yêu thích"
          >
            <Icon name="heart" />
          </NavLink>
          {user ? (
            <div className="vg-account-menu">
              <button
                className="vg-icon-button"
                type="button"
                aria-label="Tài khoản"
              >
                <Icon name="user" />
              </button>
              <div className="vg-dropdown vg-account-dropdown">
                <Link to="/customer/profile">
                  <Icon name="user" /> Hồ sơ của tôi
                </Link>
                <Link to="/customer/bookings">
                  <Icon name="globe" /> Chuyến đi của tôi
                </Link>
                <Link to="/customer/favorites">
                  <Icon name="heart" /> Tour yêu thích
                </Link>
                {user.role === "admin" ? (
                  <Link className="vg-admin-link" to="/admin">
                    <Icon name="settings" /> Trang quản trị
                  </Link>
                ) : null}
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

function TourCard({ tour, favorite, onFavorite }) {
  const salePrice = Number(tour.price?.discount || tour.price?.base || 0);
  const originalPrice = Number(tour.price?.base || salePrice);
  const vietnamPrice = salePrice < 100000 ? salePrice * 25000 : salePrice;
  const originalVietnamPrice =
    originalPrice < 100000 ? originalPrice * 25000 : originalPrice;

  return (
    <article className="vg-tour-card">
      <div className="vg-tour-photo">
        <img src={tour.image} alt={tour.title} />
        <div className="vg-tour-badges">
          {tour.featured ? <span>Nổi bật</span> : null}
          {tour.discountLabel ? <strong>{tour.discountLabel}</strong> : null}
        </div>
        <button
          className={favorite ? "vg-heart is-active" : "vg-heart"}
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
          <b>★ {tour.rating?.average || 4.8}</b>
          <small>({tour.rating?.count || 128})</small>
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
            <strong>{money.format(vietnamPrice)}</strong>
            {originalVietnamPrice > vietnamPrice ? (
              <del>{money.format(originalVietnamPrice)}</del>
            ) : null}
            <small>/ người</small>
          </div>
          <button type="button">Xem chi tiết</button>
        </div>
      </div>
    </article>
  );
}

function ChatBox() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Xin chào! Mình là trợ lý du lịch ViVuGo. Bạn muốn đi đâu, ngân sách bao nhiêu và dự định đi mấy ngày?",
    },
  ]);

  async function sendMessage(event, quickText = "") {
    event?.preventDefault();
    const message = (quickText || text).trim();
    if (!message || loading) return;

    setMessages((current) => [...current, { from: "user", text: message }]);
    setText("");
    setLoading(true);

    try {
      const response = await askTravelAssistant(message);
      setMessages((current) => [
        ...current,
        { from: "ai", text: response.message },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          from: "ai",
          text: "Mình gợi ý bạn xem các tour nổi bật hoặc cho mình biết điểm đến, thời gian và ngân sách để tư vấn chính xác hơn nhé.",
        },
      ]);
    } finally {
      setLoading(false);
    }
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
              aria-label="Đóng trò chuyện"
            >
              <Icon name="close" />
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
        className="vg-chat-fab"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mở trợ lý ViVuGo"
      >
        {open ? (
          <Icon name="close" />
        ) : (
          <>
            <Icon name="sparkle" size={25} />
          </>
        )}
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

  function submitSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.keyword) params.set("q", search.keyword);
    if (search.start_date) params.set("date", search.start_date);
    if (search.guests) params.set("guests", search.guests);
    navigate(`/tours?${params}`);
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
            Khám phá những điểm đến ngoạn mục, đặt tour dễ dàng và tạo nên những
            kỷ niệm không thể nào quên cùng ViVuGo.
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
                placeholder="Bạn muốn đi đâu?"
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
          <div className="vg-quick-categories">
            {["Vé máy bay", "Khách sạn", "Biển đảo", "Phiêu lưu"].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    navigate(`/tours?q=${encodeURIComponent(item)}`)
                  }
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <div className="vg-stats">
            <div>
              <b>50K+</b>
              <span>Du khách hài lòng</span>
            </div>
            <div>
              <b>200+</b>
              <span>Gói tour hấp dẫn</span>
            </div>
            <div>
              <b>50+</b>
              <span>Điểm đến</span>
            </div>
            <div>
              <b>4.9</b>
              <span>Điểm đánh giá</span>
            </div>
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

      <section className="vg-benefits">
        <div className="vg-container vg-benefit-grid">
          {[
            [
              "shield",
              "Giá tốt nhất",
              "Cam kết mức giá cạnh tranh và minh bạch.",
            ],
            [
              "headset",
              "Hỗ trợ 24/7",
              "Luôn sẵn sàng đồng hành trong mọi chuyến đi.",
            ],
            [
              "wallet",
              "Thanh toán linh hoạt",
              "Nhiều phương thức an toàn và tiện lợi.",
            ],
            [
              "star",
              "Tour đã xác thực",
              "Đối tác uy tín, chất lượng được kiểm duyệt.",
            ],
          ].map(([icon, title, description]) => (
            <article key={title}>
              <span>
                <Icon name={icon} size={26} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
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
  const [category, setCategory] = useState(params.get("category") || "Tất cả");
  const [maxPrice, setMaxPrice] = useState(70000000);

  const visibleTours = useMemo(
    () =>
      tours.filter((tour) => {
        const text =
          `${tour.title} ${tour.destination} ${tour.category}`.toLowerCase();
        const price = Number(tour.price?.discount || tour.price?.base || 0);
        const vietnamPrice = price < 100000 ? price * 25000 : price;
        return (
          text.includes(query.toLowerCase()) &&
          (category === "Tất cả" || tour.category === category) &&
          vietnamPrice <= maxPrice
        );
      }),
    [category, maxPrice, query, tours],
  );

  return (
    <main className="vg-listing-page">
      <section className="vg-listing-hero">
        <div className="vg-container">
          <span>KHÁM PHÁ CÙNG VIVUGO</span>
          <h1>Tìm tour phù hợp với bạn</h1>
          <p>
            Chọn hành trình, thời gian và ngân sách — phần còn lại để ViVuGo lo.
          </p>
          <label>
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tour hoặc điểm đến..."
            />
          </label>
        </div>
      </section>
      <section className="vg-container vg-listing-layout">
        <aside className="vg-filter">
          <h2>Bộ lọc</h2>
          <h3>Loại hình</h3>
          {[
            "Tất cả",
            "Biển đảo",
            "Phiêu lưu",
            "Văn hóa",
            "Nghỉ dưỡng",
            "Cao cấp",
          ].map((item) => (
            <button
              className={category === item ? "active" : ""}
              key={item}
              type="button"
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
          <h3>Ngân sách tối đa</h3>
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
        </aside>
        <div>
          <div className="vg-results">
            <h2>{visibleTours.length} tour phù hợp</h2>
            <select aria-label="Sắp xếp">
              <option>Đề xuất cho bạn</option>
              <option>Giá thấp đến cao</option>
              <option>Đánh giá cao nhất</option>
            </select>
          </div>
          <div className="vg-tour-grid">
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
    </main>
  );
}

function DestinationsPage() {
  return (
    <main className="vg-destinations-page">
      <div className="vg-container">
        <div className="vg-centered-heading">
          <span>ĐIỂM ĐẾN</span>
          <h1>Thế giới đang chờ bạn</h1>
          <p>Chọn một điểm đến và bắt đầu viết câu chuyện của riêng mình.</p>
        </div>
        <div className="vg-destination-grid vg-destination-large">
          {demoDestinations.map((destination) => (
            <Link
              to={`/tours?q=${destination.name}`}
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
    </main>
  );
}

function ProfileDashboard({
  route,
  profile,
  summary,
  bookings,
  favoriteTours,
  onFavorite,
}) {
  const active = route.includes("bookings")
    ? "bookings"
    : route.includes("favorites")
      ? "favorites"
      : route.includes("settings")
        ? "settings"
        : "profile";

  return (
    <main className="vg-profile-page">
      <section className="vg-profile-hero">
        <div className="vg-container vg-profile-user">
          <div className="vg-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} />
            ) : (
              <span>{profile.full_name?.charAt(0) || "V"}</span>
            )}
            <Link to="/customer/profile/edit">
              <Icon name="camera" size={17} />
            </Link>
          </div>
          <div>
            <h1>{profile.full_name}</h1>
            <p>{profile.email}</p>
            <div>
              <span>
                <Icon name="globe" size={18} /> {summary.bookings_count || 0}{" "}
                chuyến đã đặt
              </span>
              <span>
                <Icon name="heart" size={18} />{" "}
                {summary.wishlist_count || favoriteTours.length} tour đã lưu
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="vg-container vg-profile-content">
        <nav className="vg-profile-tabs">
          <NavLink
            className={active === "profile" ? "active" : ""}
            to="/customer/profile"
          >
            <Icon name="user" /> Hồ sơ
          </NavLink>
          <NavLink
            className={active === "bookings" ? "active" : ""}
            to="/customer/bookings"
          >
            <Icon name="calendar" /> Chuyến đi
          </NavLink>
          <NavLink
            className={active === "favorites" ? "active" : ""}
            to="/customer/favorites"
          >
            <Icon name="heart" /> Yêu thích
          </NavLink>
          <NavLink
            className={active === "settings" ? "active" : ""}
            to="/customer/settings"
          >
            <Icon name="settings" /> Cài đặt
          </NavLink>
        </nav>
        {active === "favorites" ? (
          favoriteTours.length ? (
            <div className="vg-tour-grid vg-profile-grid">
              {favoriteTours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  favorite
                  onFavorite={onFavorite}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="heart"
              title="Chưa có tour yêu thích"
              action="Khám phá tour"
            />
          )
        ) : null}
        {active === "bookings" ? (
          bookings.length ? (
            <div className="vg-bookings">
              {bookings.map((booking) => (
                <article key={booking.id}>
                  <div>
                    <span>Mã đặt chỗ: {booking.booking_code}</span>
                    <h3>{booking.tour?.title || "Tour ViVuGo"}</h3>
                    <p>
                      {booking.number_of_people} khách ·{" "}
                      {new Date(booking.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div>
                    <strong>
                      {money.format(Number(booking.total_amount))}
                    </strong>
                    <span>{booking.status}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="calendar"
              title="Bạn chưa có chuyến đi nào"
              action="Đặt tour ngay"
            />
          )
        ) : null}
        {active === "profile" ? (
          <div className="vg-profile-card">
            <div>
              <span>Họ và tên</span>
              <strong>{profile.full_name}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{profile.email}</strong>
            </div>
            <div>
              <span>Số điện thoại</span>
              <strong>{profile.phone || "Chưa cập nhật"}</strong>
            </div>
            <Link to="/customer/profile/edit">Chỉnh sửa hồ sơ →</Link>
          </div>
        ) : null}
        {active === "settings" ? (
          <div className="vg-settings-card">
            <h2>Tùy chọn tài khoản</h2>
            <label>
              <span>
                <strong>Nhận ưu đãi qua email</strong>
                <small>Cập nhật tour mới và chương trình khuyến mãi.</small>
              </span>
              <input type="checkbox" defaultChecked />
            </label>
            <label>
              <span>
                <strong>Lưu lịch sử tìm kiếm</strong>
                <small>Giúp ViVuGo đề xuất hành trình phù hợp hơn.</small>
              </span>
              <input type="checkbox" defaultChecked />
            </label>
            <Link to="/customer/password">Đổi mật khẩu →</Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function EmptyState({ icon, title, action }) {
  return (
    <div className="vg-empty">
      <Icon name={icon} size={36} />
      <h2>{title}</h2>
      <Link to="/tours">{action}</Link>
    </div>
  );
}

function ProfileForm({ profile, setProfile, password = false }) {
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(
    password
      ? {
          current_password: "",
          new_password: "",
          new_password_confirmation: "",
        }
      : profile,
  );

  async function submit(event) {
    event.preventDefault();
    try {
      if (password) await changePassword(form);
      else {
        await updateProfile({ full_name: form.full_name, phone: form.phone });
        setProfile(form);
        saveSession({ ...readSession(), ...form });
      }
      setNotice(
        password ? "Đổi mật khẩu thành công." : "Cập nhật hồ sơ thành công.",
      );
    } catch {
      setNotice("Không thể cập nhật. Vui lòng kiểm tra kết nối và thử lại.");
    }
  }

  return (
    <main className="vg-form-page">
      <form onSubmit={submit}>
        <Link to="/customer/profile">← Quay lại hồ sơ</Link>
        <h1>{password ? "Đổi mật khẩu" : "Chỉnh sửa hồ sơ"}</h1>
        {password ? (
          <>
            <label>
              Mật khẩu hiện tại
              <input
                type="password"
                value={form.current_password}
                onChange={(event) =>
                  setForm({ ...form, current_password: event.target.value })
                }
              />
            </label>
            <label>
              Mật khẩu mới
              <input
                type="password"
                value={form.new_password}
                onChange={(event) =>
                  setForm({ ...form, new_password: event.target.value })
                }
              />
            </label>
            <label>
              Nhập lại mật khẩu mới
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
          </>
        ) : (
          <>
            <label>
              Họ và tên
              <input
                value={form.full_name}
                onChange={(event) =>
                  setForm({ ...form, full_name: event.target.value })
                }
              />
            </label>
            <label>
              Email
              <input readOnly value={form.email} />
            </label>
            <label>
              Số điện thoại
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
            </label>
          </>
        )}
        <button type="submit">Lưu thay đổi</button>
        {notice ? <p>{notice}</p> : null}
      </form>
    </main>
  );
}

function Footer() {
  return (
    <footer className="vg-footer">
      <section className="vg-cta">
        <h2>Sẵn sàng cho hành trình mới?</h2>
        <p>Khám phá thế giới theo cách của bạn cùng ViVuGo.</p>
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

function CustomerPage() {
  const location = useLocation();
  const token = readToken();
  const [user, setUser] = useState(readSession);
  const [tours, setTours] = useState(demoTours);
  const [favorites, setFavorites] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({
    bookings_count: 0,
    wishlist_count: 0,
  });
  const [profile, setProfile] = useState(() => ({
    ...fallbackProfile,
    ...readSession(),
  }));

  useEffect(() => {
    let active = true;
    fetchTours()
      .then((items) => {
        if (active && items.length)
          setTours(
            items.map((item, index) => ({
              ...demoTours[index % demoTours.length],
              ...item,
              image: item.image || demoTours[index % demoTours.length].image,
            })),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setFavorites(
        JSON.parse(localStorage.getItem("vivugo_favorites") || "[]"),
      );
      return undefined;
    }
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
    }
  }

  async function logout() {
    try {
      await logoutApi();
    } catch {
    }
    clearSession();
    setUser(null);
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
    <HomePage tours={tours} favorites={favorites} onFavorite={toggleFavorite} />
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
