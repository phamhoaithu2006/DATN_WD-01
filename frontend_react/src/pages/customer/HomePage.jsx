import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import { demoDestinations } from "../../data/customerDemoData";

function HomePage({ tours, favorites, onFavorite }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const quickCategories = [
    t("home.quickCategories.flights"),
    t("home.quickCategories.hotels"),
    t("home.quickCategories.beach"),
    t("home.quickCategories.adventure"),
  ]

  const benefits = [
    [
      "shield",
      t("home.benefits.bestPrice.title"),
      t("home.benefits.bestPrice.description"),
    ],
    [
      "headset",
      t("home.benefits.support247.title"),
      t("home.benefits.support247.description"),
    ],
    [
      "wallet",
      t("home.benefits.flexiblePayment.title"),
      t("home.benefits.flexiblePayment.description"),
    ],
    [
      "star",
      t("home.benefits.verifiedTours.title"),
      t("home.benefits.verifiedTours.description"),
    ],
  ]

  return (
    <>
      <section className="vg-hero">
        <div className="vg-container vg-hero-content">
          <span className="vg-trust">{t("home.trustBadge")}</span>
          <h1>
            {t("home.heroTitleLine1")}
            <br />
            <em>{t("home.heroTitleHighlight")}</em>
          </h1>
          <p>{t("home.heroSubtitle")}</p>
          <form className="vg-search-box" onSubmit={submitSearch}>
            <label>
              <span>
                <Icon name="map" size={18} /> {t("home.searchDestination")}
              </span>
              <input
                value={search.keyword}
                onChange={(event) =>
                  setSearch({ ...search, keyword: event.target.value })
                }
                placeholder={t("home.searchDestinationPlaceholder")}
              />
            </label>
            <label>
              <span>
                <Icon name="calendar" size={18} /> {t("home.searchTravelDate")}
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
                <Icon name="users" size={18} /> {t("home.searchGuests")}
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
              <Icon name="search" /> {t("home.searchButton")}
            </button>
          </form>
          <div className="vg-quick-categories">
            {quickCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => navigate(`/tours?q=${encodeURIComponent(item)}`)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="vg-stats">
            <div>
              <b>50K+</b>
              <span>{t("home.stats.happyTravelers")}</span>
            </div>
            <div>
              <b>200+</b>
              <span>{t("home.stats.tourPackages")}</span>
            </div>
            <div>
              <b>50+</b>
              <span>{t("home.stats.destinations")}</span>
            </div>
            <div>
              <b>4.9</b>
              <span>{t("home.stats.averageRating")}</span>
            </div>
          </div>
        </div>
      </section>
      <section className="vg-section vg-container">
        <div className="vg-section-heading">
          <div>
            <span>{t("home.featuredSectionLabel")}</span>
            <h2>{t("home.featuredSectionTitle")}</h2>
            <p>{t("home.featuredSectionSubtitle")}</p>
          </div>
          <Link to="/tours">{t("home.viewAllTours")}</Link>
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
            <span>{t("home.destinationsSectionLabel")}</span>
            <h2>{t("home.destinationsSectionTitle")}</h2>
            <p>{t("home.destinationsSectionSubtitle")}</p>
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
                  <span>{t("home.toursOpen", { count: destination.tours })}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="vg-benefits">
        <div className="vg-container">
          <div className="vg-centered-heading">
            <span>{t("home.benefitsSectionLabel")}</span>
            <h2>{t("home.benefitsSectionTitle")}</h2>
            <p>{t("home.benefitsSectionSubtitle")}</p>
          </div>
          <div className="vg-benefit-grid">
            {benefits.map(([icon, title, description]) => (
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
        </div>
      </section>
    </>
  );
}

export default HomePage;
