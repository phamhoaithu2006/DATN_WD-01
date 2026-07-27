import { useState } from "react";
import { Link } from "react-router-dom";
import { useLocale } from "../../../contexts/LocaleContext";
import { mediaUrl } from "../../../utils/mediaUrl";
import Icon from "../Icon";

function ChatTourImage({ tour }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = mediaUrl(tour.thumbnailUrl);

  if (!imageUrl || imageError) {
    return (
      <div className="vg-chat-tour-image-fallback" aria-label="Chưa có ảnh tour">
        <Icon name="globe" size={25} />
        <span>Chưa có ảnh</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={tour.thumbnailAlt || tour.title}
      loading="lazy"
      onError={() => setImageError(true)}
    />
  );
}

function ChatTourCard({ tour, onNavigate }) {
  const { formatCurrency, formatDate } = useLocale();
  const displayPrice = tour.price ?? tour.discountPrice ?? tour.basePrice;
  const hasDiscount =
    tour.discountPrice !== null &&
    tour.basePrice !== null &&
    tour.discountPrice < tour.basePrice;
  const hasRating = Number(tour.averageRating) > 0;

  return (
    <article className="vg-chat-tour-card">
      <div className="vg-chat-tour-image">
        <ChatTourImage tour={tour} />
      </div>

      <div className="vg-chat-tour-card-body">
        <h4>{tour.title}</h4>

        <div className="vg-chat-tour-card-meta">
          {tour.destination ? (
            <span title={tour.destination}>
              <Icon name="mapPin" size={13} />
              {tour.destination}
            </span>
          ) : null}
          {tour.duration ? (
            <span>
              <Icon name="clock" size={13} />
              {tour.duration}
            </span>
          ) : null}
          {tour.departureDate ? (
            <span>
              <Icon name="calendar" size={13} />
              Khởi hành {formatDate(tour.departureDate)}
            </span>
          ) : null}
        </div>

        <div className="vg-chat-tour-card-summary">
          <div className="vg-chat-tour-card-price">
            {displayPrice !== null ? (
              <>
                <strong>{formatCurrency(displayPrice)}</strong>
                {hasDiscount ? (
                  <del>{formatCurrency(tour.basePrice)}</del>
                ) : null}
              </>
            ) : (
              <span>Liên hệ</span>
            )}
          </div>

          <div
            className={`vg-chat-tour-card-rating${hasRating ? "" : " is-empty"}`}
            aria-label={
              hasRating
                ? `Đánh giá ${tour.averageRating} trên 5`
                : "Chưa có đánh giá"
            }
          >
            <Icon name="star" size={13} />
            {hasRating ? (
              <>
                <b>{Number(tour.averageRating).toFixed(1)}</b>
                <small>({tour.reviewCount ?? 0})</small>
              </>
            ) : (
              <small>Chưa có đánh giá</small>
            )}
          </div>
        </div>

        <Link
          className="vg-chat-tour-detail-link"
          to={`/tours/${encodeURIComponent(tour.slug)}`}
          onClick={onNavigate}
        >
          Xem chi tiết
          <Icon name="arrowRight" size={14} />
        </Link>
      </div>
    </article>
  );
}

export function ChatTourRecommendations({
  tours = [],
  loading = false,
  onNavigate,
}) {
  if (loading) {
    return (
      <div
        className="vg-chat-tour-list is-loading"
        aria-label="Đang tải tour đề xuất"
        aria-busy="true"
      >
        {[0, 1].map((item) => (
          <div className="vg-chat-tour-card-skeleton" key={item}>
            <span className="vg-chat-tour-skeleton-image" />
            <span className="vg-chat-tour-skeleton-content">
              <i />
              <i />
              <i />
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (!tours.length) return null;

  return (
    <div className="vg-chat-tour-list" aria-label="Tour được đề xuất">
      {tours.map((tour) => (
        <ChatTourCard
          key={tour.id}
          tour={tour}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

export default ChatTourRecommendations;
