import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import BookingCountdown from "../../components/customer/BookingCountdown";
import { useLocale } from "../../contexts/LocaleContext";
import { cancelCustomerBooking, continueCustomerBookingPayment } from "../../services/customerApi";
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const paymentExpiresAt = (booking) => booking.payment?.expires_at
    ? new Date(booking.payment.expires_at).getTime()
    : 0;

  const canPayBooking = (booking) => (
    booking.status === "pending"
    && booking.payment_status === "unpaid"
    && booking.payment?.payment_method === "vnpay"
    && booking.payment?.status === "pending"
    && paymentExpiresAt(booking) > now
  );

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
          <span className="vg-pulse-dot" />
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

          <div className="vg-profile-quick-card">
            <span>Hành trình tiếp theo</span>
            <strong>{bookings[0]?.tour?.title || "Chưa có chuyến sắp tới"}</strong>
            <Link to="/tours">Khám phá tour</Link>
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
          bookings.length ? (
            <div className="vg-bookings">
              {bookingActionError ? <p className="vg-booking-action-error">{bookingActionError}</p> : null}
              {bookings.map((booking) => {
                const isPendingPayment = canPayBooking(booking);
                const tourImage = booking.tour?.thumbnail_url || booking.tour?.image || booking.tour?.thumbnail?.image_url || "";

                return (
                  <article key={booking.id} className={`vg-booking-card ${isPendingPayment ? "is-pending-payment-card" : ""}`}>
                    <header className="vg-booking-card-top">
                      <div className="vg-booking-code-wrap">
                        <Icon name="briefcase" size={15} />
                        <span>Mã đơn hàng:</span>
                        <strong>{booking.booking_code}</strong>
                      </div>
                      <div className="vg-booking-status-wrap">
                        {renderStatusBadge(booking)}
                      </div>
                    </header>

                    <div className="vg-booking-card-main">
                      <div className="vg-booking-thumb">
                        {tourImage ? (
                          <img
                            src={mediaUrl(tourImage)}
                            alt={booking.tour?.title || "Tour ViVuGo"}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="vg-booking-thumb-fallback">
                            <Icon name="mapPin" size={22} />
                          </div>
                        )}
                      </div>

                      <div className="vg-booking-details">
                        <h3 className="vg-booking-title">
                          <Link to={booking.tour?.slug ? `/tours/${booking.tour.slug}` : "#"}>
                            {booking.tour?.title || "Tour ViVuGo"}
                          </Link>
                        </h3>

                        <div className="vg-booking-meta-chips">
                          <span className="vg-meta-chip">
                            <Icon name="users" size={14} /> {booking.number_of_people} hành khách
                          </span>
                          <span className="vg-meta-chip">
                            <Icon name="calendar" size={14} /> Ngày đặt: {formatDate(booking.created_at)}
                          </span>
                        </div>

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
                        <div className="vg-price-block">
                          <span className="vg-price-label">Tổng thanh toán</span>
                          <strong className="vg-price-value">{formatCurrency(Number(booking.total_amount))}</strong>
                        </div>

                        {isPendingPayment ? (
                          <div className="vg-booking-actions">
                            <button
                              type="button"
                              className="is-pay"
                              onClick={() => handleContinuePayment(booking)}
                              disabled={bookingActionId === booking.id}
                            >
                              <Icon name="creditCard" size={15} />
                              {bookingActionId === booking.id ? "Đang xử lý..." : "Thanh toán ngay"}
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
                          <div className="vg-booking-status-info">
                            {booking.payment_status === "paid" ? (
                              <span className="vg-paid-tag">
                                <Icon name="checkCircle" size={14} /> Vé đã xác nhận
                              </span>
                            ) : booking.status === "cancelled" ? (
                              <span className="vg-cancelled-tag">Đơn hàng đã hủy</span>
                            ) : null}
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
              title="Bạn chưa có chuyến đi nào"
              action="Đặt tour ngay"
            />
          )
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
            <Link to="/customer/password">Đổi mật khẩu →</Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default ProfileDashboard;
