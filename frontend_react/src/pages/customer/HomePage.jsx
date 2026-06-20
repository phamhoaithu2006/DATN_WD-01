import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import { demoDestinations } from "../../data/customerDemoData";

function HomePage({ tours, favorites, onFavorite }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState({
    keyword: "",
    start_date: "",
    guests: 2,
  });

  function submitSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.keyword) params.set("q", search.keyword);
    if (search.start_date) params.set("date", search.start_date);
    if (search.guests) params.set("guests", search.guests);
    navigate(`/tours?${params}`);
  }

  return (
    <>
      <section className="vg-hero">
        <div className="vg-container vg-hero-content">
          <span className="vg-trust">★ Được hơn 50.000 du khách tin tưởng</span>
          <h1>
            Khám phá hành trình
            <br />
            <em>tuyệt vời tiếp theo</em>
          </h1>
          <p>
            Khám phá những điểm đến ngoạn mục, đặt tour dễ dàng và tạo nên những
            kỷ niệm không thể nào quên cùng ViVuGo.
          </p>
          <form className="vg-search-box" onSubmit={submitSearch}>
            <label>
              <span>
                <Icon name="map" size={18} /> Điểm đến
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
                <Icon name="calendar" size={18} /> Ngày khởi hành
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
                <Icon name="users" size={18} /> Số khách
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
              <Icon name="search" /> Tìm kiếm
            </button>
          </form>
          <div className="vg-quick-categories">
            {["Vé máy bay", "Khách sạn", "Biển đảo", "Phiêu lưu"].map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    navigate(`/tours?q=${encodeURIComponent(item)}`)
                  }
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <div className="vg-stats">
            <div>
              <b>50K+</b>
              <span>Du khách hài lòng</span>
            </div>
            <div>
              <b>200+</b>
              <span>Gói tour hấp dẫn</span>
            </div>
            <div>
              <b>50+</b>
              <span>Điểm đến</span>
            </div>
            <div>
              <b>4.9</b>
              <span>Điểm đánh giá</span>
            </div>
          </div>
        </div>
      </section>
      <section className="vg-section vg-container">
        <div className="vg-section-heading">
          <div>
            <span>HÀNH TRÌNH NỔI BẬT</span>
            <h2>Tour được yêu thích nhất</h2>
            <p>
              Những hành trình được tuyển chọn dành riêng cho kỳ nghỉ của bạn.
            </p>
          </div>
          <Link to="/tours">Xem tất cả tour →</Link>
        </div>
        <div className="vg-tour-grid">
          {tours.slice(0, 3).map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              favorite={favorites.includes(tour.id)}
              onFavorite={onFavorite}
            />
          ))}
        </div>
      </section>
      <section className="vg-destination-section">
        <div className="vg-container">
          <div className="vg-centered-heading">
            <span>KHÁM PHÁ THẾ GIỚI</span>
            <h2>Điểm đến phổ biến</h2>
            <p>Đến những nơi được du khách ViVuGo yêu thích nhất.</p>
          </div>
          <div className="vg-destination-grid">
            {demoDestinations.map((destination) => (
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
      <section className="vg-benefits">
        <div className="vg-container vg-benefit-grid">
          {[
            [
              "shield",
              "Giá tốt nhất",
              "Cam kết mức giá cạnh tranh và minh bạch.",
            ],
            [
              "headset",
              "Hỗ trợ 24/7",
              "Luôn sẵn sàng đồng hành trong mọi chuyến đi.",
            ],
            [
              "wallet",
              "Thanh toán linh hoạt",
              "Nhiều phương thức an toàn và tiện lợi.",
            ],
            [
              "star",
              "Tour đã xác thực",
              "Đối tác uy tín, chất lượng được kiểm duyệt.",
            ],
          ].map(([icon, title, description]) => (
            <article key={title}>
              <span>
                <Icon name={icon} size={26} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default HomePage;
