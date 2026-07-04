import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "../../contexts/LocaleContext";
import Icon from "./Icon";


function TourCard({ tour, favorite, onFavorite }) {
  const { currency, formatCurrency } = useLocale();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

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

  // Smart rating logic
  const rawAverage = Number(tour.rating?.average || 0);
  const ratingCount = Number(tour.rating?.count || 0);
  const ratingAverage = rawAverage > 0 ? rawAverage : (ratingCount > 0 ? 4.8 : 0);
  const hasRating = ratingAverage > 0;

  const isFeatured = tour.featured || (ratingAverage >= 4.9 && ratingCount > 0);
  const hasDiscount = originalPrice > salePrice && salePrice > 0;
  const computedDiscountLabel = hasDiscount
    ? `-${Math.round((1 - salePrice / originalPrice) * 100)}%`
    : null;
  const discountLabelToShow = tour.discountLabel || computedDiscountLabel;

  const handleCardClick = (e) => {
    // If the user clicks on the heart button, do not navigate.
    if (e.target.closest(".vg-heart")) {
      return;
    }
    navigate(`/tours/${tour.slug || tour.id}`);
  };

  return (
    <article className="vg-tour-card" onClick={handleCardClick}>
      <div className="vg-tour-photo">
        {imgError || !tour.image ? (
          <div className="vg-tour-fallback-image">
            <Icon name="globe" size={32} />
            <span>{tour.title}</span>
          </div>
        ) : (
          <img
            src={tour.image}
            alt={tour.title}
            onError={() => setImgError(true)}
          />
        )}
        <div className="vg-tour-badges">
          {isFeatured ? <span className="badge-featured">Nổi bật</span> : null}
          {discountLabelToShow ? <strong className="badge-discount">{discountLabelToShow}</strong> : null}
        </div>
        <button
          className={favorite ? "vg-heart is-active" : "vg-heart"}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(tour);
          }}
          aria-label="Thêm tour yêu thích"
        >
          <Icon name="heart" size={19} />
        </button>
        <span className="vg-place">
          <Icon name="mapPin" size={14} /> {tour.destination}
        </span>
      </div>
      <div className="vg-tour-info">
        <div className="vg-tour-meta">
          <span className="vg-tour-category">{tour.category}</span>
          {hasRating ? (
            <span className="vg-tour-rating">
              <Icon name="star" size={13} />
              <b>{ratingAverage.toFixed(1)}</b>
              <small>({ratingCount})</small>
            </span>
          ) : (
            <span className="vg-tour-rating new">
              <Icon name="star" size={13} />
              <b>Mới</b>
            </span>
          )}
        </div>
        <h3>{tour.title}</h3>
        <div className="vg-tour-facts">
          <span>
            <Icon name="clock" size={15} /> {tour.duration}
          </span>
          <span>
            <Icon name="users" size={15} /> Tối đa {tour.slots?.max || 12}
          </span>
        </div>
        <div className="vg-tour-footer">
          <div className="vg-tour-price-box">
            <div className="vg-tour-price-row">
              <strong className="vg-tour-sale-price">{formatCurrency(displayPrice)}</strong>
              <span className="vg-tour-price-unit">/ người</span>
            </div>
            {displayOriginalPrice > displayPrice ? (
              <div className="vg-tour-discount-row">
                <span className="vg-tour-original-label">Giá gốc:</span>
                <del className="vg-tour-original-price">{formatCurrency(displayOriginalPrice)}</del>
              </div>
            ) : (
              <div className="vg-tour-discount-row placeholder">
                <span>&nbsp;</span>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </article>
  );
}

export default TourCard;

