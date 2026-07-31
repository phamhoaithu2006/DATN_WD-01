import { Link } from "react-router-dom";
import { useLocale } from "../../contexts/LocaleContext";

function Footer() {
  const { settings } = useLocale();
  const footerText = settings.footer_text || "";
  const footerAddress = settings.footer_address || settings.address || "";
  const footerHotline = settings.footer_hotline || settings.hotline || "1900 1234";
  const footerEmail = settings.footer_email || settings.contact_email || "support@vivugo.vn";
  const siteName = settings.site_name || "ViVuGo";
  const accentIndex = Math.max(siteName.length - 2, 0);
  const brandNamePrimary = siteName.slice(0, accentIndex) || siteName;
  const brandNameAccent = siteName.slice(accentIndex);

  return (
    <footer className="vg-footer vg-footer-soft">
      <div className="vg-container vg-footer-grid">
        <div className="vg-footer-brand">
          <div className="vg-footer-title" aria-label={siteName}>
            <span className="brand-name-primary">{brandNamePrimary}</span>
            <span className="brand-name-accent">{brandNameAccent}</span>
          </div>
          <p className="vg-footer-company">Công ty TNHH Du lịch {siteName}</p>
          {footerText ? <p>{footerText}</p> : <p>Khám phá hành trình mới cùng đội ngũ tư vấn tận tâm.</p>}
          {footerAddress ? <p>{footerAddress}</p> : null}
          <p>{footerEmail}</p>
          <p>{footerHotline}</p>
        </div>

        <div>
          <h3>Liên kết nhanh</h3>
          <Link to="/">Trang chủ</Link>
          <Link to="/tours?scope=domestic">Tour trong nước</Link>
          <Link to="/tours?scope=international">Tour quốc tế</Link>
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
          <Link to="/policies/booking">Chính sách đặt tour</Link>
          <Link to="/policies/cancellation">Chính sách hoàn hủy</Link>
          <Link to="/policies/terms">Điều khoản sử dụng</Link>
          <Link to="/faqs">FAQ - Câu hỏi thường gặp</Link>
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
