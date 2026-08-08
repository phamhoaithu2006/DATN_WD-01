import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
import Icon from "../../components/customer/Icon";
import TourCard from "../../components/customer/TourCard";
import { fetchTourFilterOptions } from "../../services/customerApi";
import { mediaUrl } from "../../utils/mediaUrl";
import { VIETNAM_PROVINCES } from "../../constants/vietnamProvinces";

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

function getEarliestBookableDepartureDate() {
  const earliestDate = new Date();
  earliestDate.setDate(earliestDate.getDate() + 4);
  const year = earliestDate.getFullYear();
  const month = String(earliestDate.getMonth() + 1).padStart(2, "0");
  const day = String(earliestDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Dynamic Background Slider cho Hero.
function HeroBannerBackground({ banners = [], activeIndex, setActiveIndex }) {
  const safeBanners = Array.isArray(banners) && banners.length > 0 ? banners : [];

  useEffect(() => {
    if (safeBanners.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeBanners.length);
    }, 10000);

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

  const currentBanner = safeBanners[activeIndex];

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

      {/* Floating Banner Title Badge */}
      {currentBanner && (currentBanner.title || currentBanner.subtitle) ? (
        <div className="vg-hero-banner-info-badge">
          <span className="vg-banner-tag">
            <Icon name="sparkle" size={12} /> Nổi bật
          </span>
          {currentBanner.title ? <h4>{currentBanner.title}</h4> : null}
          {currentBanner.subtitle ? <p>{currentBanner.subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function CustomHeroDropdown({
  label,
  iconName,
  value,
  onChange,
  options,
  placeholder,
  isInput = false,
  inputValue = "",
  onInputChange = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearchFilter("");
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!options) return [];
    const query = isInput
      ? (inputValue || searchFilter).toLowerCase().trim()
      : searchFilter.toLowerCase().trim();

    if (!query) return options;

    return options.filter((opt) => {
      const text = typeof opt === "string" ? opt : opt.name;
      return text.toLowerCase().includes(query);
    });
  }, [options, isInput, inputValue, searchFilter]);

  const selectedLabel = useMemo(() => {
    if (isInput) return inputValue;
    if (!value) return placeholder;
    const found = options?.find((opt) => (typeof opt === "string" ? opt === value : String(opt.id) === String(value)));
    return found ? (typeof found === "string" ? found : found.name) : placeholder;
  }, [isInput, inputValue, value, options, placeholder]);

  return (
    <div className={`vg-custom-dropdown-container ${isOpen ? "is-open" : ""}`} ref={dropdownRef}>
      <label>
        <Icon name={iconName} size={14} /> {label}
      </label>
      {isInput ? (
        <div className="vg-custom-dropdown-trigger input-trigger" onClick={() => setIsOpen(true)}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              onInputChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
          />
          <Icon name="chevronDown" size={14} className={`vg-dropdown-arrow ${isOpen ? "rotated" : ""}`} />
        </div>
      ) : (
        <button
          type="button"
          className="vg-custom-dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span className={!value ? "is-placeholder" : "is-selected"}>{selectedLabel}</span>
          <Icon name="chevronDown" size={14} className={`vg-dropdown-arrow ${isOpen ? "rotated" : ""}`} />
        </button>
      )}

      {isOpen && (
        <div className="vg-custom-dropdown-popover">
          <div className="vg-dropdown-search-box">
            <Icon name="search" size={14} className="vg-dropdown-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={`Lọc ${label.toLowerCase()}...`}
              onClick={(e) => e.stopPropagation()}
            />
            {searchFilter && (
              <button
                type="button"
                className="vg-dropdown-search-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchFilter("");
                }}
              >
                ✕
              </button>
            )}
          </div>

          <ul className="vg-custom-dropdown-menu">
            {!isInput && placeholder && !searchFilter && (
              <li
                className={`vg-dropdown-item ${!value ? "active" : ""}`}
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
              >
                <span>{placeholder}</span>
                {!value && <Icon name="check" size={14} className="vg-check-icon" />}
              </li>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => {
                const optValue = typeof opt === "string" ? opt : opt.id;
                const optText = typeof opt === "string" ? opt : opt.name;
                const isSelected = isInput
                  ? inputValue.trim().toLowerCase() === optText.toLowerCase()
                  : String(value) === String(optValue);

                return (
                  <li
                    key={typeof opt === "string" ? `${opt}-${index}` : opt.id}
                    className={`vg-dropdown-item ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      if (isInput) {
                        onInputChange(optText);
                      } else {
                        onChange(optValue);
                      }
                      setIsOpen(false);
                    }}
                  >
                    <span>{optText}</span>
                    {isSelected && <Icon name="check" size={14} className="vg-check-icon" />}
                  </li>
                );
              })
            ) : (
              <li className="vg-dropdown-empty">Không tìm thấy kết quả phù hợp</li>
            )}
          </ul>
        </div>
      )}
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
  const [filterOptions, setFilterOptions] = useState(null);
  const [heroSearch, setHeroSearch] = useState({
    q: "",
    departure_location: "",
    destination_id: "",
    departure_date: "",
    category_id: "",
  });
  const earliestDepartureInputValue = getEarliestBookableDepartureDate();

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

  const safeFavorites = Array.isArray(favorites) ? favorites : [];
  const safeCategories = Array.isArray(homeContent.categories)
    ? homeContent.categories
    : [];
  const safeReviews = Array.isArray(homeContent.reviews)
    ? homeContent.reviews
    : [];
  const reviewMarqueeCopies = safeReviews.length > 0 ? 2 : 0;
  const marqueeReviews = Array.from(
    { length: reviewMarqueeCopies },
    () => safeReviews,
  ).flat();
  const featuredTourCards = Array.isArray(homeContent.featured_tours)
    ? homeContent.featured_tours
    : safeTours.slice(0, 6);
  const internationalTourCards = safeInternationalTours;

  const visibleCategories = safeCategories
    .map((category) => ({
      ...category,
      image: mediaUrl(category.thumbnail_url || category.image),
      tour_count: Number(category.tour_count) || 0,
    }))
    .filter((category) => category.tour_count > 0)
    .slice(0, 5);

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

  useEffect(() => {
    let active = true;

    fetchTourFilterOptions()
      .then((options) => {
        if (active) setFilterOptions(options);
      })
      .catch(() => {
        if (active) setFilterOptions(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const departureLocations = Array.from(new Set([
    ...VIETNAM_PROVINCES,
    ...(Array.isArray(filterOptions?.departure_locations)
      ? filterOptions.departure_locations.map((location) => location.name).filter(Boolean)
      : []),
  ])).sort((first, second) => first.localeCompare(second, 'vi'));
  const destinationOptions = Array.isArray(filterOptions?.destinations)
    ? filterOptions.destinations
    : [];
  const categoryOptions = Array.isArray(filterOptions?.categories)
    ? filterOptions.categories
    : [];

  const updateHeroSearch = (field, value) => {
    setHeroSearch((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleHeroSearchSubmit = (event) => {
    event.preventDefault();

    const query = new URLSearchParams();
    const keyword = heroSearch.q?.trim() || "";
    const departureLocation = heroSearch.departure_location.trim();

    if (keyword) query.set("q", keyword);
    if (heroSearch.scope) query.set("scope", heroSearch.scope);
    if (departureLocation) query.set("departure_location", departureLocation);
    if (heroSearch.destination_id) query.append("destinations", heroSearch.destination_id);
    if (heroSearch.departure_date) query.set("departure_date", heroSearch.departure_date);
    if (heroSearch.category_id) query.append("categories", heroSearch.category_id);
    query.set("sort", "departure_soon");

    const search = query.toString();
    navigate(search ? `/tours?${search}` : "/tours");
  };

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
          <div className="vg-hero-content-wrapper">
            {/* Hero Main Heading & Intro */}
            <div className="vg-hero-header-text">
              <h1 className="vg-hero-main-title">
                Khám phá thế giới, <br />
                <span className="vg-text-gradient">nâng tầm trải nghiệm</span>
              </h1>
              <p className="vg-hero-subtitle">
                Hơn một chuyến đi — đó là những khoảnh khắc đáng nhớ của riêng bạn.
              </p>
            </div>

            {/* Seamless Floating Glass Search Card */}
            <div className="vg-hero-search-wrapper">
              <div className="vg-hero-search-card-white">
                <div className="vg-hero-search-tabs">
                  <button
                    type="button"
                    className={`vg-hero-search-tab ${!heroSearch.scope ? "active" : ""}`}
                    onClick={() => updateHeroSearch("scope", "")}
                  >
                    <Icon name="sparkle" size={14} /> Tất cả tour
                  </button>
                  <button
                    type="button"
                    className={`vg-hero-search-tab ${heroSearch.scope === "domestic" ? "active" : ""}`}
                    onClick={() => updateHeroSearch("scope", "domestic")}
                  >
                    Tour trong nước
                  </button>
                  <button
                    type="button"
                    className={`vg-hero-search-tab ${heroSearch.scope === "international" ? "active" : ""}`}
                    onClick={() => updateHeroSearch("scope", "international")}
                  >
                    Tour quốc tế
                  </button>
                </div>

                <form className="vg-hero-search-form" onSubmit={handleHeroSearchSubmit}>
                  <div className="vg-hero-search-grid">
                    {/* Từ khóa / Tên tour */}
                    <div className="vg-hero-field-group">
                      <label htmlFor="hero-keyword-input">
                        <Icon name="search" size={14} /> Tìm kiếm tour
                      </label>
                      <input
                        id="hero-keyword-input"
                        type="search"
                        value={heroSearch.q}
                        onChange={(event) => updateHeroSearch("q", event.target.value)}
                        placeholder="Bạn muốn đi đâu hoặc tìm tour gì?"
                        autoComplete="off"
                      />
                    </div>

                    <div className="vg-search-divider" />

                    {/* Điểm khởi hành */}
                    <CustomHeroDropdown
                      label="Điểm khởi hành"
                      iconName="mapPin"
                      isInput={true}
                      inputValue={heroSearch.departure_location}
                      onInputChange={(val) => updateHeroSearch("departure_location", val)}
                      options={departureLocations}
                      placeholder="Bạn xuất phát từ đâu?"
                    />

                    <div className="vg-search-divider" />

                    {/* Điểm đến */}
                    <CustomHeroDropdown
                      label="Điểm đến"
                      iconName="compass"
                      value={heroSearch.destination_id}
                      onChange={(val) => updateHeroSearch("destination_id", val)}
                      options={destinationOptions}
                      placeholder="Tất cả điểm đến"
                    />

                    <div className="vg-search-divider" />

                    {/* Ngày đi */}
                    <div className="vg-hero-field-group">
                      <label htmlFor="hero-date-input">
                        <Icon name="calendar" size={14} /> Ngày đi
                      </label>
                      <input
                        id="hero-date-input"
                        type="date"
                        value={heroSearch.departure_date}
                        min={earliestDepartureInputValue}
                        onChange={(event) => updateHeroSearch("departure_date", event.target.value)}
                      />
                    </div>

                    <div className="vg-search-divider" />

                    {/* Loại tour */}
                    <CustomHeroDropdown
                      label="Loại tour"
                      iconName="layers"
                      value={heroSearch.category_id}
                      onChange={(val) => updateHeroSearch("category_id", val)}
                      options={categoryOptions}
                      placeholder="Tất cả loại tour"
                    />

                    {/* Submit Button */}
                    <div className="vg-hero-field-group action">
                      <button type="submit" className="vg-hero-search-btn">
                        <Icon name="search" size={18} />
                        <span>Tìm tour</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
              <div className="vg-hero-proof-strip" aria-label="Cam kết dịch vụ ViVuGo">
                <span><Icon name="shield" size={16} /> Thanh toán an toàn</span>
                <span><Icon name="headset" size={16} /> Hỗ trợ tận tâm</span>
                <span><Icon name="star" size={16} /> Hành trình chọn lọc</span>
              </div>
            </div>
          </div>
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
        <section className="vg-home-section vg-deals-section vg-tour-showcase vg-tour-showcase-deals" id="tour-giam-gia">
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
        <section className="vg-home-section vg-tour-showcase vg-tour-showcase-featured" id="tour-trong-nuoc">
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
        <section className="vg-home-section vg-home-section-alt vg-tour-showcase vg-tour-showcase-upcoming" id="tour-sap-khoi-hanh">
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
        <section className="vg-home-section vg-tour-showcase vg-tour-showcase-international" id="tour-quoc-te">
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
        <section className="vg-home-section vg-home-section-alt vg-popular-categories-section" id="loai-hinh-du-lich">
          <div className="vg-container">
            <div className="vg-popular-categories-block">
              <div className="vg-centered-heading">
                <span className="vg-kicker">Loại hình</span>
                <h2>Những loại hình du lịch phổ biến</h2>
                <p>Các danh mục có nhiều tour đang mở nhất để bạn chọn hành trình phù hợp.</p>
              </div>
              <div className="vg-category-masonry-grid">
                {visibleCategories.map((category, index) => (
                  <Link
                    to={`/tours?categories=${category.id}`}
                    className={`vg-masonry-card vg-masonry-item-${index + 1}`}
                    key={category.id}
                  >
                    <div className="vg-category-fallback-img" aria-hidden="true">
                      <Icon name="briefcase" size={28} />
                    </div>
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="vg-masonry-img"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className="vg-masonry-overlay"></div>
                    <div className="vg-masonry-content">
                      <span className="vg-masonry-badge">{category.tour_count} tour đang mở</span>
                      <h3>{category.name}</h3>
                      <span className="vg-masonry-link-text">Khám phá ngay →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}


      {/* Section 7: Đánh giá thực tế của khách hàng (Reviews Section) */}
      {/* Section 7: Đánh giá thực tế của khách hàng (Reviews Section) */}
      {!loading && safeReviews.length > 0 ? (
        <section className="vg-home-section vg-reviews-section vg-home-section-alt" id="danh-gia">
          <div className="vg-reviews-bg-glow" aria-hidden="true"></div>
          <div className="vg-container">
            <div className="vg-centered-heading">
              <span className="vg-kicker">Trải nghiệm du khách</span>
              <h2>
                Khách hàng nói gì về <span className="vg-brand-word-primary">ViVu</span><span className="vg-brand-word-accent">Go</span>?
              </h2>
              <p>Cảm nhận chân thực từ những du khách đã đồng hành cùng chúng tôi trên mọi nẻo đường.</p>
            </div>

            {/* Social Proof Trust Bar */}
            {(() => {
              const avgScore = safeReviews.length > 0
                ? (safeReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / safeReviews.length).toFixed(1).replace(".", ",")
                : "5,0";
              const totalCount = safeReviews.length;

              return (
                <div className="vg-reviews-trust-bar">
                  <div className="vg-trust-score-badge">
                    <span className="vg-trust-score-num">{avgScore}</span>
                    <div className="vg-trust-stars">★★★★★</div>
                  </div>
                  <div className="vg-trust-avatar-stack">
                    {safeReviews.slice(0, 4).map((r, i) => {
                      const name = r.reviewer_name || "K";
                      const avColor = (i % 4) + 1;
                      return (
                        <span key={i} className={`vg-trust-avatar vg-av-${avColor}`}>
                          {name.charAt(0).toUpperCase()}
                        </span>
                      );
                    })}
                    {totalCount > 4 ? (
                      <span className="vg-trust-avatar vg-av-plus">+{totalCount - 4}</span>
                    ) : null}
                  </div>
                  <div className="vg-trust-stats-info">
                    <strong>{totalCount > 0 ? `${totalCount}+ Đánh giá thực tế` : "1.200+ Du khách hài lòng"}</strong>
                    <span>100% Đánh giá 5 sao từ du khách đã đi tour</span>
                  </div>
                </div>
              );
            })()}

            <div className="vg-review-marquee-wrap">
              <div className="vg-review-marquee" aria-label="Đánh giá tour 5 sao từ khách hàng">
              <div
                className="vg-review-marquee-track"
                style={{
                  "--vg-review-duration": `${Math.max(140, safeReviews.length * 20)}s`,
                }}
              >
                {marqueeReviews.map((review, index) => {
                  const reviewerName = review.reviewer_name || "Khách hàng ViVuGo";
                  const reviewerAvatar = mediaUrl(review.reviewer_avatar_url);
                  const tourTitle = review.tour_title || review.tour?.title || "Tour Du Lịch Trải Nghiệm";
                  const tourSlug = review.tour_slug || review.tour?.slug || review.tour_id || review.tour?.id;
                  const tourLink = tourSlug ? `/tours/${tourSlug}` : "/tours";

                  return (
                    <article
                      className="vg-review-card"
                      key={`${review.id}-${index}`}
                      aria-hidden={index >= safeReviews.length}
                    >
                      <div className="vg-review-quote-mark" aria-hidden="true">“</div>

                      <Link
                        to={tourLink}
                        className="vg-review-tour-tag"
                        title={`Xem chi tiết ${tourTitle}`}
                      >
                        <Icon name="compass" size={13} />
                        <span>{tourTitle}</span>
                      </Link>

                      <p className="vg-review-comment">{review.comment}</p>

                      <div className="vg-review-card-footer">
                        <div className="vg-review-person">
                          <div className="vg-review-avatar" aria-hidden="true">
                            {reviewerAvatar ? (
                              <img
                                src={reviewerAvatar}
                                alt=""
                                onError={(event) => {
                                  event.currentTarget.hidden = true;
                                }}
                              />
                            ) : null}
                            <span>{reviewerName.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <strong>{reviewerName}</strong>
                          </div>
                        </div>

                        <div className="vg-review-stars" aria-label="5 trên 5 sao">
                          <strong>{Number(review.rating).toFixed(1).replace(".", ",")}</strong>
                          <span className="vg-stars-gold">★★★★★</span>
                        </div>
                      </div>
                      <div className="vg-review-card-accent vg-review-card-accent-bottom"></div>
                    </article>
                  );
                })}
              </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 8: Về chúng tôi & Highlight dịch vụ */}
      <section className="vg-home-section vg-about-section" id="gioi-thieu">
        <div className="vg-container">
          <div className="vg-centered-heading vg-about-heading">
            <span className="vg-kicker">Về ViVuGo</span>
            <h2>Đi nhẹ nhàng, trải nghiệm trọn vẹn</h2>
            <p>
              ViVuGo đồng hành để việc chọn tour, đặt chỗ và chuẩn bị cho chuyến đi của bạn trở nên rõ ràng, đơn giản và an tâm hơn.
            </p>
          </div>
          <div className="vg-about-strip">
            <article>
              <Icon name="sparkle" size={22} />
              <div>
                <strong>Hành trình được chọn lọc</strong>
                <span>Từ tour trong nước đến quốc tế, mỗi hành trình đều được chọn lọc kỹ và cập nhật thông tin rõ ràng trước khi giới thiệu đến bạn.</span>
              </div>
            </article>
            <article>
              <Icon name="headset" size={22} />
              <div>
                <strong>Đồng hành cùng khách hàng</strong>
                <span>Chúng tôi lắng nghe phản hồi thực tế để nâng cao chất lượng dịch vụ và chăm sóc từng chuyến đi.</span>
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
