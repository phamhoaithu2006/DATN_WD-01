import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import { demoDestinations } from "../../data/customerDemoData";

function HomePage({
  tours,
  domesticTours,
  internationalTours,
  favorites,
  onFavorite,
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState({
    keyword: "",
    start_date: "",
    guests: 2,
  });

  const domesticTourCards = (domesticTours?.length ? domesticTours : tours || []).slice(0, 4);
  const internationalTourCards = (internationalTours?.length ? internationalTours : tours || []).slice(0, 4);
  const destinationCards = demoDestinations.slice(0, 5);

  function submitSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.keyword) params.set("q", search.keyword);
    if (search.start_date) params.set("date", search.start_date);
    if (search.guests) params.set("guests", search.guests);
    navigate(`/tours?${params.toString()}`);
  }

  const stats = [
    { value: "200+", label: "Tour" },
    { value: "50.000+", label: "Khách hàng" },
    { value: "4.8★", label: "Đánh giá" },
    { value: "24/7", label: "Hỗ trợ" },
  ];

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

  const reviews = [
    {
      quote:
        "Dịch vụ rất nhanh, tư vấn kỹ và chuẩn lịch trình. Cả đoàn đi Đà Nẵng đều hài lòng.",
      tour: "Tour Đà Nẵng - Hội An",
      name: "Nguyễn Thị Lan",
      city: "TP. Hồ Chí Minh",
      rating: "5.0",
    },
    {
      quote:
        "Đặt tour Nhật Bản siêu tiện, từ visa đến vé máy bay đều được hỗ trợ chu đáo.",
      tour: "Tour Nhật Bản 6N5Đ",
      name: "Trần Minh Khoa",
      city: "Hà Nội",
      rating: "5.0",
    },
    {
      quote:
        "Villa ở Bali đẹp và riêng tư, lịch trình hợp lý nên gia đình mình rất thoải mái.",
      tour: "Tour Bali 5N4Đ",
      name: "Phạm Thu Hà",
      city: "Đà Nẵng",
      rating: "5.0",
    },
    {
      quote:
        "Biển Phú Quốc đẹp, phòng ốc sạch sẽ và đội ngũ chăm sóc khách hàng phản hồi rất nhanh.",
      tour: "Tour Phú Quốc 5N4Đ",
      name: "Lê Hoàng Nam",
      city: "Cần Thơ",
      rating: "5.0",
    },
  ];

  return (
    <main className="vg-home-page">
      <section className="vg-hero">
        <div className="vg-container">
          <div className="vg-hero-grid">
            <div className="vg-hero-copy">
              <span className="vg-trust">
                <Icon name="sparkle" size={14} /> Ưu đãi hè 2026 • Giảm đến 30%
              </span>
              <h1>
                Khám phá thế giới
                <br />
                cùng <span>ViVuGo</span>
              </h1>
              <p>
                Hơn 200+ tour trong nước & quốc tế với giá tốt nhất,
                dịch vụ tận tâm và đội ngũ hướng dẫn viên chuyên nghiệp.
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
                    <strong>50+</strong>
                    <span>Điểm đến toàn cầu</span>
                  </div>
                </div>
                <div className="vg-inline-stat">
                  <div className="vg-stat-icon">
                    <Icon name="briefcase" size={20} />
                  </div>
                  <div className="vg-stat-info">
                    <strong>200+</strong>
                    <span>Hành trình tuyển chọn</span>
                  </div>
                </div>
                <div className="vg-inline-stat">
                  <div className="vg-stat-icon">
                    <Icon name="users" size={20} />
                  </div>
                  <div className="vg-stat-info">
                    <strong>10.000+</strong>
                    <span>Khách hàng tin tưởng</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="vg-hero-visual" aria-hidden="true">
              <div className="vg-hero-collage">
                {/* Card 1: Vietnam */}
                <div className="vg-collage-card vg-collage-card-1">
                  <div className="vg-card-badge">
                    <Icon name="fire" size={12} /> Hot
                  </div>
                  <img
                    src={destinationCards[0]?.image || "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80"}
                    alt={destinationCards[0]?.name || "Việt Nam"}
                  />
                  <div className="vg-collage-info">
                    <h4>{destinationCards[0]?.name || "Việt Nam"}</h4>
                    <span>
                      <Icon name="mapPin" size={12} /> {destinationCards[0]?.tours || 36} tour đang mở
                    </span>
                  </div>
                </div>

                {/* Card 2: Japan */}
                <div className="vg-collage-card vg-collage-card-2">
                  <img
                    src={destinationCards[1]?.image || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80"}
                    alt={destinationCards[1]?.name || "Nhật Bản"}
                  />
                  <div className="vg-collage-info">
                    <h4>{destinationCards[1]?.name || "Nhật Bản"}</h4>
                    <span>
                      <Icon name="mapPin" size={12} /> {destinationCards[1]?.tours || 28} tour đang mở
                    </span>
                  </div>
                </div>

                {/* Card 3: Maldives */}
                <div className="vg-collage-card vg-collage-card-3">
                  <img
                    src={destinationCards[4]?.image || "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80"}
                    alt={destinationCards[4]?.name || "Maldives"}
                  />
                  <div className="vg-collage-info">
                    <h4>{destinationCards[4]?.name || "Maldives"}</h4>
                    <span>
                      <Icon name="mapPin" size={12} /> {destinationCards[4]?.tours || 18} tour đang mở
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
                type="text"
                placeholder="Chọn ngày đi"
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => (e.target.type = "text")}
                value={search.start_date}
                onChange={(event) =>
                  setSearch({ ...search, start_date: event.target.value })
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

      <section className="vg-home-section" id="tour-trong-nuoc">
        <div className="vg-container">
          <div className="vg-section-heading">
            <div>
              <span className="vg-kicker">Tour nổi bật</span>
              <h2>Tour trong nước</h2>
              <p>Những hành trình được chọn lọc cho kỳ nghỉ ngắn ngày và cuối tuần.</p>
            </div>
            <Link to="/tours">Xem tất cả →</Link>
          </div>
          <div className="vg-tour-grid vg-tour-grid-wide">
            {domesticTourCards.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                favorite={favorites.includes(tour.id)}
                onFavorite={onFavorite}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="vg-home-section vg-home-section-alt" id="tour-quoc-te">
        <div className="vg-container">
          <div className="vg-section-heading">
            <div>
              <span className="vg-kicker">Khám phá</span>
              <h2>Tour quốc tế</h2>
              <p>Gợi ý các hành trình nổi bật với trải nghiệm đa dạng và giá cạnh tranh.</p>
            </div>
            <Link to="/deals">Xem tất cả →</Link>
          </div>
          <div className="vg-tour-grid vg-tour-grid-wide">
            {internationalTourCards.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                favorite={favorites.includes(tour.id)}
                onFavorite={onFavorite}
              />
            ))}
          </div>
        </div>
      </section>

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

      <section className="vg-home-section vg-home-section-alt">
        <div className="vg-container">
          <div className="vg-centered-heading">
            <span className="vg-kicker">Điểm đến</span>
            <h2>Khám phá các vùng đất được yêu thích</h2>
            <p>Những cái tên nổi bật đang được đặt nhiều trong mùa du lịch này.</p>
          </div>
          <div className="vg-destination-grid vg-destination-grid-home">
            {destinationCards.map((destination) => (
              <Link
                to={`/tours?q=${encodeURIComponent(destination.name)}`}
                className="vg-destination-card"
                key={destination.name}
              >
                <img src={destination.image} alt={destination.name} />
                <div>
                  <h3>{destination.name}</h3>
                  <span>{destination.tours} tour đang mở</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="vg-home-section vg-reviews-section" id="danh-gia">
        <div className="vg-container">
          <div className="vg-centered-heading">
            <span className="vg-kicker">Đánh giá thực tế</span>
            <h2>Khách hàng nói gì về ViVuGo?</h2>
          </div>
          <div className="vg-review-grid">
            {reviews.map((review) => (
              <article className="vg-review-card" key={review.name}>
                <div className="vg-review-quote">“</div>
                <p>{review.quote}</p>
                <div className="vg-review-meta">
                  <div>
                    <strong>{review.rating}</strong>
                    <span>★★★★★</span>
                  </div>
                  <small>{review.tour}</small>
                </div>
                <div className="vg-review-person">
                  <div className="vg-review-avatar" aria-hidden="true">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.city}</span>
                  </div>
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
