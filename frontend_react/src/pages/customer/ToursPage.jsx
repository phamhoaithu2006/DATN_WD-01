import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function ToursPage({ tours, favorites, onFavorite }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [query, setQuery] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "Tất cả");
  const [maxPrice, setMaxPrice] = useState(70000000);
  const visibleTours = useMemo(
    () =>
      tours.filter((tour) => {
        const text =
          `${tour.title} ${tour.destination} ${tour.category}`.toLowerCase();
        const price = Number(tour.price?.discount || tour.price?.base || 0);
        return (
          text.includes(query.toLowerCase()) &&
          (category === "Tất cả" || tour.category === category) &&
          (price < 100000 ? price * 25000 : price) <= maxPrice
        );
      }),
    [category, maxPrice, query, tours],
  );

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
            min="5000000"
            max="70000000"
            step="1000000"
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
          />
          <div>
            <span>5 triệu</span>
            <strong>{money.format(maxPrice)}</strong>
          </div>
        </aside>
        <div>
          <div className="vg-results">
            <h2>{visibleTours.length} tour phù hợp</h2>
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
