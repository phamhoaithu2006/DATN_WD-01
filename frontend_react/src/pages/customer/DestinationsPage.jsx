import { Link } from "react-router-dom";
import { demoDestinations } from "../../data/customerDemoData";

function DestinationsPage() {
  return (
    <main className="vg-destinations-page">
      <div className="vg-container">
        <div className="vg-centered-heading">
          <span>ĐIỂM ĐẾN</span>
          <h1>Thế giới đang chờ bạn</h1>
          <p>Chọn một điểm đến và bắt đầu viết câu chuyện của riêng mình.</p>
        </div>
        <div className="vg-destination-grid vg-destination-large">
          {demoDestinations.map((destination) => (
            <Link
              to={`/tours?q=${destination.name}`}
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
    </main>
  );
}

export default DestinationsPage;
