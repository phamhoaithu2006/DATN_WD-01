import { Link } from "react-router-dom";
import { useLocale } from "../../contexts/LocaleContext";
import BrandLogo from "../BrandLogo";

function Footer() {
  const { settings } = useLocale();
  const footerText = settings.footer_text || "";
  const footerAddress = settings.footer_address || settings.address || "";
  const footerHotline = settings.footer_hotline || settings.hotline || "";
  const footerEmail = settings.footer_email || settings.contact_email || "";
  const siteName = settings.site_name || "VivuGo";

  return (
    <footer className="vg-footer">
      <section className="vg-cta">
        <h2>Sẵn sàng cho hành trình mới?</h2>
        <p>Khám phá thế giới theo cách của bạn cùng {siteName}.</p>
        <div>
          <Link to="/tours">Khám phá tour</Link>
          <Link to="/auth">Tạo tài khoản</Link>
        </div>
      </section>
      <div className="vg-container vg-footer-grid">
        <div>
          <BrandLogo footer />
          {footerText ? <p>{footerText}</p> : null}
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
          {footerAddress ? <p>{footerAddress}</p> : null}
          {footerHotline ? <p>{footerHotline}</p> : null}
          {footerEmail ? <p>{footerEmail}</p> : null}
        </div>
      </div>
      <div className="vg-container vg-copyright">
        <span>© {new Date().getFullYear()} {siteName}. Đã đăng ký bản quyền.</span>
        <span>Điều khoản · Quyền riêng tư · Cookie</span>
      </div>
    </footer>
  );
}

export default Footer;
