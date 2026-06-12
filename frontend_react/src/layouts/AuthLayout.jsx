import BrandLogo from '../components/auth/BrandLogo'

function AuthLayout({ children, currentUser, onLogout }) {
  return (
    <main className="auth-page">
      <section className="auth-hero" aria-labelledby="auth-title">
        <nav className="topbar" aria-label="Thanh điều hướng">
          <BrandLogo />
          {currentUser ? (
            <button className="ghost-button" type="button" onClick={onLogout}>
              Đăng xuất
            </button>
          ) : null}
        </nav>

        <div className="hero-content">
          <p className="eyebrow">Tourism account center</p>
          <h1 id="auth-title">
            Khởi hành nhẹ nhàng với tài khoản du lịch của bạn.
          </h1>
          <p className="hero-copy">
            Quản lý hồ sơ, lưu hành trình yêu thích và đăng nhập an toàn trước mỗi
            chuyến đi.
          </p>

          <div className="trip-strip" aria-label="Điểm nổi bật">
            <span>Flight deals</span>
            <span>Hotel wishlist</span>
            <span>Smart itineraries</span>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-label="Khu vực tài khoản">
        {children}
      </section>
    </main>
  )
}

export default AuthLayout
