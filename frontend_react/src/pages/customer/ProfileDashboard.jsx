import { Link, NavLink } from "react-router-dom";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import { useLocale } from "../../contexts/LocaleContext";

function EmptyState({ icon, title, action }) {
  return (
    <div className="vg-empty">
      <Icon name={icon} size={36} />
      <h2>{title}</h2>
      <Link to="/tours">{action}</Link>
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
                      {formatDate(booking.created_at)}
                    </p>
                  </div>
                  <div>
                    <strong>
                      {formatCurrency(Number(booking.total_amount))}
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

export default ProfileDashboard;
