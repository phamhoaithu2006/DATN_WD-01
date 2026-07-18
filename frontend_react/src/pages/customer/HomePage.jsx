import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";

function HomePage({
  tours = [],
  internationalTours = [],
  favorites = [],
  homeContent = {},
  tourLoadError = "",
  onFavorite,
}) {
  const navigate = useNavigate();

  const [search, setSearch] = useState({
    keyword: "",
    departure_date: "",
    guests: 2,
  });

  const safeTours = Array.isArray(tours) ? tours : [];
  const safeInternationalTours = Array.isArray(internationalTours)
    ? internationalTours
    : [];
  const safeFavorites = Array.isArray(favorites) ? favorites : [];
  const safeDestinations = Array.isArray(homeContent.destinations)
    ? homeContent.destinations
    : [];
  const featuredTourCards = Array.isArray(homeContent.featured_tours)
    ? homeContent.featured_tours
    : safeTours.slice(0, 6);
  const statistics = homeContent.statistics || {};

  /*
   * Không dùng slice(0, 4): trang chủ sẽ hiển thị toàn bộ tour
   * mà CustomerPage truyền vào.
   */
  const internationalTourCards = safeInternationalTours;

  const destinationCards = safeDestinations
    .map((destination) => ({
      ...destination,
      image: destination.thumbnail_url,
      tours: Number(destination.tour_count) || 0,
    }))
    .filter((destination) => destination.tours > 0)
    .slice(0, 5);

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
      {tourLoadError ? (
        <div className="vg-container vg-data-alert-wrap">
          <div className="vg-data-alert" role="alert">
            {tourLoadError}
          </div>
        </div>
      ) : null}
      <section className="vg-hero">
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
                  <span className="hero-brand-vivu">ViVu</span><span className="hero-brand-go">Go</span>
                </span>
              </h1>
              <p>
                Chọn hành trình phù hợp theo điểm đến, loại hình và ngày khởi hành của bạn.
              </p>

              <div className="vg-hero-actions">
                <Link className="vg-primary-cta" to="/tours">
                  Tour trong nước <Icon name="chevronRight" size={14} />
                </Link>
                <Link className="vg-secondary-cta" to="/tours">
                  Tour quốc tế <Icon name="chevronRight" size={14} />
                </Link>
              </div>

              <div className="vg-hero-inline-stats">
                <div className="vg-inline-stat">
                  <div className="vg-stat-icon">
                    <Icon name="globe" size={20} />
                  </div>
                  <div className="vg-stat-info">
                    <strong>{statistics.destinations || 0}</strong>
                    <span>Điểm đến đang mở</span>
                  </div>
                </div>
                <div className="vg-inline-stat">
                  <div className="vg-stat-icon">
                    <Icon name="briefcase" size={20} />
                  </div>
                  <div className="vg-stat-info">
                    <strong>{statistics.available_tours || 0}</strong>
                    <span>Tour đang mở bán</span>
                  </div>
                </div>
                <div className="vg-inline-stat">
                  <div className="vg-stat-icon">
                    <Icon name="users" size={20} />
                  </div>
                  <div className="vg-stat-info">
                    <strong>{statistics.categories || 0}</strong>
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
                      key={destination.id}
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

          <form className="vg-search-panel" onSubmit={submitSearch}>
            <label>
              <span>
                <Icon name="mapPin" size={16} /> Điểm đến
              </span>
              <input
                value={search.keyword}
                onChange={(event) =>
                  setSearch({ ...search, keyword: event.target.value })
                }
                placeholder="Bạn muốn đi đâu?"
              />
            </label>
            <label>
              <span>
                <Icon name="calendar" size={16} /> Ngày khởi hành
              </span>
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={search.departure_date}
                onChange={(event) =>
                  setSearch({ ...search, departure_date: event.target.value })
                }
              />
            </label>
            <label>
              <span>
                <Icon name="users" size={16} /> Số khách
              </span>
              <input
                type="number"
                min="1"
                value={search.guests}
                onChange={(event) =>
                  setSearch({ ...search, guests: event.target.value })
                }
                placeholder="Số khách"
              />
            </label>
            <button type="submit">
              <Icon name="search" size={18} /> Tìm tour
            </button>
          </form>
        </div>
      </section>

      {featuredTourCards.length > 0 ? (
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

      {internationalTourCards.length > 0 ? (
        <section className="vg-home-section vg-home-section-alt" id="tour-quoc-te">
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

      <section className="vg-home-section" id="gioi-thieu">
        <div className="vg-container">
          <div className="vg-centered-heading">
            <span className="vg-kicker">Về chúng tôi</span>
            <h2>Lên kế hoạch nhẹ nhàng, đi chơi trọn vẹn</h2>
            <p>
              ViVuGo tập trung vào hành trình rõ ràng, dịch vụ dễ hiểu và hỗ trợ sát sao trước - trong - sau chuyến đi.
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

      {/* Supplementary home sections intentionally removed. */}
      {/*
      {visibleCategories.length > 0 ? (
        <section className="vg-home-section vg-home-section-alt">
          <div className="vg-container">
            <div className="vg-centered-heading">
              <span className="vg-kicker">Loại hình</span>
              <h2>Những loại hình du lịch phổ biến</h2>
              <p>Danh sách các loại hình tour hiện có trên hệ thống.</p>
            </div>
            <div className="vg-destination-grid vg-destination-grid-home">
              {visibleCategories.map((category) => (
                <Link
                  to={`/tours?category_id=${category.id}`}
                  className="vg-destination-card"
                  key={category.id}
                >
                  <img
                    src={category.thumbnail_url}
                    alt={category.name}
                    width="1200"
                    height="800"
                  />
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

      {destinationCards.length > 0 ? (
        <section className="vg-home-section vg-home-section-alt">
          <div className="vg-container">
            <div className="vg-centered-heading">
              <span className="vg-kicker">Điểm đến</span>
              <h2>Những điểm đến đang có tour mở bán</h2>
              <p>Danh sách này được tổng hợp từ dữ liệu tour hiện có trên hệ thống.</p>
            </div>
            <div className="vg-destination-grid vg-destination-grid-home">
              {destinationCards.map((destination) => (
                <Link
                  to={`/tours?destination_id=${destination.id}`}
                  className="vg-destination-card"
                  key={destination.name}
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

      {reviews.length > 0 ? (
        <section className="vg-home-section vg-reviews-section" id="danh-gia">
          <div className="vg-container">
            <div className="vg-centered-heading">
              <span className="vg-kicker">Đánh giá thực tế</span>
              <h2>Khách hàng nói gì về ViVuGo?</h2>
            </div>
            <div className="vg-review-grid">
              {reviews.map((review) => (
                <article className="vg-review-card" key={review.id}>
                  <div className="vg-review-quote">“</div>
                  <p>{review.comment}</p>
                  <div className="vg-review-meta">
                    <div>
                      <strong>{Number(review.rating).toFixed(1)}</strong>
                      <span>★★★★★</span>
                    </div>
                    <small>{review.tour_title}</small>
                  </div>
                  <div className="vg-review-person">
                    <div className="vg-review-avatar" aria-hidden="true">
                      {review.reviewer_name.charAt(0)}
                    </div>
                    <div>
                      <strong>{review.reviewer_name}</strong>
                      <span>Đánh giá đã xác thực</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      */}
    </main>
  );
}

export default HomePage;
