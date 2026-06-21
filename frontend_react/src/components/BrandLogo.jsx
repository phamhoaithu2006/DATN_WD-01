import { Link } from "react-router-dom";
import { useLocale } from "../contexts/LocaleContext";
import "../styles/brand-logo.css";

function BrandLogo({
  asLink = true,
  className = "brand",
  markClassName = "brand-mark",
  nameClassName = "brand-name",
  to = "/",
}) {
  const { settings } = useLocale();
  const siteName = settings.site_name || "VivuGo";
  const logoUrl = settings.logo_url?.trim();

  const content = (
    <>
      <span className={markClassName} aria-hidden="true">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} />
        ) : (
          <svg viewBox="0 0 48 48" role="img">
            <path d="M42.1 7.2c1.4 1.4 1 4-.8 5.7L31.1 23l4.7 15.2-3.8 3.8-7.8-12.3-7 7-1.4 6.2-3.1 3.1-2.4-9.7-9.7-2.4 3.1-3.1 6.2-1.4 7-7L4.6 14.6l3.8-3.8 15.2 4.7L33.8 5.4c1.8-1.8 4.9-1.7 8.3 1.8Z" />
          </svg>
        )}
      </span>
      <span className={nameClassName}>
        {siteName}
      </span>
    </>
  );

  if (!asLink) {
    return (
      <div className={className} aria-label="ViVuGo">
        {content}
      </div>
    );
  }

  return (
    <Link className={className} to={to} aria-label="ViVuGo">
      {content}
    </Link>
  );
}

export default BrandLogo;
