import { useLocale } from "../../contexts/LocaleContext";
import Icon from "./Icon";

function TourCard({ tour, favorite, onFavorite }) {
  const { currency, formatCurrency } = useLocale();
  const salePrice = Number(tour.price?.discount || tour.price?.base || 0);
  const originalPrice = Number(tour.price?.base || salePrice);
  const displayPrice =
    currency === "VND" && salePrice > 0 && salePrice < 100000
      ? salePrice * 25000
      : salePrice;
  const displayOriginalPrice =
    currency === "VND" && originalPrice > 0 && originalPrice < 100000
      ? originalPrice * 25000
      : originalPrice;

  return (
    <article className="vg-tour-card">
      <div className="vg-tour-photo">
        <img src={tour.image} alt={tour.title} />
        <div className="vg-tour-badges">
          {tour.featured ? <span>Nổi bật</span> : null}
          {tour.discountLabel ? <strong>{tour.discountLabel}</strong> : null}
        </div>
        <button
          className={favorite ? "vg-heart is-active" : "vg-heart"}
          type="button"
          onClick={() => onFavorite(tour)}
          aria-label="Thêm tour yêu thích"
        >
          <Icon name="heart" size={19} />
        </button>
        <span className="vg-place">
          <Icon name="map" size={15} /> {tour.destination}
        </span>
      </div>
      <div className="vg-tour-info">
        <div className="vg-tour-meta">
          <span>{tour.category}</span>
          <b>★ {tour.rating?.average || 4.8}</b>
          <small>({tour.rating?.count || 128})</small>
        </div>
        <h3>{tour.title}</h3>
        <p>{tour.summary}</p>
        <div className="vg-tour-facts">
          <span>
            <Icon name="clock" size={16} /> {tour.duration}
          </span>
          <span>
            <Icon name="users" size={16} /> Tối đa {tour.slots?.max || 12}
          </span>
        </div>
        <div className="vg-tour-footer">
          <div>
            <strong>{formatCurrency(displayPrice)}</strong>
            {displayOriginalPrice > displayPrice ? (
              <del>{formatCurrency(displayOriginalPrice)}</del>
            ) : null}
            <small>/ người</small>
          </div>
          <button type="button">Xem chi tiết</button>
        </div>
      </div>
    </article>
  );
}

export default TourCard;
