import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import BrandLogo from "../BrandLogo";
import Icon from "./Icon";

function Header({ user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: "Trang chủ", to: "/", end: true },
    {
      label: "Tour trong nước",
      to: "/tours",
      items: [
        { label: "Đà Nẵng - Hội An", to: "/tours?q=Đà%20Nẵng" },
        { label: "Phú Quốc", to: "/tours?q=Phú%20Quốc" },
        { label: "Sa Pa", to: "/tours?q=Sa%20Pa" },
        { label: "Xem toàn bộ tour", to: "/tours" },
      ],
    },
    {
      label: "Tour quốc tế",
      to: "/deals",
      items: [
        { label: "Nhật Bản", to: "/deals?q=Nhật%20Bản" },
        { label: "Bali", to: "/deals?q=Bali" },
        { label: "Singapore", to: "/deals?q=Singapore" },
        { label: "Xem toàn bộ tour", to: "/deals" },
      ],
    },
    {
      label: "Về chúng tôi",
      to: "/#gioi-thieu",
      hash: true,
      items: [
        { label: "Giới thiệu", to: "/#gioi-thieu" },
        { label: "Đánh giá khách hàng", to: "/#danh-gia" },
      ],
    },
  ];

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
          {navItems.map((item) => (
            <div
              className={item.items ? "vg-nav-item vg-nav-menu" : "vg-nav-item"}
              key={item.label}
            >
              {item.hash ? (
                <a
                  className="vg-nav-pill"
                  href={item.to}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <NavLink
                  className={({ isActive }) =>
                    isActive ? "vg-nav-pill is-active" : "vg-nav-pill"
                  }
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </NavLink>
              )}
              {item.items ? (
                <div className="vg-nav-dropdown">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.label}
                      to={subItem.to}
                      onClick={() => setMobileOpen(false)}
                    >
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="vg-nav-actions">
          {user ? (
            <div className="vg-account-menu">
              <button
                className="vg-account-trigger"
                type="button"
                aria-label="Tài khoản"
              >
                <Icon name="user" />
                <span>{user.full_name || "Tài khoản"}</span>
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
            <>
              <Link className="vg-login-link" to="/auth">
                Đăng nhập
              </Link>
              <Link className="vg-signup-link" to="/auth">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
