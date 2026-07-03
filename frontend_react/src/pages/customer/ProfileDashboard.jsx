import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import { useLocale } from "../../contexts/LocaleContext";
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
              {bookings.map((booking) => (
                <article key={booking.id}>
                  <div>
                    <span>Mã đặt chỗ: {booking.booking_code}</span>
                    <h3>{booking.tour?.title || "Tour ViVuGo"}</h3>
                    <p>
                      {booking.number_of_people} khách · {formatDate(booking.created_at)}
                    </p>
                  </div>
                  <div>
                    <strong>{formatCurrency(Number(booking.total_amount))}</strong>
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
