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
  const siteName = (settings.site_name || "ViVuGo").trim();
  const logoUrl = settings.logo_url?.trim();
  const rootClassName = footer ? `${className} brand--footer` : className;
  const accentIndex = Math.max(siteName.length - 2, 0);
  const brandNamePrimary = siteName.slice(0, accentIndex) || siteName;
  const brandNameAccent = siteName.slice(accentIndex);

  const content = (
    <>
      <span className={markClassName} aria-hidden="true">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} />
        ) : (
          <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
            <text
              x="24"
              y="31"
              fill="#fff"
              fontFamily="Segoe UI Symbol, Noto Sans Symbols 2, Apple Symbols, sans-serif"
              fontSize="34"
              fontWeight="700"
              textAnchor="middle"
              transform="rotate(-18 24 24)"
            >
              {"✈"}
            </text>
          </svg>
        )}
      </span>
      <span className={nameClassName} aria-label={siteName}>
        {footer ? siteName : (
          <>
            <span className="brand-name-primary">{brandNamePrimary}</span>
            <span className="brand-name-accent">{brandNameAccent}</span>
          </>
        )}
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
