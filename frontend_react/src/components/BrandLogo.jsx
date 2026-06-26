import { Link } from "react-router-dom";
import { useLocale } from "../contexts/LocaleContext";
import "../styles/brand-logo.css";

function BrandLogo({
  footer = false,
  asLink = true,
  className = "brand",
  markClassName = "brand-mark",
  nameClassName = "brand-name",
  to = "/",
}) {
  const { settings } = useLocale();
  const siteName = settings.site_name || "VivuGo";
  const logoUrl = settings.logo_url?.trim();
  const rootClassName = footer ? `${className} brand--footer` : className;

  const content = (
    <>
      <span className={markClassName} aria-hidden="true">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} />
        ) : (
          <svg viewBox="0 0 48 48" role="img">
            <path d="M8 27.5 40.5 21l-12.8 9.1 7.7 2.6c1.2.4 1.5 2 .5 2.8l-2.2 1.8c-.6.5-1.4.6-2.1.2l-7.2-3.8-4.9 5.6c-.5.6-1.2 1-2 1.1l-2.7.2c-1.1.1-2-.8-1.9-1.9l.4-4.2-6.9-2.5-1.2 3.8c-.3.9-1.2 1.4-2.1 1.2l-1.8-.4c-1-.2-1.5-1.3-1.1-2.2l1.7-4.2L8 27.5Z" />
            <path d="M10.3 24.1 30.9 15l3.9-6.8c.5-.8 1.5-1.2 2.4-.9l1.7.5c.9.3 1.4 1.2 1.2 2.1l-1.4 6.7 4.7 3.2c1 .7 1.1 2.2.1 3l-1.6 1.2c-.6.5-1.5.5-2.2.1l-5.6-2.7-5.8 4.1L10.3 24.1Z" />
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
      <div className={rootClassName} aria-label="ViVuGo">
        {content}
      </div>
    );
  }

  return (
    <Link className={rootClassName} to={to} aria-label="ViVuGo">
      {content}
    </Link>
  );
}

export default BrandLogo;
