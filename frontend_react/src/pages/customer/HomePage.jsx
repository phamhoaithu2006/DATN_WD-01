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
    <div className="vg-home-skeleton vg-container" aria-label="Đang tải dữ liệu trang chủ">
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

// Dynamic Background Slider cho Hero
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

function dedupeTours(toursList) {
  if (!Array.isArray(toursList)) return [];
  const seen = new Set();
  const result = [];
  for (const tour of toursList) {
    if (tour && tour.id && !seen.has(tour.id)) {
      seen.add(tour.id);
      result.push(tour);
    }
  }
  return result;
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
  const [activeTabId, setActiveTabId] = useState("featured");
  const tabButtonsRef = useRef({});

  const [heroSearch, setHeroSearch] = useState({
    q: "",
    departure_location: "",
    destination_id: "",
    departure_date: "",
    category_id: "",
    scope: "",
  });
  const earliestDepartureInputValue = getEarliestBookableDepartureDate();

  const safeTours = Array.isArray(tours) ? tours : [];
  const safeBanners = Array.isArray(banners) ? banners : [];
  const safeFavorites = Array.isArray(favorites) ? favorites : [];
  const safeCategories = Array.isArray(homeContent?.categories)
    ? homeContent.categories
    : [];
  const safeReviews = Array.isArray(homeContent?.reviews)
    ? homeContent.reviews
    : [];

  // Dải statistics dưới Hero: CHỈ lấy 3 chỉ số thật từ homeContent.statistics
  const statistics = homeContent?.statistics || {};
  const statItems = [
    typeof statistics.available_tours === "number" && statistics.available_tours > 0
      ? {
        key: "available_tours",
        count: statistics.available_tours,
        label: "Tour đang mở bán",
        icon: "compass",
      }
      : null,
    typeof statistics.destinations === "number" && statistics.destinations > 0
      ? {
        key: "destinations",
        count: statistics.destinations,
        label: "Điểm đến",
        icon: "mapPin",
      }
      : null,
    typeof statistics.categories === "number" && statistics.categories > 0
      ? {
        key: "categories",
        count: statistics.categories,
        label: "Loại hình du lịch",
        icon: "layers",
      }
      : null,
  ].filter(Boolean);

  // Danh mục loại hình du lịch (có hình ảnh và tour_count)
  const visibleCategories = safeCategories
    .map((category) => ({
      ...category,
      image: mediaUrl(category.thumbnail_url || category.image),
      tour_count: Number(category.tour_count) || 0,
    }))
    .filter((category) => category.tour_count > 0)
    .slice(0, 5);

  // Điểm đến phổ biến với ảnh ngẫu nhiên từ địa điểm thuộc tour đang mở bán
  const visibleDestinations = (
    Array.isArray(homeContent?.destinations) ? homeContent.destinations : []
  )
    .map((dest) => ({
      ...dest,
      image: mediaUrl(dest.thumbnail_url),
      tour_count: Number(dest.tour_count) || 0,
    }))
    .filter((dest) => dest.tour_count > 0)
    .slice(0, 6);

  // Cấu hình các Tab Tour duy nhất (Deduplicate tour nội bộ, tối đa 6 tour/tab)
  const availableTabs = useMemo(() => {
    const safeToursList = Array.isArray(tours) ? tours : [];
    const safeDiscountedList = Array.isArray(discountedTours) ? discountedTours : [];
    const safeUpcomingList = Array.isArray(upcomingTours) ? upcomingTours : [];
    const safeInternationalList = Array.isArray(internationalTours) ? internationalTours : [];
    const safeFeaturedList = Array.isArray(homeContent?.featured_tours) && homeContent.featured_tours.length > 0
      ? homeContent.featured_tours
      : safeToursList;

    const featuredList = dedupeTours(safeFeaturedList).slice(0, 6);
    const dealsList = dedupeTours(safeDiscountedList).slice(0, 6);
    const upcomingList = dedupeTours(safeUpcomingList).slice(0, 6);
    const internationalList = dedupeTours(safeInternationalList).slice(0, 6);

    const allTabs = [
      {
        id: "featured",
        label: "Nổi bật",
        icon: "sparkle",
        kicker: "Tour nổi bật",
        title: "Hành trình được khách hàng quan tâm",
        description: "Các hành trình mới được cập nhật, có lịch khởi hành còn chỗ.",
        tours: featuredList,
        link: "/tours",
        linkText: "Xem tất cả tour nổi bật →",
      },
      {
        id: "deals",
        label: "Đang ưu đãi",
        icon: "fire",
        kicker: "🔥 Khuyến mãi hot",
        title: "Ưu đãi hấp dẫn hôm nay",
        description: "Các hành trình giảm giá đặc biệt, số lượng chỗ ưu đãi có hạn.",
        tours: dealsList,
        link: "/tours?sort=discount",
        linkText: "Xem tất cả ưu đãi →",
      },
      {
        id: "upcoming",
        label: "Sắp khởi hành",
        icon: "calendar",
        kicker: "Chuyến đi sắp tới",
        title: "Tour sắp khởi hành",
        description: "Những hành trình có ngày khởi hành gần nhất — giữ chỗ ngay kẻo lỡ.",
        tours: upcomingList,
        link: "/tours?sort=departure_soon",
        linkText: "Xem tour sắp khởi hành →",
      },
      {
        id: "international",
        label: "Quốc tế",
        icon: "globe",
        kicker: "Khám phá",
        title: "Tour quốc tế",
        description: "Gợi ý các hành trình nổi bật với trải nghiệm đa dạng và giá cạnh tranh.",
        tours: internationalList,
        link: "/tours?scope=international",
        linkText: "Xem tất cả tour quốc tế →",
      },
    ];

    // Chỉ giữ các tab có dữ liệu
    return allTabs.filter((tab) => tab.tours.length > 0);
  }, [
    homeContent,
    tours,
    discountedTours,
    upcomingTours,
    internationalTours,
  ]);

  // Xử lý dynamic fallback: Nếu active tab biến mất sau khi dữ liệu cập nhật,
  // tự động chuyển sang tab khả dụng đầu tiên.
  useEffect(() => {
    if (availableTabs.length === 0) return;
    const exists = availableTabs.some((tab) => tab.id === activeTabId);
    if (!exists) {
      setActiveTabId(availableTabs[0].id);
    }
  }, [availableTabs, activeTabId]);

  const activeTab = availableTabs.find((tab) => tab.id === activeTabId) || availableTabs[0] || null;

  // Điều hướng bằng bàn phím theo chuẩn WAI-ARIA (Roving tabIndex)
  const handleTabKeyDown = (event, currentIndex) => {
    if (availableTabs.length <= 1) return;
    let targetIndex = -1;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      targetIndex = (currentIndex + 1) % availableTabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      targetIndex = (currentIndex - 1 + availableTabs.length) % availableTabs.length;
    } else if (event.key === "Home") {
      targetIndex = 0;
    } else if (event.key === "End") {
      targetIndex = availableTabs.length - 1;
    }

    if (targetIndex !== -1) {
      event.preventDefault();
      const nextTab = availableTabs[targetIndex];
      if (nextTab) {
        setActiveTabId(nextTab.id);
        tabButtonsRef.current[nextTab.id]?.focus();
      }
    }
  };

  // Hiển thị toàn bộ đánh giá từ 4 sao trở lên mà API trả về.
  const displayedReviews = safeReviews.filter((review) => Number(review.rating) >= 4);
  const totalReviewsCount = displayedReviews.length;
  const averageRating = totalReviewsCount > 0
    ? displayedReviews.reduce((acc, review) => acc + Number(review.rating), 0) / totalReviewsCount
    : 5;
  const avgScore = averageRating.toFixed(1).replace(".", ",");
  const roundedAverageRating = Math.round(averageRating);

  // Khối cam kết và giá trị dịch vụ hợp nhất
  const serviceHighlights = [
    {
      icon: "shield",
      title: "Giá tốt minh bạch",
      description: "Cam kết giá rõ ràng, không phí ẩn, dễ dàng so sánh và lựa chọn.",
    },
    {
      icon: "wallet",
      title: "Thanh toán linh hoạt",
      description: "Đặt cọc dễ, nhiều phương thức thanh toán và chính sách hoàn hủy rõ ràng.",
    },
    {
      icon: "headset",
      title: "Hỗ trợ tận tâm",
      description: "Đội ngũ hỗ trợ luôn sẵn sàng theo dõi hành trình và xử lý nhanh.",
    },
    {
      icon: "star",
      title: "Tour được kiểm duyệt",
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
  ])).sort((first, second) => first.localeCompare(second, "vi"));
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

              {/* Dải thống kê thật từ API (chỉ hiển thị khi có dữ liệu thật hợp lệ) */}
              {statItems.length > 0 ? (
                <div className="vg-hero-stats-strip" aria-label="Thống kê hệ thống">
                  {statItems.map((item) => (
                    <div className="vg-hero-stat-item" key={item.key}>
                      <Icon name={item.icon} size={15} />
                      <strong className="vg-hero-stat-number">{item.count}</strong>
                      <span className="vg-hero-stat-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
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

      {/* Section 1: Khám phá theo loại hình du lịch */}
      {!loading && visibleCategories.length > 0 ? (
        <section className="vg-home-section vg-discovery-section" id="kham-pha">
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
                    <div className="vg-masonry-overlay" />
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

      {/* Section 2: Unified Tour Section có Tab (Chỉ render tab active) */}
      {!loading && activeTab && activeTab.tours.length > 0 ? (
        <section className="vg-home-section vg-tour-showcase-tabbed" id="danh-sach-tour">
          <div className="vg-container">
            {/* Header section & Tab Bar */}
            <div className="vg-tour-tab-header">
              <div className="vg-tour-tab-title-group">
                <span className="vg-kicker">{activeTab.kicker}</span>
                <h2>{activeTab.title}</h2>
                <p>{activeTab.description}</p>
              </div>

              <div className="vg-tour-tab-action-group">
                <Link to={activeTab.link} className="vg-tour-tab-view-all">
                  {activeTab.linkText}
                </Link>
              </div>
            </div>

            {/* Accessible Tab List with Roving tabIndex */}
            {availableTabs.length > 0 ? (
              <div
                className="vg-tour-tabs-nav"
                role="tablist"
                aria-label="Danh mục tour trang chủ"
              >
                {availableTabs.map((tab, idx) => {
                  const isActive = tab.id === activeTab.id;
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => {
                        if (el) tabButtonsRef.current[tab.id] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`tab-${tab.id}`}
                      aria-selected={isActive}
                      aria-controls={`tabpanel-${tab.id}`}
                      tabIndex={isActive ? 0 : -1}
                      className={`vg-tour-tab-btn ${isActive ? "is-active" : ""}`}
                      onClick={() => setActiveTabId(tab.id)}
                      onKeyDown={(event) => handleTabKeyDown(event, idx)}
                    >
                      <Icon name={tab.icon} size={15} />
                      <span className="vg-tab-text">{tab.label}</span>
                      <span className="vg-tab-badge">{tab.tours.length}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Tab Panel: CHỈ render danh sách tour của tab đang active */}
            <div
              role="tabpanel"
              id={`tabpanel-${activeTab.id}`}
              aria-labelledby={`tab-${activeTab.id}`}
              className="vg-tour-tabpanel"
            >
              <div className="vg-tour-grid vg-tour-grid-wide">
                {activeTab.tours.map((tour) => (
                  <TourCard
                    key={tour.id}
                    tour={tour}
                    favorite={safeFavorites.includes(tour.id)}
                    onFavorite={onFavorite}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 3: Điểm đến phổ biến (Lưới thẻ ảnh 3x2) */}
      {!loading && visibleDestinations.length > 0 ? (
        <section className="vg-home-section vg-home-destinations-section" id="diem-den-yeu-thich">
          <div className="vg-container">
            <div className="vg-popular-destinations-block">
              <div className="vg-destinations-grid-header">
                <div className="vg-destinations-grid-title-wrap">
                  <span className="vg-kicker">Điểm đến</span>
                  <h3>Điểm đến được yêu thích</h3>
                </div>
                <Link to="/destinations" className="vg-destinations-all-link">
                  Xem tất cả điểm đến →
                </Link>
              </div>
              <div className="vg-home-destination-cards-grid" role="list">
                {visibleDestinations.map((dest) => (
                  <Link
                    key={dest.id}
                    to={`/tours?destinations=${dest.id}`}
                    className={`vg-home-destination-card ${dest.image ? "has-image" : "is-fallback"}`}
                    role="listitem"
                    aria-label={`Khám phá tour tại ${dest.name || dest.province_city}`}
                  >
                    <div className="vg-home-dest-card-media">
                      <div className="vg-home-dest-card-fallback" aria-hidden="true">
                        <Icon name="mapPin" size={28} />
                      </div>
                      {dest.image ? (
                        <img
                          src={dest.image}
                          alt={dest.thumbnail_alt_text || `Ảnh điểm đến ${dest.name || dest.province_city}`}
                          className="vg-home-dest-card-image"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                    </div>
                    <div className="vg-home-dest-card-overlay" aria-hidden="true" />
                    <div className="vg-home-dest-card-content">
                      {dest.place_name ? (
                        <span className="vg-home-dest-card-place">{dest.place_name}</span>
                      ) : null}
                      <div className="vg-home-dest-card-footer">
                        <div className="vg-home-dest-card-body">
                          <strong className="vg-home-dest-card-name">{dest.name || dest.province_city}</strong>
                          <span className="vg-home-dest-card-count">{dest.tour_count} tour đang mở</span>
                        </div>
                        <span className="vg-home-dest-card-action" aria-hidden="true">
                          <Icon name="arrowRight" size={17} className="vg-home-dest-card-arrow" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 4: Cảm nhận của khách hàng (Từ 4 sao trở lên) */}
      {!loading && displayedReviews.length > 0 ? (
        <section className="vg-home-section vg-reviews-section vg-home-section-alt" id="danh-gia">
          <div className="vg-reviews-bg-glow" aria-hidden="true" />
          <div className="vg-container">
            <div className="vg-centered-heading">
              <span className="vg-kicker">Trải nghiệm du khách</span>
              <h2>
                Cảm nhận của khách hàng
              </h2>
              <p>Cảm nhận chân thực từ những du khách đã đồng hành và trải nghiệm tour thực tế cùng ViVuGo.</p>
            </div>

            {/* Social Proof Trust Bar */}
            <div className="vg-reviews-trust-bar">
              <div className="vg-trust-score-badge">
                <span className="vg-trust-score-num">{avgScore}</span>
                <div className="vg-trust-stars" aria-label={`${avgScore} trên 5 sao`}>
                  {[..."★★★★★"].map((star, starIndex) => (
                    <span
                      key={starIndex}
                      className={starIndex < roundedAverageRating ? "is-filled" : "is-empty"}
                      aria-hidden="true"
                    >
                      {star}
                    </span>
                  ))}
                </div>
              </div>
              <div className="vg-trust-avatar-stack">
                {displayedReviews.slice(0, 3).map((r, i) => {
                  const name = r.reviewer_name || "K";
                  const avColor = (i % 4) + 1;
                  return (
                    <span key={i} className={`vg-trust-avatar vg-av-${avColor}`}>
                      {name.charAt(0).toUpperCase()}
                    </span>
                  );
                })}
              </div>
              <div className="vg-trust-stats-info">
                <strong>{totalReviewsCount > 0 ? `${totalReviewsCount} Đánh giá thực tế` : "Đánh giá từ khách hàng"}</strong>
                <span>Những đánh giá từ 4 sao trở lên của du khách đã trải nghiệm tour</span>
              </div>
            </div>

            {/* Marquee toàn bộ đánh giá, nhân bản một lần để vòng lặp liền mạch */}
            <div className="vg-review-marquee-wrap">
              <div
                className="vg-review-marquee"
                role="region"
                aria-label="Đánh giá của khách hàng từ 4 sao trở lên"
              >
                <div className="vg-review-marquee-track">
                  {[...displayedReviews, ...displayedReviews].map((review, index) => {
                    const reviewIndex = index % totalReviewsCount;
                    const copyIndex = Math.floor(index / totalReviewsCount);
                    const reviewerName = review.reviewer_name || "Khách hàng ViVuGo";
                    const reviewerAvatar = mediaUrl(review.reviewer_avatar_url);
                    const tourTitle = review.tour_title || review.tour?.title || "Tour Du Lịch Trải Nghiệm";
                    const tourSlug = review.tour_slug || review.tour?.slug || review.tour_id || review.tour?.id;
                    const tourLink = tourSlug ? `/tours/${tourSlug}` : "/tours";
                    const reviewRating = Math.min(5, Math.max(0, Number(review.rating) || 0));
                    const roundedReviewRating = Math.round(reviewRating);

                    return (
                      <article
                        className="vg-review-card"
                        key={`${review.id || reviewIndex}-${copyIndex}`}
                        aria-hidden={copyIndex === 1}
                        data-review-copy={copyIndex}
                      >
                        <div className="vg-review-quote-mark" aria-hidden="true">“</div>

                        <Link
                          to={tourLink}
                          className="vg-review-tour-tag"
                          title={`Xem chi tiết ${tourTitle}`}
                          tabIndex={copyIndex === 1 ? -1 : undefined}
                        >
                          <Icon name="compass" size={13} />
                          <span>{tourTitle}</span>
                        </Link>

                        <p className="vg-review-comment">{review.comment}</p>

                        <div className="vg-review-card-footer">
                          <div className="vg-review-person">
                            <div className={`vg-review-avatar vg-review-avatar-${(reviewIndex % 6) + 1}`} aria-hidden="true">
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

                          <div className="vg-review-stars" aria-label={`${reviewRating} trên 5 sao`}>
                            <strong>{reviewRating.toFixed(1).replace(".", ",")}</strong>
                            <span className="vg-stars-gold" aria-hidden="true">
                              {[..."★★★★★"].map((star, starIndex) => (
                                <span
                                  key={starIndex}
                                  className={starIndex < roundedReviewRating ? "is-filled" : "is-empty"}
                                >
                                  {star}
                                </span>
                              ))}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 4: Khối Niềm tin & Giá trị Dịch vụ Hợp nhất */}
      <section className="vg-home-section vg-trust-consolidated-section" id="gioi-thieu">
        <div className="vg-container">
          <div className="vg-centered-heading vg-about-heading">
            <span className="vg-kicker">Về ViVuGo</span>
            <h2>Đồng hành tin cậy trên mọi hành trình</h2>
            <p>
              ViVuGo giúp bạn dễ dàng tìm kiếm, so sánh và đặt tour du lịch với trải nghiệm minh bạch, an toàn và hỗ trợ tận tâm.
            </p>
          </div>

          <div className="vg-trust-consolidated-grid">
            {serviceHighlights.map((item) => (
              <article key={item.title} className="vg-trust-highlight-card">
                <div className="vg-trust-highlight-icon">
                  <Icon name={item.icon} size={24} />
                </div>
                <div className="vg-trust-highlight-body">
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
