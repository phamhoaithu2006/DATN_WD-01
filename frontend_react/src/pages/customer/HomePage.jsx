import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import { demoDestinations, demoTours } from "../../data/customerDemoData";

function HomePage({ tours, favorites, onFavorite }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState({
    keyword: "",
    start_date: "",
    guests: 2,
  });

  const domesticTours = (tours?.length ? tours : demoTours).slice(0, 4);
  const internationalTours = demoTours.slice(0, 4);
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
        <div className="vg-container vg-hero-grid">
          <div className="vg-hero-copy">
            <span className="vg-trust">
              <Icon name="sparkle" size={16} /> Ưu đãi hè 2026 - Giảm đến 30%
            </span>
            <h1>
              Khám phá thế giới
              <br />
              cùng <span>ViVuGo</span>
            </h1>
            <p>
              200+ tour trong nước & quốc tế với giá tốt nhất, dịch vụ tận tâm
              và đội ngũ hướng dẫn viên chuyên nghiệp.
            </p>

            <div className="vg-hero-actions">
              <Link className="vg-primary-cta" to="/tours">
                <Icon name="map" size={18} /> Tour trong nước
              </Link>
              <Link className="vg-secondary-cta" to="/deals">
                <Icon name="globe" size={18} /> Tour quốc tế
              </Link>
            </div>

            <form className="vg-search-panel" onSubmit={submitSearch}>
              <label>
                <span>
                  <Icon name="search" size={16} /> Điểm đến
                </span>
                <input
                  value={search.keyword}
                  onChange={(event) =>
                    setSearch({ ...search, keyword: event.target.value })
                  }
                  placeholder="Tìm điểm đến hoặc tên tour"
                />
              </label>
              <label>
                <span>
                  <Icon name="calendar" size={16} /> Ngày khởi hành
                </span>
                <input
                  type="date"
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
                />
              </label>
              <button type="submit">
                <Icon name="search" size={18} /> Tìm tour
              </button>
            </form>
          </div>

          <div className="vg-hero-visual" aria-hidden="true">
            <article className="vg-hero-card vg-hero-card-main">
              <div className="vg-hero-card-top">
                <span>ViVuGo Select</span>
                <strong>Top trải nghiệm hè</strong>
              </div>
              <img
                src={destinationCards[0]?.image}
                alt=""
              />
              <div className="vg-hero-card-bottom">
                <div>
                  <b>{destinationCards[1]?.name || "Vietnam"}</b>
                  <span>{destinationCards[1]?.tours || 36} tour đang mở</span>
                </div>
                <div className="vg-mini-rating">
                  <Icon name="star" size={16} /> 4.8
                </div>
              </div>
            </article>

            <div className="vg-hero-card vg-hero-card-side">
              <span>Đặt tour siêu nhanh</span>
              <strong>Chọn ngày, chọn chỗ, đi ngay</strong>
              <p>
                Bộ lọc thông minh giúp tìm ra chuyến đi phù hợp chỉ trong vài giây.
              </p>
            </div>

            <div className="vg-hero-card vg-hero-card-float">
              <Icon name="globe" size={20} />
              <div>
                <strong>50+ điểm đến</strong>
                <span>Khắp Việt Nam và Đông Nam Á</span>
              </div>
            </div>
          </div>
        </div>

        <div className="vg-container vg-hero-stats">
          {stats.map((item) => (
            <div key={item.label}>
              <b>{item.value}</b>
              <span>{item.label}</span>
            </div>
          ))}
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
            {domesticTours.map((tour) => (
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
            {internationalTours.map((tour) => (
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
            <span className="vg-kicker">Vì sao chọn ViVuGo</span>
            <h2>Lên kế hoạch nhẹ nhàng, đi chơi trọn vẹn</h2>
            <p>
              Mọi chi tiết từ tư vấn, thanh toán đến chăm sóc sau chuyến đi đều được chuẩn hóa.
            </p>
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

      <section className="vg-home-section vg-reviews-section">
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
