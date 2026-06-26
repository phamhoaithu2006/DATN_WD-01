import { Link } from "react-router-dom";
import { useLocale } from "../../contexts/LocaleContext";
import BrandLogo from "../BrandLogo";

function Footer() {
  const { settings } = useLocale();
  const footerText = settings.footer_text || "";
  const footerAddress = settings.footer_address || settings.address || "";
  const footerHotline = settings.footer_hotline || settings.hotline || "1900 1234";
  const footerEmail = settings.footer_email || settings.contact_email || "support@vivugo.vn";
  const siteName = settings.site_name || "VivuGo";

  return (
    <footer className="vg-footer">
      <div className="vg-container vg-footer-grid">
        <div className="vg-footer-brand">
          <BrandLogo footer />
          <p className="vg-footer-company">Công ty TNHH Du lịch {siteName}</p>
          {footerText ? <p>{footerText}</p> : <p>Khám phá hành trình mới cùng đội ngũ tư vấn tận tâm.</p>}
          {footerAddress ? <p>{footerAddress}</p> : null}
          <p>{footerEmail}</p>
          <p>{footerHotline}</p>
        </div>

        <div>
          <h3>Liên kết nhanh</h3>
          <Link to="/">Trang chủ</Link>
          <Link to="/tours">Tour trong nước</Link>
          <Link to="/deals">Tour quốc tế</Link>
          <Link to="/destinations">Về chúng tôi</Link>
        </div>

        <div>
          <h3>Theo dõi chúng tôi</h3>
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer">Facebook</a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://www.tiktok.com" target="_blank" rel="noreferrer">TikTok</a>
          <a href="https://www.youtube.com" target="_blank" rel="noreferrer">YouTube</a>
        </div>

        <div>
          <h3>Hỗ trợ</h3>
          <a href="#">Chính sách đặt tour</a>
          <a href="#">Chính sách hoàn hủy</a>
          <a href="#">Điều khoản sử dụng</a>
          <a href="#">FAQ - Câu hỏi thường gặp</a>
          <div className="vg-hotline-card">
            <span>Hotline hỗ trợ 24/7</span>
            <strong>{footerHotline}</strong>
          </div>
        </div>
      </div>
      <div className="vg-container vg-copyright">
        <span>© {new Date().getFullYear()} {siteName} Travel. Giấy phép LHQT số 01-123/2026/TCDL-GPLHQT. MST: 0123456789</span>
      </div>
    </footer>
  );
}

export default Footer;
