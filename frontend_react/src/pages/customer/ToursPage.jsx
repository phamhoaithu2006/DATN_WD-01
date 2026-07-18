import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import { useLocale } from "../../contexts/LocaleContext";

const demoCurrencyScale = 25000;

function toDisplayAmount(amount, currency) {
  const value = Number(amount || 0);
  if (currency === "VND" && value > 0 && value < 100000) {
    return value * demoCurrencyScale;
  }
  return value;
}

function ToursPage({ tours = [], favorites = [], loadError = "", onFavorite }) {
  const location = useLocation();
  const { currency, formatCurrency } = useLocale();
  const params = new URLSearchParams(location.search);
  const [query, setQuery] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "Tất cả");
  const [maxPrice, setMaxPrice] = useState(currency === "USD" ? 3000 : 70000000);
  const [minPrice] = useState(currency === "USD" ? 0 : 5000000);
  const visibleTours = useMemo(
    () =>
      tours.filter((tour) => {
        const text =
          `${tour.title} ${tour.destination} ${tour.category}`.toLowerCase();
        const price = toDisplayAmount(
          tour.price?.discount || tour.price?.base || 0,
          currency,
        );
        return (
          text.includes(query.toLowerCase()) &&
          (category === "Tất cả" || tour.category === category) &&
          price >= minPrice &&
          price <= maxPrice
        );
      }),
    [category, currency, maxPrice, minPrice, query, tours],
  );

  const priceStep = currency === "USD" ? 50 : 1000000;
  const priceMin = currency === "USD" ? 0 : 5000000;
  const priceMax = currency === "USD" ? 3000 : 70000000;

  return (
    <main className="vg-listing-page">
      <section className="vg-listing-hero">
        <div className="vg-container">
          <span>KHÁM PHÁ CÙNG VIVUGO</span>
          <h1>Tìm tour phù hợp với bạn</h1>
          <p>
            Chọn hành trình, thời gian và ngân sách — phần còn lại để ViVuGo lo.
          </p>
          <label>
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tour hoặc điểm đến..."
            />
          </label>
        </div>
      </section>
      {loadError ? (
        <div className="vg-container">
          <div className="vg-data-alert" role="alert">
            Không thể tải danh sách tour lúc này. Vui lòng thử lại sau.
          </div>
        </div>
      ) : null}
      <section className="vg-container vg-listing-layout">
        <aside className="vg-filter">
          <h2>Bộ lọc</h2>
          <h3>Loại hình</h3>
          {[
            "Tất cả",
            "Biển đảo",
            "Phiêu lưu",
            "Văn hóa",
            "Nghỉ dưỡng",
            "Cao cấp",
          ].map((item) => (
            <button
              className={category === item ? "active" : ""}
              key={item}
              type="button"
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
          <h3>Ngân sách tối đa</h3>
          <input
            type="range"
            min={priceMin}
            max={priceMax}
            step={priceStep}
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
          />
          <div>
            <span>{formatCurrency(priceMin)}</span>
            <strong>{formatCurrency(maxPrice)}</strong>
          </div>
        </aside>
        <div>
          <div className="vg-results">
            <h2>
              {loadError
                ? "Danh sách tour tạm thời chưa sẵn sàng"
                : `${visibleTours.length} tour phù hợp`}
            </h2>
            <select aria-label="Sắp xếp">
              <option>Đề xuất cho bạn</option>
              <option>Giá thấp đến cao</option>
              <option>Đánh giá cao nhất</option>
            </select>
          </div>
          <div className="vg-tour-grid">
            {visibleTours.map((tour) => (
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
    </main>
  );
}

export default ToursPage;
