import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import Icon from "./Icon";

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

export default Header;
