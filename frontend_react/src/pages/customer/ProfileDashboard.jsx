import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import BookingCountdown from "../../components/customer/BookingCountdown";
import GuideReviewModal from "../../components/customer/GuideReviewModal";
import { useLocale } from "../../contexts/LocaleContext";
import {
  cancelCustomerBooking,
  continueCustomerBookingPayment,
  fetchGuideReviewableBookings,
} from "../../services/customerApi";
import { mediaUrl } from "../../utils/mediaUrl";

function EmptyState({ icon, title, action }) {
  return (
    <div className="vg-empty">
      <Icon name={icon} size={36} />
      <h2>{title}</h2>
      <Link to="/tours">{action}</Link>
    </div>
  );
}

function CustomerAvatar({ profile }) {
  const [failed, setFailed] = useState(false);
  const avatarSrc = !failed ? mediaUrl(profile.avatar_url) : "";

  return (
    <div className={`vg-avatar ${avatarSrc ? "has-image" : ""}`}>
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={profile.full_name || "Ảnh đại diện"}
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{profile.full_name?.charAt(0)?.toUpperCase() || "V"}</span>
      )}
      <Link to="/customer/profile/edit" title="Chỉnh sửa hồ sơ">
        <Icon name="camera" size={17} />
      </Link>
    </div>
  );
}

function getVehicleIconName(title = "") {
  const t = title.toLowerCase();
  if (t.includes("thuyền") || t.includes("cruise") || t.includes("biển")) return "ship";
  if (t.includes("phú quốc") || t.includes("bay") || t.includes("quốc tế") || t.includes("thái lan") || t.includes("nhật") || t.includes("hàn")) return "plane";
  return "bus";
}

function BookingTicketModal({ booking, onClose, formatCurrency, formatDate }) {
  if (!booking) return null;

  const tourImage = booking.tour?.thumbnail_url || booking.tour?.image || booking.tour?.thumbnail?.image_url || "";
  const tourTitle = booking.tour?.title || "Tour ViVuGo";
  const departureDate = booking.tour_departure?.departure_date ? formatDate(booking.tour_departure.departure_date) : "Đang cập nhật";
  const returnDate = booking.tour_departure?.return_date ? formatDate(booking.tour_departure.return_date) : null;
  const meetingPoint = booking.tour_departure?.meeting_point || "Sẽ được thông báo trước ngày đi 24h";
  const categoryName = booking.tour?.category?.name || booking.tour?.category_name || "Tour du lịch";
  const destinationName = booking.tour?.destination?.name || booking.tour?.destination_name || "Việt Nam";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="vg-ticket-modal-overlay" onClick={onClose}>
      <div className="vg-ticket-modal" onClick={(e) => e.stopPropagation()}>
        <header className="vg-ticket-modal-header">
          <div className="vg-ticket-badge-title">
            <Icon name="sparkle" size={18} />
            <span>VÉ ĐIỆN TỬ VIVUGO • VIVUGO E-TICKET</span>
          </div>
          <button type="button" className="vg-ticket-modal-close" onClick={onClose} title="Đóng vé">
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="vg-ticket-card-stub">
          <div className="vg-ticket-main-section">
            <div className="vg-ticket-top-row">
              <div className="vg-ticket-tour-info">
                {tourImage && (
                  <img src={mediaUrl(tourImage)} alt={tourTitle} className="vg-ticket-tour-img" />
                )}
                <div>
                  <span className="vg-ticket-category">{categoryName} • {destinationName}</span>
                  <h2 className="vg-ticket-tour-title">{tourTitle}</h2>
                  <span className="vg-ticket-code-tag">Mã đơn hàng: <strong>{booking.booking_code}</strong></span>
                </div>
              </div>
            </div>

            <div className="vg-ticket-grid">
              <div className="vg-ticket-cell">
                <span className="vg-ticket-label">Ngày khởi hành</span>
                <strong className="vg-ticket-val">{departureDate}</strong>
              </div>
              {returnDate && (
                <div className="vg-ticket-cell">
                  <span className="vg-ticket-label">Ngày kết thúc dự kiến</span>
                  <strong className="vg-ticket-val">{returnDate}</strong>
                </div>
              )}
              <div className="vg-ticket-cell">
                <span className="vg-ticket-label">Hành khách</span>
                <strong className="vg-ticket-val">{booking.number_of_people} khách</strong>
              </div>
              <div className="vg-ticket-cell">
                <span className="vg-ticket-label">Tổng thanh toán</span>
                <strong className="vg-ticket-val is-price">{formatCurrency(Number(booking.total_amount))}</strong>
              </div>
            </div>

            <div className="vg-ticket-location-box">
              <Icon name="mapPin" size={18} />
              <div>
                <span>Điểm tập trung & Đón khách:</span>
                <strong>{meetingPoint}</strong>
              </div>
            </div>

            <div className="vg-ticket-passenger-box">
              <Icon name="user" size={16} />
              <div>
                <span>Người đặt vé: <strong>{booking.user?.full_name || booking.contact?.full_name || "Khách hàng ViVuGo"}</strong></span>
                <small>Email: {booking.user?.email || booking.contact?.email || "Chưa cập nhật"} | SĐT: {booking.user?.phone || booking.contact?.phone || "Chưa cập nhật"}</small>
              </div>
            </div>
          </div>

          <div className="vg-ticket-divider">
            <div className="vg-ticket-notch top"></div>
            <div className="vg-ticket-dashed-line"></div>
            <div className="vg-ticket-notch bottom"></div>
          </div>

          <div className="vg-ticket-side-stub">
            <div className="vg-ticket-qr-wrap">
              <svg className="vg-qr-svg" viewBox="0 0 100 100" width="120" height="120">
                <rect width="100" height="100" fill="#ffffff" />
                <rect x="5" y="5" width="28" height="28" fill="#0f172a" />
                <rect x="9" y="9" width="20" height="20" fill="#ffffff" />
                <rect x="13" y="13" width="12" height="12" fill="#0f172a" />

                <rect x="67" y="5" width="28" height="28" fill="#0f172a" />
                <rect x="71" y="9" width="20" height="20" fill="#ffffff" />
                <rect x="75" y="13" width="12" height="12" fill="#0f172a" />

                <rect x="5" y="67" width="28" height="28" fill="#0f172a" />
                <rect x="9" y="71" width="20" height="20" fill="#ffffff" />
                <rect x="13" y="75" width="12" height="12" fill="#0f172a" />

                <rect x="40" y="8" width="6" height="6" fill="#0f172a" />
                <rect x="50" y="14" width="10" height="6" fill="#0f172a" />
                <rect x="38" y="24" width="8" height="8" fill="#0f172a" />
                <rect x="52" y="32" width="6" height="12" fill="#0f172a" />
                <rect x="8" y="40" width="12" height="6" fill="#0f172a" />
                <rect x="25" y="44" width="12" height="12" fill="#0f172a" />
                <rect x="42" y="48" width="14" height="6" fill="#0f172a" />
                <rect x="65" y="42" width="12" height="8" fill="#0f172a" />
                <rect x="80" y="40" width="12" height="12" fill="#0f172a" />
                <rect x="42" y="65" width="10" height="10" fill="#0f172a" />
                <rect x="60" y="62" width="12" height="12" fill="#0f172a" />
                <rect x="76" y="65" width="16" height="6" fill="#0f172a" />
                <rect x="40" y="80" width="14" height="12" fill="#0f172a" />
                <rect x="62" y="80" width="12" height="12" fill="#0f172a" />
                <rect x="78" y="78" width="14" height="14" fill="#0f172a" />
              </svg>
              <span className="vg-ticket-qr-code">{booking.booking_code}</span>
              <span className="vg-ticket-qr-hint">Xác nhận trực tiếp với HDV</span>
            </div>

            <div className="vg-ticket-actions">
              <button type="button" className="vg-btn-print" onClick={handlePrint}>
                <Icon name="sparkle" size={15} /> In / Lưu vé
              </button>
              <button type="button" className="vg-btn-close-modal" onClick={onClose}>
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileDashboard({
  route,
  profile,
  summary,
  bookings,
  favoriteTours,
  onFavorite,
  onBookingUpdated,
}) {
  const { formatCurrency, formatDate } = useLocale();
  const active = route.includes("bookings")
    ? "bookings"
    : route.includes("favorites")
      ? "favorites"
      : route.includes("settings")
        ? "settings"
        : "profile";
  const bookingCount = summary.bookings_count || bookings.length || 0;
  const wishlistCount = summary.wishlist_count || favoriteTours.length || 0;
  const shortName = profile.full_name || "Khách hàng ViVuGo";
  const [now, setNow] = useState(() => Date.now());
  const [bookingActionId, setBookingActionId] = useState(null);
  const [bookingActionError, setBookingActionError] = useState("");

  // Booking filters & search state
  const [bookingFilter, setBookingFilter] = useState("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingSort, setBookingSort] = useState("newest");
  const [activeTicketBooking, setActiveTicketBooking] = useState(null);
  const [reviewableBookings, setReviewableBookings] = useState([]);
  const [reviewableBookingsLoading, setReviewableBookingsLoading] = useState(false);
  const [reviewableBookingsError, setReviewableBookingsError] = useState("");
  const [activeGuideReview, setActiveGuideReview] = useState(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (active !== "bookings") return undefined;

    let requestActive = true;

    Promise.resolve().then(() => {
      if (!requestActive) return;
      setReviewableBookingsLoading(true);
      setReviewableBookingsError("");
    });

    fetchGuideReviewableBookings({ per_page: 50 })
      .then((items) => {
        if (requestActive) setReviewableBookings(items);
      })
      .catch((error) => {
        if (!requestActive) return;

        setReviewableBookingsError(
          error.response?.data?.message || "Không thể tải thông tin đánh giá hướng dẫn viên.",
        );
      })
      .finally(() => {
        if (requestActive) setReviewableBookingsLoading(false);
      });

    return () => {
      requestActive = false;
    };
  }, [active]);

  const reviewableBookingById = useMemo(
    () => new Map(reviewableBookings.map((booking) => [Number(booking.id), booking])),
    [reviewableBookings],
  );

  const paymentExpiresAt = useCallback((booking) => booking.payment?.expires_at
    ? new Date(booking.payment.expires_at).getTime()
    : 0, []);

  const canPayBooking = useCallback((booking) => (
    booking.status === "pending"
    && booking.payment_status === "unpaid"
    && booking.payment?.payment_method === "vnpay"
    && booking.payment?.status === "pending"
    && paymentExpiresAt(booking) > now
  ), [now, paymentExpiresAt]);

  const stats = useMemo(() => {
    let pending = 0;
    let upcoming = 0;
    let completed = 0;
    let cancelled = 0;

    bookings.forEach((booking) => {
      if (booking.status === "cancelled") {
        cancelled++;
      } else if (canPayBooking(booking)) {
        pending++;
      } else if (booking.status === "completed") {
        completed++;
      } else {
        const depDate = booking.tour_departure?.departure_date;
        if (depDate && new Date(depDate).getTime() < now) {
          completed++;
        } else {
          upcoming++;
        }
      }
    });

    return {
      all: bookings.length,
      pending,
      upcoming,
      completed,
      cancelled,
    };
  }, [bookings, canPayBooking, now]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (bookingFilter === "pending") {
        if (!canPayBooking(booking)) return false;
      } else if (bookingFilter === "upcoming") {
        if (booking.status === "cancelled" || canPayBooking(booking)) return false;
        if (booking.status === "completed") return false;
        const depDate = booking.tour_departure?.departure_date;
        if (depDate && new Date(depDate).getTime() < now) return false;
      } else if (bookingFilter === "completed") {
        const isEnded = booking.tour_departure?.departure_date && new Date(booking.tour_departure.departure_date).getTime() < now;
        if (booking.status !== "completed" && !isEnded) return false;
        if (booking.status === "cancelled") return false;
      } else if (bookingFilter === "cancelled") {
        if (booking.status !== "cancelled") return false;
      }

      if (bookingSearch.trim()) {
        const q = bookingSearch.trim().toLowerCase();
        const code = (booking.booking_code || "").toLowerCase();
        const title = (booking.tour?.title || "").toLowerCase();
        const dest = (booking.tour?.destination?.name || booking.tour?.destination_name || "").toLowerCase();
        return code.includes(q) || title.includes(q) || dest.includes(q);
      }

      return true;
    }).sort((a, b) => {
      if (bookingSort === "oldest") {
        return a.id - b.id;
      }
      if (bookingSort === "price_desc") {
        return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      }
      if (bookingSort === "price_asc") {
        return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      }
      return b.id - a.id;
    });
  }, [bookings, bookingFilter, bookingSearch, bookingSort, canPayBooking, now]);

  const renderStatusBadge = (booking) => {
    if (booking.status === "cancelled") {
      return (
        <span className="vg-status-badge is-cancelled">
          <Icon name="trash" size={13} /> Đã hủy
        </span>
      );
    }
    if (booking.payment_status === "paid") {
      return (
        <span className="vg-status-badge is-paid">
          <Icon name="checkCircle" size={13} /> Đã thanh toán
        </span>
      );
    }
    if (booking.payment_status === "failed") {
      return (
        <span className="vg-status-badge is-failed">
          <Icon name="xCircle" size={13} /> Thanh toán thất bại
        </span>
      );
    }
    if (booking.status === "pending" && paymentExpiresAt(booking) <= now) {
      return (
        <span className="vg-status-badge is-expired">
          <Icon name="alertCircle" size={13} /> Đã hết hạn
        </span>
      );
    }
    if (canPayBooking(booking)) {
      return (
        <span className="vg-status-badge is-pending-payment">
          <Icon name="clock" size={13} /> Đang đợi thanh toán
        </span>
      );
    }

    return (
      <span className="vg-status-badge">
        {booking.status}
      </span>
    );
  };

  const handleContinuePayment = async (booking) => {
    setBookingActionError("");
    setBookingActionId(booking.id);

    try {
      const payment = await continueCustomerBookingPayment(booking.id);

      if (!payment?.checkout_url) {
        throw new Error("Không thể tạo liên kết thanh toán VNPAY.");
      }

      window.location.assign(payment.checkout_url);
    } catch (error) {
      setBookingActionError(error.response?.data?.message || error.message || "Không thể tiếp tục thanh toán.");
      setBookingActionId(null);
    }
  };

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Bạn có chắc muốn hủy đơn ${booking.booking_code}?`)) return;

    setBookingActionError("");
    setBookingActionId(booking.id);

    try {
      const updatedBooking = await cancelCustomerBooking(booking.id);
      onBookingUpdated?.(updatedBooking);
    } catch (error) {
      setBookingActionError(error.response?.data?.message || "Không thể hủy đơn hàng.");
    } finally {
      setBookingActionId(null);
    }
  };


  const handleGuideReviewSaved = (savedReview) => {
    if (!activeGuideReview) return;

    const bookingId = Number(activeGuideReview.booking.id);
    const guideId = Number(activeGuideReview.guide.id);

    setReviewableBookings((current) => current.map((booking) => {
      if (Number(booking.id) !== bookingId) return booking;

      return {
        ...booking,
        guides: (booking.guides || []).map((guide) => (
          Number(guide.id) === guideId
            ? {
              ...guide,
              reviewed: true,
              review: savedReview,
            }
            : guide
        )),
      };
    }));
  };

  return (
    <main className="vg-profile-page">
      <section className="vg-profile-hero">
        <div className="vg-container vg-profile-hero-shell">
          <div className="vg-profile-user">
            <CustomerAvatar profile={profile} />
            <div className="vg-profile-main">
              <span className="vg-profile-kicker">Tài khoản khách hàng</span>
              <h1>{shortName}</h1>
              <p>{profile.email}</p>
              <div className="vg-profile-summary">
                <span>
                  <Icon name="calendar" size={18} /> {bookingCount} chuyến đã đặt
                </span>
                <span>
                  <Icon name="heart" size={18} /> {wishlistCount} tour đã lưu
                </span>
                <span>
                  <Icon name="shield" size={18} /> Hồ sơ đã xác thực
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="vg-container vg-profile-content">
        <nav className="vg-profile-tabs">
          <NavLink className={active === "profile" ? "active" : ""} to="/customer/profile">
            <Icon name="user" /> Hồ sơ
          </NavLink>
          <NavLink className={active === "bookings" ? "active" : ""} to="/customer/bookings">
            <Icon name="calendar" /> Chuyến đi
          </NavLink>
          <NavLink className={active === "favorites" ? "active" : ""} to="/customer/favorites">
            <Icon name="heart" /> Yêu thích
          </NavLink>
          <NavLink className={active === "settings" ? "active" : ""} to="/customer/settings">
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
          <div className="vg-bookings-wrapper">
            {/* Stats Overview Bar */}
            <div className="vg-booking-stats-grid">
              <div
                className={`vg-stat-card ${bookingFilter === "all" ? "is-active" : ""}`}
                onClick={() => setBookingFilter("all")}
              >
                <div className="vg-stat-icon is-blue">
                  <Icon name="briefcase" size={20} />
                </div>
                <div className="vg-stat-content">
                  <span className="vg-stat-label">Tổng chuyến đi</span>
                  <strong className="vg-stat-value">{stats.all}</strong>
                </div>
              </div>

              <div
                className={`vg-stat-card ${bookingFilter === "pending" ? "is-active" : ""}`}
                onClick={() => setBookingFilter("pending")}
              >
                <div className="vg-stat-icon is-amber">
                  <Icon name="clock" size={20} />
                </div>
                <div className="vg-stat-content">
                  <span className="vg-stat-label">Chờ thanh toán</span>
                  <strong className="vg-stat-value">{stats.pending}</strong>
                </div>
              </div>

              <div
                className={`vg-stat-card ${bookingFilter === "upcoming" ? "is-active" : ""}`}
                onClick={() => setBookingFilter("upcoming")}
              >
                <div className="vg-stat-icon is-emerald">
                  <Icon name="calendar" size={20} />
                </div>
                <div className="vg-stat-content">
                  <span className="vg-stat-label">Sắp khởi hành</span>
                  <strong className="vg-stat-value">{stats.upcoming}</strong>
                </div>
              </div>

              <div
                className={`vg-stat-card ${bookingFilter === "completed" ? "is-active" : ""}`}
                onClick={() => setBookingFilter("completed")}
              >
                <div className="vg-stat-icon is-indigo">
                  <Icon name="sparkle" size={20} />
                </div>
                <div className="vg-stat-content">
                  <span className="vg-stat-label">Đã hoàn thành</span>
                  <strong className="vg-stat-value">{stats.completed}</strong>
                </div>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="vg-booking-toolbar">
              <div className="vg-booking-filter-tabs">
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "all" ? "active" : ""}`}
                  onClick={() => setBookingFilter("all")}
                >
                  Tất cả <span className="vg-filter-count">{stats.all}</span>
                </button>
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "pending" ? "active" : ""}`}
                  onClick={() => setBookingFilter("pending")}
                >
                  Chờ thanh toán <span className="vg-filter-count is-warn">{stats.pending}</span>
                </button>
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "upcoming" ? "active" : ""}`}
                  onClick={() => setBookingFilter("upcoming")}
                >
                  Sắp khởi hành <span className="vg-filter-count">{stats.upcoming}</span>
                </button>
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "completed" ? "active" : ""}`}
                  onClick={() => setBookingFilter("completed")}
                >
                  Hoàn thành <span className="vg-filter-count">{stats.completed}</span>
                </button>
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "cancelled" ? "active" : ""}`}
                  onClick={() => setBookingFilter("cancelled")}
                >
                  Đã hủy <span className="vg-filter-count">{stats.cancelled}</span>
                </button>
              </div>

              <div className="vg-booking-search-sort">
                <div className="vg-booking-search-box">
                  <Icon name="search" size={16} />
                  <input
                    type="text"
                    placeholder="Tìm theo mã đơn hoặc tên tour..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                  />
                  {bookingSearch ? (
                    <button type="button" onClick={() => setBookingSearch("")}>
                      <Icon name="close" size={14} />
                    </button>
                  ) : null}
                </div>

                <div className="vg-booking-sort-box">
                  <select value={bookingSort} onChange={(e) => setBookingSort(e.target.value)}>
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="price_desc">Giá: Cao đến thấp</option>
                    <option value="price_asc">Giá: Thấp đến cao</option>
                  </select>
                </div>
              </div>
            </div>

            {reviewableBookingsLoading ? (
              <p className="vg-guide-review-load-state">Đang kiểm tra các tour có thể đánh giá...</p>
            ) : null}
            {reviewableBookingsError ? (
              <p className="vg-booking-action-error">{reviewableBookingsError}</p>
            ) : null}

            {/* Bookings List */}
            {filteredBookings.length ? (
              <div className="vg-bookings">
                {bookingActionError ? <p className="vg-booking-action-error">{bookingActionError}</p> : null}
                {filteredBookings.map((booking) => {
                  const isPendingPayment = canPayBooking(booking);
                  const tourImage = booking.tour?.thumbnail_url || booking.tour?.image || booking.tour?.thumbnail?.image_url || "";
                  const departureDate = booking.tour_departure?.departure_date ? formatDate(booking.tour_departure.departure_date) : null;
                  const returnDate = booking.tour_departure?.return_date ? formatDate(booking.tour_departure.return_date) : null;
                  const destinationName = booking.tour?.destination?.name || booking.tour?.destination_name || "";
                  const meetingPoint = booking.tour_departure?.meeting_point || "Thông báo trước 24h";
                  const unitPrice = Number(booking.unit_price || (booking.total_amount && booking.number_of_people ? Number(booking.total_amount) / booking.number_of_people : 0));
                  const durationText = booking.tour?.duration || (booking.tour?.duration_days ? `${booking.tour.duration_days}N${booking.tour.duration_nights || 0}Đ` : "Chuyến đi");
                  const reviewableBooking = reviewableBookingById.get(Number(booking.id));
                  const reviewableGuides = (reviewableBooking?.guides || []).filter((guide) => guide?.id);

                  return (
                    <article key={booking.id} className={`vg-booking-card ${isPendingPayment ? "is-pending-payment-card" : ""}`}>
                      <div className="vg-booking-thumb">
                        {tourImage ? (
                          <img
                            src={mediaUrl(tourImage)}
                            alt={booking.tour?.title || "Tour ViVuGo"}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = "flex";
                              }
                            }}
                          />
                        ) : null}
                        <div className="vg-booking-thumb-fallback" style={{ display: tourImage ? "none" : "flex" }}>
                          <Icon name="mapPin" size={24} />
                          <span>ViVuGo</span>
                        </div>
                      </div>

                      <div className="vg-booking-details">
                        <div className="vg-booking-header-line">
                          <div className="vg-booking-tags">
                            <span className="vg-booking-code-chip">
                              <Icon name="briefcase" size={13} /> {booking.booking_code}
                            </span>
                            <span className="vg-booking-created-date">Ngày đặt: {formatDate(booking.created_at)}</span>
                          </div>
                          {destinationName ? (
                            <span className="vg-booking-dest-chip">
                              <Icon name="mapPin" size={13} /> {destinationName}
                            </span>
                          ) : null}
                        </div>

                        <h3 className="vg-booking-title">
                          <Link to={booking.tour?.slug ? `/tours/${booking.tour.slug}` : "#"}>
                            {booking.tour?.title || "Tour Du Lịch ViVuGo"}
                          </Link>
                        </h3>

                        {/* Visual Trip Track Bar */}
                        {(() => {
                          const tourTitle = booking.tour?.title || "";
                          const vehicleIcon = getVehicleIconName(tourTitle);
                          return (
                            <div className="vg-trip-track-container">
                              <div className="vg-track-node">
                                <span className="vg-node-label">
                                  <span className="vg-node-dot is-start"></span> Khởi hành
                                </span>
                                <strong className="vg-node-date">{departureDate || "Đang cập nhật"}</strong>
                              </div>

                              <div className="vg-track-line-wrapper">
                                <div className="vg-track-line-dashed"></div>
                                <div className="vg-track-badge">
                                  <Icon name={vehicleIcon} size={14} />
                                  <span>{durationText}</span>
                                </div>
                              </div>

                              <div className="vg-track-node is-end">
                                <span className="vg-node-label">
                                  Kết thúc <span className="vg-node-dot is-end"></span>
                                </span>
                                <strong className="vg-node-date">{returnDate || "Đang cập nhật"}</strong>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Trip Meta Footer */}
                        <div className="vg-booking-meta-row">
                          <span className="vg-meta-item">
                            <Icon name="users" size={14} /> {booking.number_of_people} khách {unitPrice > 0 ? `(${formatCurrency(unitPrice)}/khách)` : ""}
                          </span>
                          {meetingPoint ? (
                            <span className="vg-meta-item is-meeting" title={`Điểm tập trung: ${meetingPoint}`}>
                              <Icon name="mapPin" size={14} /> {meetingPoint}
                            </span>
                          ) : null}
                        </div>


                        {reviewableGuides.length ? (
                          <div className="vg-guide-review-panel">
                            <div className="vg-guide-review-panel-heading">
                              <span><Icon name="star" size={15} /> Đánh giá hướng dẫn viên</span>
                              <small>Tour đã kết thúc</small>
                            </div>
                            <div className="vg-guide-review-list">
                              {reviewableGuides.map((guide) => {
                                const guideAvatar = mediaUrl(guide.avatar_url);
                                const guideRating = Number(guide.review?.rating) || 0;

                                return (
                                  <div key={guide.id} className="vg-guide-review-row">
                                    <div className="vg-guide-review-row-person">
                                      <div className={`vg-guide-review-row-avatar ${guideAvatar ? "has-image" : ""}`}>
                                        {guideAvatar ? (
                                          <img src={guideAvatar} alt={guide.full_name || "Hướng dẫn viên"} />
                                        ) : (
                                          <span>{guide.full_name?.charAt(0)?.toUpperCase() || "H"}</span>
                                        )}
                                      </div>
                                      <div>
                                        <strong>{guide.full_name || guide.guide_code || "Hướng dẫn viên"}</strong>
                                        {guide.reviewed ? (
                                          <span className="vg-guide-review-saved-rating">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Icon key={star} name="star" size={13} />
                                            )).filter((_, index) => index < guideRating)}
                                            {guideRating}/5 sao
                                          </span>
                                        ) : (
                                          <span>Chia sẻ trải nghiệm của bạn với hướng dẫn viên.</span>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className={guide.reviewed ? "is-reviewed" : ""}
                                      onClick={() => setActiveGuideReview({
                                        booking: reviewableBooking,
                                        guide,
                                      })}
                                    >
                                      <Icon name={guide.reviewed ? "edit" : "star"} size={15} />
                                      {guide.reviewed ? "Sửa đánh giá" : "Đánh giá ngay"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        {isPendingPayment && booking.payment?.expires_at ? (
                          <div className="vg-booking-countdown-wrapper">
                            <BookingCountdown
                              expiresAt={booking.payment.expires_at}
                              onExpire={() => setNow(Date.now())}
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="vg-booking-summary-side">
                        <div className="vg-booking-status-wrap">
                          {renderStatusBadge(booking)}
                        </div>

                        <div className="vg-price-block">
                          <span className="vg-price-label">Tổng thanh toán</span>
                          <strong className="vg-price-value">{formatCurrency(Number(booking.total_amount))}</strong>
                        </div>

                        <div className="vg-booking-actions-row">
                          {isPendingPayment ? (
                            <div className="vg-booking-actions">
                              <button
                                type="button"
                                className="is-pay"
                                onClick={() => handleContinuePayment(booking)}
                                disabled={bookingActionId === booking.id}
                              >
                                <Icon name="creditCard" size={14} />
                                {bookingActionId === booking.id ? "Đang xử lý..." : "Thanh toán"}
                              </button>
                              <button
                                type="button"
                                className="is-cancel"
                                onClick={() => handleCancelBooking(booking)}
                                disabled={bookingActionId === booking.id}
                              >
                                Hủy đơn
                              </button>
                            </div>
                          ) : (
                            <div className="vg-booking-actions-group">
                              {booking.status !== "cancelled" && (
                                <button
                                  type="button"
                                  className="vg-btn-ticket"
                                  onClick={() => setActiveTicketBooking(booking)}
                                >
                                  <Icon name="eye" size={15} /> Vé điện tử
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon="calendar"
                title={bookingSearch ? "Không tìm thấy chuyến đi phù hợp" : "Chưa có chuyến đi nào ở mục này"}
                action="Khám phá tour ngay"
              />
            )}
          </div>
        ) : null}

        {active === "profile" ? (
          <div className="vg-profile-overview">
            <section className="vg-profile-card">
              <header>
                <div>
                  <span>Thông tin cá nhân</span>
                  <h2>Hồ sơ của bạn</h2>
                </div>
                <Link to="/customer/profile/edit">
                  <Icon name="edit" size={18} /> Chỉnh sửa
                </Link>
              </header>
              <div className="vg-profile-info-grid">
                <div>
                  <span>Họ và tên</span>
                  <strong>{profile.full_name || "Chưa cập nhật"}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{profile.email || "Chưa cập nhật"}</strong>
                </div>
                <div>
                  <span>Số điện thoại</span>
                  <strong>{profile.phone || "Chưa cập nhật"}</strong>
                </div>
              </div>
            </section>

            <aside className="vg-profile-side">
              <div>
                <Icon name="wallet" size={22} />
                <span>Tổng giá trị đặt tour</span>
                <strong>
                  {formatCurrency(
                    bookings.reduce(
                      (total, booking) => total + Number(booking.total_amount || 0),
                      0,
                    ),
                  )}
                </strong>
              </div>
              <Link to="/customer/password">
                <Icon name="shield" size={19} /> Đổi mật khẩu
              </Link>
            </aside>
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
          </div>
        ) : null}
      </section>

      {/* Interactive E-Ticket Modal */}
      {activeTicketBooking ? (
        <BookingTicketModal
          booking={activeTicketBooking}
          onClose={() => setActiveTicketBooking(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      ) : null}


      {activeGuideReview ? (
        <GuideReviewModal
          booking={activeGuideReview.booking}
          guide={activeGuideReview.guide}
          onClose={() => setActiveGuideReview(null)}
          onSaved={handleGuideReviewSaved}
        />
      ) : null}
    </main>
  );
}

export default ProfileDashboard;
