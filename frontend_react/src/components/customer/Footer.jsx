import { Link } from "react-router-dom";
import BrandLogo from "../BrandLogo";

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

export default Footer;
