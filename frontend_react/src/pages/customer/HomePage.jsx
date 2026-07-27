import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import { mediaUrl } from "../../utils/mediaUrl";

// Skeleton Loading khi đang tải dữ liệu
function HomeSkeleton() {
  return (
    <div className="vg-home-skeleton vg-container">
      <div className="vg-skeleton-hero vg-skeleton-pulse" />
      <div className="vg-skeleton-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="vg-skeleton-card vg-skeleton-pulse" key={index}>
            <div className="vg-skeleton-media" />
            <div className="vg-skeleton-body">
              <div className="vg-skeleton-line short" />
              <div className="vg-skeleton-line long" />
              <div className="vg-skeleton-line medium" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Dynamic Background Slider cho Hero (Hiển thị tĩnh trong 5 giây, sau 5 giây chuyển mượt sang ảnh khác)
function HeroBannerBackground({ banners = [], activeIndex, setActiveIndex }) {
  const safeBanners = Array.isArray(banners) && banners.length > 0 ? banners : [];

  useEffect(() => {
    if (safeBanners.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeBanners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [safeBanners.length, activeIndex, setActiveIndex]);

  if (safeBanners.length === 0) {
    return (
      <div className="vg-hero-bg-slider">
        <div className="vg-hero-bg-item is-active">
          <img
            src="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80"
            alt="ViVuGo Hero Background"
            className="vg-hero-bg-img"
          />
        </div>
        <div className="vg-hero-bg-overlay" />
      </div>
    );
  }

  return (
    <div className="vg-hero-bg-slider">
      {safeBanners.map((banner, index) => {
        const bgUrl = mediaUrl(banner.image_url || banner.image);
        const isActive = index === activeIndex;
        return (
          <div
            key={banner.id || index}
            className={`vg-hero-bg-item ${isActive ? "is-active" : ""}`}
          >
            {bgUrl ? (
              <img
                src={bgUrl}
                alt={banner.title || "Banner ViVuGo"}
                className="vg-hero-bg-img"
              />
            ) : (
              <div className="vg-hero-bg-fallback-color" />
            )}
          </div>
        );
      })}
      <div className="vg-hero-bg-overlay" />
    </div>
  );
}

function HomePage({
  tours = [],
  internationalTours = [],
  discountedTours = [],
  upcomingTours = [],
  banners = [],
  favorites = [],
  homeContent = {},
  loading = false,
  tourLoadError = "",
  onFavorite,
}) {
  const navigate = useNavigate();
  const [heroBannerIndex, setHeroBannerIndex] = useState(0);

  const [search, setSearch] = useState({
    keyword: "",
    departure_date: "",
    guests: 2,
  });

  const safeTours = Array.isArray(tours) ? tours : [];
  const safeInternationalTours = Array.isArray(internationalTours)
    ? internationalTours
    : [];
  const safeDiscountedTours = Array.isArray(discountedTours)
    ? discountedTours
    : [];
  const safeUpcomingTours = Array.isArray(upcomingTours)
    ? upcomingTours
    : [];
  const safeBanners = Array.isArray(banners) ? banners : [];
  const activeBanner = safeBanners[heroBannerIndex] || null;

  const safeFavorites = Array.isArray(favorites) ? favorites : [];
  const safeDestinations = Array.isArray(homeContent.destinations)
    ? homeContent.destinations
    : [];
  const safeCategories = Array.isArray(homeContent.categories)
    ? homeContent.categories
    : [];
  const safeReviews = Array.isArray(homeContent.reviews)
    ? homeContent.reviews
    : [];

  const featuredTourCards = Array.isArray(homeContent.featured_tours)
    ? homeContent.featured_tours
    : safeTours.slice(0, 6);
  const statistics = homeContent.statistics || {};

  const internationalTourCards = safeInternationalTours;

  const destinationCards = safeDestinations
    .map((destination) => ({
      ...destination,
      image: mediaUrl(destination.thumbnail_url || destination.image),
      tours: Number(destination.tour_count) || 0,
    }))
    .filter((destination) => destination.tours > 0)
    .slice(0, 6);

  const visibleCategories = safeCategories
    .map((category) => ({
      ...category,
      image: mediaUrl(category.thumbnail_url || category.image),
      tour_count: Number(category.tour_count) || 0,
    }))
    .filter((category) => category.tour_count > 0)
    .slice(0, 6);

  function submitSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.keyword.trim()) {
      params.set("q", search.keyword.trim());
    }
    if (search.departure_date) {
      params.set("departure_date", search.departure_date);
    }
    if (search.guests) {
      params.set("guests", search.guests);
    }
    navigate(`/tours?${params.toString()}`);
  }

  function handleOpenAiChat() {
    window.dispatchEvent(new CustomEvent("open-vivugo-chatbox"));
  }

  const serviceHighlights = [
    {
      icon: "shield",
      title: "Giá tốt minh bạch",
      description: "Cam kết giá rõ ràng, không phí ẩn, dễ dàng so sánh và lựa chọn.",
    },
    {
      icon: "headset",
      title: "Tư vấn tận tâm",
      description: "Đội ngũ hỗ trợ luôn sẵn sàng theo dõi hành trình và xử lý nhanh.",
    },
    {
      icon: "wallet",
      title: "Thanh toán linh hoạt",
      description: "Đặt cọc dễ, nhiều phương thức thanh toán và chính sách hoàn hủy rõ ràng.",
    },
    {
      icon: "star",
      title: "Tour đã kiểm duyệt",
      description: "Chỉ chọn những hành trình chất lượng, lịch trình rõ ràng và đáng tin cậy.",
    },
  ];

  return (
    <main className="vg-home-page">
      {/* Alert lỗi nếu không tải được dữ liệu */}
      {tourLoadError ? (
        <div className="vg-container vg-data-alert-wrap">
          <div className="vg-data-alert" role="alert">
            <Icon name="alertCircle" size={18} />
            <span>{tourLoadError}</span>
            <button
              type="button"
              className="vg-alert-retry-btn"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          </div>
        </div>
      ) : null}

      {/* Hero Section tích hợp Banner Background Slider */}
      <section className="vg-hero">
        <HeroBannerBackground
          banners={safeBanners}
          activeIndex={heroBannerIndex}
          setActiveIndex={setHeroBannerIndex}
        />

        <div className="vg-container">


          <div className="vg-hero-grid">
            <div className="vg-hero-copy">
              <span className="vg-trust">
                <Icon name="sparkle" size={14} /> Khám phá tour đang mở bán
              </span>
              <h1>
                Khám phá thế giới
                <br />
                cùng{" "}
                <span className="hero-brand">
                  <span className="hero-brand-vivu">ViVu</span>
                  <span className="hero-brand-go">Go</span>
                </span>
              </h1>
              <p>
                Chọn hành trình phù hợp theo điểm đến, loại hình và ngày khởi hành của bạn.
              </p>



              <div className="vg-hero-inline-stats">
                <div className="vg-inline-stat">
                  <div className="vg-stat-icon">
                    <Icon name="globe" size={20} />
                  </div>
                  <div className="vg-stat-info">
                    <strong>{statistics.destinations || destinationCards.length || 0}</strong>
                    <span>Điểm đến đang mở</span>
                  </div>
                </div>
                <div className="vg-inline-stat">
                  <div className="vg-stat-icon">
                    <Icon name="briefcase" size={20} />
                  </div>
                  <div className="vg-stat-info">
                    <strong>{statistics.available_tours || safeTours.length || 0}</strong>
                    <span>Tour đang mở bán</span>
                  </div>
                </div>
                <div className="vg-inline-stat">
                  <div className="vg-stat-icon">
                    <Icon name="users" size={20} />
                  </div>
                  <div className="vg-stat-info">
                    <strong>{statistics.categories || visibleCategories.length || 0}</strong>
                    <span>Loại hình du lịch</span>
                  </div>
                </div>
              </div>
            </div>

            {destinationCards.length > 0 ? (
              <div className="vg-hero-visual" aria-hidden="true">
                <div className="vg-hero-collage">
                  {destinationCards.slice(0, 3).map((destination, index) => (
                    <div
                      className={`vg-collage-card vg-collage-card-${index + 1}`}
                      key={destination.id || index}
                    >
                      <img
                        src={destination.image}
                        alt={destination.name}
                        width="1200"
                        height="800"
                      />
                      <div className="vg-collage-info">
                        <h4>{destination.name}</h4>
                        <span>
                          <Icon name="mapPin" size={12} /> {destination.tours} tour đang mở
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>



          {/* Thanh hiển thị thông tin Banner & Chấm tròn chuyển đổi ở chân Hero */}
          {safeBanners.length > 0 ? (
            <div className="vg-hero-banner-footer">
              {activeBanner?.display_title || activeBanner?.title ? (
                <a
                  href={activeBanner.link_url || "#"}
                  className="vg-hero-active-banner-tag"
                  target={activeBanner.link_url?.startsWith("http") ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                >
                  <Icon name="sparkle" size={14} />
                  <span>{activeBanner.display_title || activeBanner.title}</span>
                  <Icon name="chevronRight" size={12} />
                </a>
              ) : null}

              {safeBanners.length > 1 ? (
                <div className="vg-hero-banner-dots">
                  {safeBanners.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`vg-hero-banner-dot ${index === heroBannerIndex ? "is-active" : ""
                        }`}
                      onClick={() => setHeroBannerIndex(index)}
                      aria-label={`Chuyển đến banner ${index + 1}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* Hiển thị Skeleton Loader khi đang tải */}
      {loading ? <HomeSkeleton /> : null}

      {/* Trạng thái trống (Empty State) nếu không có tour nào */}
      {!loading && safeTours.length === 0 && !tourLoadError ? (
        <section className="vg-home-section">
          <div className="vg-container">
            <div className="vg-empty-state-card">
              <div className="vg-empty-icon">
                <Icon name="globe" size={48} />
              </div>
              <h3>Chưa có tour hiển thị</h3>
              <p>Hiện chưa tìm thấy hành trình phù hợp. Vui lòng quay lại sau hoặc thử lại.</p>
              <Link to="/tours" className="vg-primary-cta">
                Xem tất cả danh mục tour
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 1: Tour Giảm Giá / Hot Deals */}
      {!loading && safeDiscountedTours.length > 0 ? (
        <section className="vg-home-section vg-deals-section" id="tour-giam-gia">
          <div className="vg-container">
            <div className="vg-section-heading">
              <div>
                <span className="vg-kicker is-fire">🔥 Khuyến mãi hot</span>
                <h2>Ưu đãi hấp dẫn hôm nay</h2>
                <p>Các hành trình giảm giá đặc biệt, số lượng chỗ ưu đãi có hạn.</p>
              </div>
              <Link to="/tours?sort=discount">Xem tất cả ưu đãi →</Link>
            </div>
            <div className="vg-tour-grid vg-tour-grid-wide">
              {safeDiscountedTours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  favorite={safeFavorites.includes(tour.id)}
                  onFavorite={onFavorite}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 2: Tour Nổi Bật (Trong nước) */}
      {!loading && featuredTourCards.length > 0 ? (
        <section className="vg-home-section" id="tour-trong-nuoc">
          <div className="vg-container">
            <div className="vg-section-heading">
              <div>
                <span className="vg-kicker">Tour nổi bật</span>
                <h2>Hành trình được khách hàng quan tâm</h2>
                <p>Dựa trên đánh giá, số lượt đặt và ngày khởi hành còn chỗ.</p>
              </div>
              <Link to="/tours">Xem tất cả →</Link>
            </div>
            <div className="vg-tour-grid vg-tour-grid-wide">
              {featuredTourCards.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  favorite={safeFavorites.includes(tour.id)}
                  onFavorite={onFavorite}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 3: Tour Sắp Khởi Hành (ngày khởi hành gần nhất, badge tĩnh trên card) */}
      {!loading && safeUpcomingTours.length > 0 ? (
        <section className="vg-home-section vg-home-section-alt" id="tour-sap-khoi-hanh">
          <div className="vg-container">
            <div className="vg-section-heading">
              <div>
                <span className="vg-kicker">Chuyến đi sắp tới</span>
                <h2>Tour sắp khởi hành</h2>
                <p>Những hành trình có ngày khởi hành gần nhất — giữ chỗ ngay kẻo lỡ.</p>
              </div>
              <Link to="/tours?sort=departure_soon">Xem danh sách →</Link>
            </div>
            <div className="vg-tour-grid vg-tour-grid-wide">
              {safeUpcomingTours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  favorite={safeFavorites.includes(tour.id)}
                  onFavorite={onFavorite}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 4: Tour Quốc Tế */}
      {!loading && internationalTourCards.length > 0 ? (
        <section className="vg-home-section" id="tour-quoc-te">
          <div className="vg-container">
            <div className="vg-section-heading">
              <div>
                <span className="vg-kicker">Khám phá</span>
                <h2>Tour quốc tế</h2>
                <p>Gợi ý các hành trình nổi bật với trải nghiệm đa dạng và giá cạnh tranh.</p>
              </div>
              <Link to="/tours?scope=international">Xem tất cả →</Link>
            </div>
            <div className="vg-tour-grid vg-tour-grid-wide">
              {internationalTourCards.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  favorite={safeFavorites.includes(tour.id)}
                  onFavorite={onFavorite}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 5: Loại hình du lịch phổ biến (Categories Grid) */}
      {!loading && visibleCategories.length > 0 ? (
        <section className="vg-home-section vg-home-section-alt" id="loai-hinh-du-lich">
          <div className="vg-container">
            <div className="vg-centered-heading">
              <span className="vg-kicker">Loại hình</span>
              <h2>Những loại hình du lịch phổ biến</h2>
              <p>Lựa chọn phong cách chuyến đi phù hợp nhất với trải nghiệm của bạn.</p>
            </div>
            <div className="vg-destination-grid vg-destination-grid-home">
              {visibleCategories.map((category) => (
                <Link
                  to={`/tours?category_id=${category.id}`}
                  className="vg-destination-card vg-category-card"
                  key={category.id}
                >
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      width="1200"
                      height="800"
                    />
                  ) : (
                    <div className="vg-category-fallback-img">
                      <Icon name="briefcase" size={32} />
                    </div>
                  )}
                  <div>
                    <h3>{category.name}</h3>
                    <span>{category.tour_count} tour đang mở</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 6: Điểm đến đang có tour mở bán (Destinations Grid) */}
      {!loading && destinationCards.length > 0 ? (
        <section className="vg-home-section" id="diem-den-hot">
          <div className="vg-container">
            <div className="vg-centered-heading">
              <span className="vg-kicker">Điểm đến</span>
              <h2>Những điểm đến đang có tour mở bán</h2>
              <p>Danh sách các điểm đến ưa thích hàng đầu được tổng hợp từ dữ liệu hệ thống.</p>
            </div>
            <div className="vg-destination-grid vg-destination-grid-home">
              {destinationCards.map((destination) => (
                <Link
                  to={`/tours?destination_id=${destination.id}`}
                  className="vg-destination-card"
                  key={destination.id || destination.name}
                >
                  <img
                    src={destination.image}
                    alt={destination.name}
                    width="1200"
                    height="800"
                  />
                  <div>
                    <h3>{destination.name}</h3>
                    <span>{destination.tours} tour đang mở</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 7: Đánh giá thực tế của khách hàng (Reviews Section) */}
      {!loading && safeReviews.length > 0 ? (
        <section className="vg-home-section vg-reviews-section vg-home-section-alt" id="danh-gia">
          <div className="vg-container">
            <div className="vg-centered-heading">
              <span className="vg-kicker">Đánh giá thực tế</span>
              <h2>Khách hàng nói gì về ViVuGo?</h2>
              <p>Cảm nhận chân thực từ những du khách đã tham gia hành trình.</p>
            </div>
            <div className="vg-review-grid">
              {safeReviews.map((review) => (
                <article className="vg-review-card" key={review.id}>
                  <div className="vg-review-quote">“</div>
                  <p>{review.comment}</p>
                  <div className="vg-review-meta">
                    <div>
                      <strong>{Number(review.rating).toFixed(1)}</strong>
                      <span className="vg-stars">★★★★★</span>
                    </div>
                    {review.tour_title ? (
                      <small className="vg-review-tour-name">{review.tour_title}</small>
                    ) : null}
                  </div>
                  <div className="vg-review-person">
                    <div className="vg-review-avatar" aria-hidden="true">
                      {(review.reviewer_name || "K").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{review.reviewer_name || "Khách hàng ViVuGo"}</strong>
                      <span className="vg-verified-badge">
                        <Icon name="shield" size={12} /> Đánh giá đã xác thực
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 8: Về chúng tôi & Highlight dịch vụ */}
      <section className="vg-home-section" id="gioi-thieu">
        <div className="vg-container">
          <div className="vg-centered-heading">
            <span className="vg-kicker">Về chúng tôi</span>
            <h2>Lên kế hoạch nhẹ nhàng, đi chơi trọn vẹn</h2>
            <p>
              ViVuGo tập trung vào hành trình rõ ràng, dịch vụ dễ hiểu và hỗ hỗ trợ sát sao trước - trong - sau chuyến đi.
            </p>
          </div>
          <div className="vg-about-strip">
            <article>
              <Icon name="sparkle" size={22} />
              <div>
                <strong>Trải nghiệm đã được chọn lọc</strong>
                <span>Từ tour trong nước đến quốc tế, mọi lịch trình đều được cập nhật từ API và kiểm duyệt nội dung trước khi hiển thị.</span>
              </div>
            </article>
            <article>
              <Icon name="headset" size={22} />
              <div>
                <strong>Khách hàng là trung tâm</strong>
                <span>Chúng tôi lắng nghe phản hồi thực tế để cải thiện chất lượng dịch vụ và chăm sóc từng chuyến đi.</span>
              </div>
            </article>
          </div>
          <div className="vg-benefit-grid vg-benefit-grid-home">
            {serviceHighlights.map((item) => (
              <article key={item.title}>
                <span>
                  <Icon name={item.icon} size={26} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
