import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocale } from "../../contexts/LocaleContext";
import { fetchTourDetail } from "../../services/customerApi";
import Icon from "../../components/customer/Icon";

const fallbackGalleryImages = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80",
];

function normalizeTourDetail(tour, fallback = {}) {
  if (!tour) return fallback;

  return {
    ...fallback,
    ...tour,
    image: tour.image || tour.thumbnail_url || tour.thumbnail?.image_url || fallback.image,
    category: tour.category || tour.category_name || fallback.category,
    travelStyle: tour.travelStyle || tour.travel_style || fallback.travelStyle,
    destination: tour.destination || tour.destination_name || fallback.destination,
    price: {
      base: tour.price?.base || tour.base_price || fallback.price?.base,
      discount: tour.price?.discount || tour.discount_price || fallback.price?.discount,
    },
    slots: {
      max: tour.slots?.max || tour.max_slots || fallback.slots?.max,
      available: tour.slots?.available || tour.available_slots || fallback.slots?.available,
    },
    rating: {
      average: tour.rating?.average || tour.average_rating || fallback.rating?.average,
      count: tour.rating?.count || tour.review_count || fallback.rating?.count,
    },
  };
}

function getTourPath(tour) {
  return `/tours/${tour.slug || tour.id}`;
}

function TourDetailPage({ tourId, tours = [], hasLiveTours = false, favorites = [], onFavorite }) {
  const { currency, formatCurrency } = useLocale();
  const navigate = useNavigate();
  const [expandedDay, setExpandedDay] = useState(0); // Default open first day of schedule
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const [imgError, setImgError] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [detailTour, setDetailTour] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Find tour
  const listTour = tours.find((t) => String(t.id) === String(tourId) || String(t.slug) === String(tourId)) || null;
  const tour = detailTour || listTour;
  const detailLookup = hasLiveTours && listTour?.slug
    ? listTour.slug
    : Number.isNaN(Number(tourId))
      ? tourId
      : null;

  // Booking state
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 7); // Default to 7 days from now
    return today.toISOString().split("T")[0];
  });
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  // Refs for scroll spy
  const overviewRef = useRef(null);
  const itineraryRef = useRef(null);
  const servicesRef = useRef(null);
  const policiesRef = useRef(null);
  const reviewsRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tourId]);

  useEffect(() => {
    let active = true;

    async function loadTourDetail() {
      if (!detailLookup) {
        setDetailTour(null);
        setDetailError("");
        setDetailLoading(false);
        return;
      }

      setDetailLoading(true);
      setDetailError("");

      try {
        const item = await fetchTourDetail(detailLookup);
        if (!active) return;
        setDetailTour(normalizeTourDetail(item, listTour || {}));
      } catch {
        if (!active) return;
        setDetailTour(null);
        setDetailError("Không thể tải chi tiết tour từ máy chủ.");
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    loadTourDetail();

    return () => {
      active = false;
    };
  }, [detailLookup, listTour]);

  if (!tour && detailLoading) {
    return (
      <div className="vg-container" style={{ padding: "120px 20px", textAlign: "center" }}>
        <h2>Đang tải chi tiết tour...</h2>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="vg-container" style={{ padding: "120px 20px", textAlign: "center" }}>
        <h2>Không tìm thấy thông tin tour</h2>
        <Link to="/tours" className="vg-btn" style={{ marginTop: "20px", display: "inline-block" }}>
          Quay lại danh sách tour
        </Link>
      </div>
    );
  }

  const isFavorite = favorites.includes(tour.id);

  // Price calculations
  const basePrice = Number(tour.price?.discount || tour.price?.base || 0);
  const displayBasePrice = currency === "VND" && basePrice > 0 && basePrice < 100000 ? basePrice * 25000 : basePrice;
  const originalPrice = Number(tour.price?.base || basePrice);
  const displayOriginalPrice = currency === "VND" && originalPrice > 0 && originalPrice < 100000 ? originalPrice * 25000 : originalPrice;

  // Guest pricing ratios
  const adultPrice = displayBasePrice;
  const childPrice = Math.round(displayBasePrice * 0.75); // 75% of adult price
  const infantPrice = 0; // Free

  const totalCost = adults * adultPrice + children * childPrice + infants * infantPrice;
  const tax = Math.round(totalCost * 0.08); // 8% VAT
  const finalTotal = totalCost + tax;

  // Rating values
  const ratingAverage = Number(tour.rating?.average || 4.8);
  const ratingCount = Number(tour.rating?.count || 124);

  // Fallback itinerary while backend data is not available.
  const fallbackItinerary = [
    {
      day: 1,
      title: "Khởi hành - Khám phá điểm đến đầu tiên & Nhận phòng nghỉ dưỡng",
      content: "Xe và hướng dẫn viên ViVuGo đón quý khách tại điểm hẹn, khởi hành đi " + tour.destination + ". Trên đường đi, đoàn dừng chân nghỉ ngơi và dùng bữa sáng tự túc. Đến nơi, quý khách dùng bữa trưa tại nhà hàng với các món ăn đặc sản địa phương, sau đó làm thủ tục nhận phòng khách sạn tiêu chuẩn. Buổi chiều, đoàn tham quan địa điểm đầu tiên trong hành trình, tự do chụp ảnh check-in. Buổi tối, thưởng thức bữa tối lãng mạn tại resort/khách sạn và tự do dạo chơi phố đêm.",
    },
    {
      day: 2,
      title: "Trải nghiệm hoạt động đặc sắc & Khám phá văn hóa bản địa",
      content: "Quý khách có thể dậy sớm ngắm bình minh và dùng bữa sáng buffet tại khách sạn. Ngày thứ hai sẽ đưa quý khách đi sâu khám phá các điểm tham quan nổi tiếng nhất tại " + tour.destination + ". Tham gia các hoạt động ngoài trời đặc thù (leo núi ngắm cảnh, tắm biển, chèo thuyền Kayak hoặc tham quan đền chùa cổ kính). Đoàn ăn trưa tại nhà hàng địa phương. Buổi chiều tiếp tục hành trình trải nghiệm văn hóa độc đáo. Tối đoàn ăn tối trên thuyền hoặc tại nhà hàng trung tâm.",
    },
    {
      day: 3,
      title: "Tự do mua sắm - Check-out & Trở về điểm xuất phát ban đầu",
      content: "Dùng bữa sáng tại khách sạn. Quý khách tự do thư giãn tại bể bơi, dạo chơi mua sắm đặc sản làm quà cho người thân tại các khu chợ địa phương. 11:30 đoàn làm thủ tục trả phòng khách sạn và dùng bữa trưa nhẹ. Chiều xe đón đoàn xuất phát trở về. Trên đường về, xe dừng nghỉ tại các trạm dừng chân để mua nông sản. Chiều tối về đến điểm đón ban đầu, hướng dẫn viên chia tay đoàn, kết thúc tour du lịch đầy ắp kỷ niệm đẹp cùng ViVuGo.",
    },
  ];

  const apiItinerary = Array.isArray(tour.itinerary)
    ? tour.itinerary
        .filter(Boolean)
        .sort((a, b) => (a.sort_order || a.day_number || 0) - (b.sort_order || b.day_number || 0))
        .map((item, index) => ({
          day: item.day_number || item.day || index + 1,
          title: item.title || `Ngày ${item.day_number || index + 1}`,
          content: item.description || item.content || item.duration || "",
        }))
    : [];
  const itinerary = apiItinerary.length ? apiItinerary : fallbackItinerary;

  // Inclusions and Exclusions
  const inclusions = [
    "Xe du lịch đời mới, máy lạnh đưa đón khứ hồi theo lịch trình.",
    "Khách sạn/Resort tiêu chuẩn cao cấp (2 người/phòng, lẻ nam/nữ ghép 3).",
    "Các bữa ăn tiêu chuẩn cao theo chương trình (bao gồm Buffet sáng tại khách sạn).",
    "Vé vào cửa các điểm tham quan theo lịch trình chi tiết.",
    "Hướng dẫn viên tiếng Việt chuyên nghiệp, tận tâm suốt tuyến.",
    "Bảo hiểm du lịch quốc tế/nội địa mức bồi thường tối đa 50,000,000đ/vụ.",
    "Nước suối miễn phí phục vụ trên xe (1 chai/người/ngày).",
  ];

  const exclusions = [
    "Thuế giá trị gia tăng VAT 8% (nếu quý khách lấy hóa đơn đỏ).",
    "Chi phí đồ uống trong các bữa ăn và chi tiêu cá nhân ngoài chương trình.",
    "Phụ thu phòng đơn (nếu quý khách có nhu cầu ở riêng 1 phòng).",
    "Tiền TIP cho hướng dẫn viên và tài xế phục vụ đoàn (không bắt buộc).",
  ];

  // Reviews mock list
  const reviews = [
    {
      name: "Nguyễn Văn Hùng",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
      date: "15/06/2026",
      rating: 5,
      content: "Chuyến đi tuyệt vời hơn cả mong đợi. Hướng dẫn viên của ViVuGo rất nhiệt tình, chu đáo và am hiểu lịch sử địa phương. Khách sạn sạch sẽ, dịch vụ ăn uống ngon miệng. Sẽ tiếp tục ủng hộ ViVuGo trong các tour tiếp theo!",
    },
    {
      name: "Trần Thị Mai",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
      date: "28/05/2026",
      rating: 5,
      content: "Gia đình tôi có trải nghiệm rất đáng nhớ tại " + tour.destination + ". Bố mẹ tôi đã lớn tuổi nhưng lịch trình sắp xếp cực kỳ hợp lý, không bị mệt chút nào. Đồ ăn phong phú và hợp khẩu vị. Đánh giá 5 sao cho chất lượng dịch vụ!",
    },
    {
      name: "Phạm Minh Hoàng",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
      date: "10/05/2026",
      rating: 4,
      content: "Tour tổ chức chuyên nghiệp, xe di chuyển êm ái. Cảnh đẹp tuyệt vời, tuy nhiên ngày thứ 2 hoạt động hơi dày một chút nên hơi mệt về chiều. Bù lại đồ ăn tối rất ngon và dịch vụ phòng nghỉ đỉnh cao. Rất đáng tiền!",
    },
  ];

  const apiGalleryImages = Array.isArray(tour.images)
    ? tour.images
        .map((image) => image?.image_url || image?.url || image)
        .filter(Boolean)
    : [];
  const galleryImages = Array.from(
    new Set([tour.image, ...apiGalleryImages, ...fallbackGalleryImages].filter(Boolean)),
  ).slice(0, 5);



  const handleBookingSubmit = (e) => {
    e.preventDefault();
    setBookingCode(`VVG-${Math.floor(100000 + Math.random() * 900000)}`);
    setBookingSuccess(true);
  };

  // Filter 3 related tours (excluding current tour)
  const relatedTours = tours
    .filter((t) => String(t.id) !== String(tourId) && String(t.slug) !== String(tourId))
    .slice(0, 3);

  return (
    <div className="vg-tour-detail-page">
      {/* Breadcrumb section */}
      <div className="vg-detail-breadcrumb">
        <div className="vg-container">
          <Link to="/">Trang chủ</Link>
          <Icon name="chevronRight" size={12} />
          <Link to="/tours">Danh sách Tour</Link>
          <Icon name="chevronRight" size={12} />
          <span>{tour.title}</span>
        </div>
      </div>

      <main className="vg-detail-main">
        <div className="vg-container">
          {/* Grid Image Gallery */}
          <div className="vg-detail-gallery">
            <div className="gallery-main">
              {imgError ? (
                <div className="vg-tour-fallback-image">
                  <Icon name="globe" size={48} />
                  <span>{tour.title}</span>
                </div>
              ) : (
                <img
                  src={galleryImages[0]}
                  alt={tour.title}
                  onError={() => setImgError(true)}
                />
              )}
            </div>
            <div className="gallery-thumbs">
              {galleryImages.slice(1, 5).map((imgUrl, i) => (
                <div key={i} className="gallery-thumb-item">
                  <img src={imgUrl} alt={`${tour.title} view ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Core Layout Columns */}
          <div className="vg-detail-layout">
            {/* Left Content column */}
            <div className="vg-detail-content-col">
              {/* Klook-style Header Block */}
              <div className="vg-klook-header">
                <h1 className="vg-klook-title">{tour.title}</h1>
                
                <div className="vg-klook-badge">
                  <span className="badge-icon">🏆</span>
                  <span className="badge-text">Trải nghiệm Tour 5 Sao hàng đầu tại {tour.destination}</span>
                  <span className="badge-arrow"><Icon name="chevronRight" size={10} /></span>
                </div>

                <div className="vg-klook-meta-row">
                  <div className="meta-left">
                    <span className="rating-score">★ {ratingAverage.toFixed(1)}/5</span>
                    <span className="rating-reviews">({ratingCount} đánh giá)</span>
                    <span className="meta-separator">•</span>
                    <span className="booked-count">1,200+ khách đã đặt</span>
                  </div>
                  <button
                    className={`vg-klook-wishlist-btn ${isFavorite ? "is-active" : ""}`}
                    onClick={() => onFavorite(tour)}
                    aria-label="Thêm vào danh sách yêu thích"
                  >
                    <Icon name="heart" size={16} />
                    <span>{isFavorite ? "Đã lưu vào wishlist" : "Lưu vào wishlist"}</span>
                  </button>
                </div>

                <div className="vg-klook-alert">
                  <span className="alert-icon">📢</span>
                  <span className="alert-text">
                    Lưu ý: Lịch trình khởi hành có thể điều chỉnh linh hoạt theo thời tiết hoặc yêu cầu riêng của đoàn để đảm bảo an toàn tuyệt đối.
                  </span>
                </div>

                {detailError ? (
                  <div className="vg-klook-alert">
                    <span className="alert-icon">!</span>
                    <span className="alert-text">{detailError}</span>
                  </div>
                ) : null}

                <div className="vg-klook-specs">
                  <div className="spec-item">
                    <div className="spec-icon">
                      <Icon name="calendar" size={18} />
                    </div>
                    <div className="spec-content">
                      <strong>Thời gian khởi hành:</strong>
                      <span>Khởi hành hàng ngày theo yêu cầu</span>
                    </div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-icon">
                      <Icon name="clock" size={18} />
                    </div>
                    <div className="spec-content">
                      <strong>Thời lượng chuyến đi:</strong>
                      <span>{tour.duration}</span>
                    </div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-icon">
                      <Icon name="mapPin" size={18} />
                    </div>
                    <div className="spec-content">
                      <strong>Điểm khởi hành & Đón khách:</strong>
                      <span>{tour.destination} / Khách sạn tại trung tâm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overview Section */}
              <section id="overview" ref={overviewRef} className="vg-detail-section">
                <h2>Tổng quan chuyến đi</h2>
                <p className="vg-detail-summary-text">{tour.summary}</p>
                <div className="vg-detail-highlights">
                  <div className="highlight-card">
                    <Icon name="clock" size={24} />
                    <div>
                      <strong>Thời gian</strong>
                      <span>{tour.duration}</span>
                    </div>
                  </div>
                  <div className="highlight-card">
                    <Icon name="users" size={24} />
                    <div>
                      <strong>Nhóm khách tối đa</strong>
                      <span>{tour.slots?.max || 12} người</span>
                    </div>
                  </div>
                  <div className="highlight-card">
                    <Icon name="globe" size={24} />
                    <div>
                      <strong>Phương tiện</strong>
                      <span>Xe du lịch, Hàng không</span>
                    </div>
                  </div>
                  <div className="highlight-card">
                    <Icon name="mapPin" size={24} />
                    <div>
                      <strong>Điểm khởi hành</strong>
                      <span>Hà Nội / TP.HCM</span>
                    </div>
                  </div>
                </div>
                <div className="vg-tour-highlights-box">
                  <h3>Điểm nhấn nổi bật của hành trình</h3>
                  <ul>
                    <li>Trải nghiệm dịch vụ lữ hành chuyên nghiệp chuẩn 5 sao từ ViVuGo.</li>
                    <li>Khám phá trọn vẹn nét đẹp văn hóa, phong cảnh hoang sơ tại {tour.destination}.</li>
                    <li>Thưởng thức thực đơn hải sản/đặc sản phong phú được chọn lọc kỹ lưỡng.</li>
                    <li>Resort/Khách sạn nghỉ dưỡng cao cấp tọa lạc tại vị trí đắc địa nhất.</li>
                  </ul>
                </div>
              </section>


              {/* Services Section */}
              <section id="services" ref={servicesRef} className="vg-detail-section">
                <h2>Dịch vụ đi kèm</h2>
                <div className="vg-services-grid">
                  <div className="services-box inclusion-box">
                    <h3>
                      <span className="bullet-icon inclusion">✓</span>
                      Dịch vụ bao gồm (Included)
                    </h3>
                    <ul>
                      {inclusions.map((text, i) => (
                        <li key={i}>{text}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="services-box exclusion-box">
                    <h3>
                      <span className="bullet-icon exclusion">✗</span>
                      Dịch vụ không bao gồm (Excluded)
                    </h3>
                    <ul>
                      {exclusions.map((text, i) => (
                        <li key={i}>{text}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* Policies Section */}
              <section id="policies" ref={policiesRef} className="vg-detail-section">
                <h2>Chính sách & Quy định</h2>
                <div className="vg-policy-accordion">
                  <div className="policy-block">
                    <h4>1. Quy định về trẻ em và phụ thu</h4>
                    <ul>
                      <li>Trẻ em dưới 5 tuổi: Miễn phí giá tour (ngủ chung giường với bố mẹ, bố mẹ tự lo ăn uống cho bé). Hai người lớn chỉ được kèm 1 trẻ em miễn phí, trẻ thứ hai tính 50% giá tour.</li>
                      <li>Trẻ em từ 5 - 11 tuổi: Tính 75% giá tour người lớn (ăn suất riêng, ngủ chung giường với bố mẹ).</li>
                      <li>Trẻ từ 12 tuổi trở lên: Tính bằng giá người lớn.</li>
                    </ul>
                  </div>
                  <div className="policy-block">
                    <h4>2. Điều kiện hoàn hủy hủy tour</h4>
                    <ul>
                      <li>Hủy tour trước 15 ngày khởi hành: Miễn phí hoàn hủy 100%.</li>
                      <li>Hủy tour từ 7 - 14 ngày trước khởi hành: Phạt 50% tổng giá trị hợp đồng đặt tour.</li>
                      <li>Hủy tour trong vòng 7 ngày trước khởi hành hoặc không tham gia: Phạt 100% chi phí.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Reviews Section */}
              <section id="reviews" ref={reviewsRef} className="vg-detail-section">
                <h2>Đánh giá từ khách hàng</h2>
                <div className="vg-reviews-summary">
                  <div className="reviews-score-box">
                    <strong className="score-average">{ratingAverage.toFixed(1)}</strong>
                    <div className="score-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < Math.round(ratingAverage) ? "star-active" : "star-inactive"}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="score-count">{ratingCount} đánh giá chân thực</span>
                  </div>
                  <div className="reviews-bars">
                    <div className="bar-row">
                      <span>5 sao</span>
                      <div className="bar-bg"><div className="bar-fill" style={{ width: "85%" }}></div></div>
                      <span>85%</span>
                    </div>
                    <div className="bar-row">
                      <span>4 sao</span>
                      <div className="bar-bg"><div className="bar-fill" style={{ width: "12%" }}></div></div>
                      <span>12%</span>
                    </div>
                    <div className="bar-row">
                      <span>3 sao</span>
                      <div className="bar-bg"><div className="bar-fill" style={{ width: "3%" }}></div></div>
                      <span>3%</span>
                    </div>
                    <div className="bar-row">
                      <span>2 sao</span>
                      <div className="bar-bg"><div className="bar-fill" style={{ width: "0%" }}></div></div>
                      <span>0%</span>
                    </div>
                  </div>
                </div>

                <div className="vg-reviews-list">
                  {reviews.map((rev, index) => (
                    <div key={index} className="vg-review-item">
                      <div className="review-avatar">
                        <img src={rev.avatar} alt={rev.name} />
                      </div>
                      <div className="review-main">
                        <div className="review-meta">
                          <strong>{rev.name}</strong>
                          <span className="review-date">{rev.date}</span>
                        </div>
                        <div className="review-rating">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < rev.rating ? "star-active" : ""}>
                              ★
                            </span>
                          ))}
                        </div>
                        <p className="review-text">{rev.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Booking column */}
            <div className="vg-detail-sidebar-col">
              <div className="vg-booking-card">
                <div className="booking-price-header">
                  <span>Giá từ</span>
                  <div className="booking-price-row">
                    <strong className="booking-price-active">{formatCurrency(displayBasePrice)}</strong>
                    <span className="booking-price-unit">/ khách</span>
                  </div>
                  {displayOriginalPrice > displayBasePrice ? (
                    <del className="booking-price-old">{formatCurrency(displayOriginalPrice)}</del>
                  ) : null}
                </div>

                <form className="booking-form" onSubmit={handleBookingSubmit}>
                  <div className="form-group">
                    <label>
                      <Icon name="calendar" size={16} />
                      Ngày khởi hành
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>

                  <div className="guests-selectors">
                    <label className="guests-label-main">
                      <Icon name="users" size={16} />
                      Số lượng người tham gia
                    </label>

                    {/* Adults */}
                    <div className="guest-row">
                      <div className="guest-info">
                        <strong>Người lớn</strong>
                        <small>Từ 12 tuổi trở lên</small>
                      </div>
                      <div className="qty-control">
                        <button
                          type="button"
                          disabled={adults <= 1}
                          onClick={() => setAdults(adults - 1)}
                        >
                          -
                        </button>
                        <span>{adults}</span>
                        <button
                          type="button"
                          disabled={adults + children >= (tour.slots?.available || 8)}
                          onClick={() => setAdults(adults + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Children */}
                    <div className="guest-row">
                      <div className="guest-info">
                        <strong>Trẻ em</strong>
                        <small>Từ 5 - 11 tuổi (75% giá)</small>
                      </div>
                      <div className="qty-control">
                        <button
                          type="button"
                          disabled={children <= 0}
                          onClick={() => setChildren(children - 1)}
                        >
                          -
                        </button>
                        <span>{children}</span>
                        <button
                          type="button"
                          disabled={adults + children >= (tour.slots?.available || 8)}
                          onClick={() => setChildren(children + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Infants */}
                    <div className="guest-row">
                      <div className="guest-info">
                        <strong>Em bé</strong>
                        <small>Dưới 5 tuổi (Miễn phí)</small>
                      </div>
                      <div className="qty-control">
                        <button
                          type="button"
                          disabled={infants <= 0}
                          onClick={() => setInfants(infants - 1)}
                        >
                          -
                        </button>
                        <span>{infants}</span>
                        <button
                          type="button"
                          onClick={() => setInfants(infants + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Breakdown summary */}
                  <div className="booking-summary-breakdown">
                    <h4>Chi tiết giá tạm tính</h4>
                    <div className="breakdown-row">
                      <span>Người lớn ({adults} × {formatCurrency(adultPrice)})</span>
                      <span>{formatCurrency(adults * adultPrice)}</span>
                    </div>
                    {children > 0 && (
                      <div className="breakdown-row">
                        <span>Trẻ em ({children} × {formatCurrency(childPrice)})</span>
                        <span>{formatCurrency(children * childPrice)}</span>
                      </div>
                    )}
                    <div className="breakdown-row">
                      <span>Thuế VAT (8%)</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="breakdown-row total">
                      <span>Tổng số tiền</span>
                      <strong>{formatCurrency(finalTotal)}</strong>
                    </div>
                  </div>

                  <button type="submit" className="vg-btn-book">
                    Đăng Ký Đặt Tour Ngay
                  </button>
                </form>
                <div className="booking-help-note">
                  * Điền thông tin đặt chỗ sẽ không tính tiền ngay. Đội ngũ nhân viên của ViVuGo sẽ liên hệ lại qua số điện thoại để hỗ trợ tư vấn chi tiết lịch trình.
                </div>
              </div>

              {/* Sidebar Itinerary Card */}
              <div className="vg-itinerary-sidebar-card" ref={itineraryRef}>
                <h3>
                  <Icon name="calendar" size={20} />
                  Lịch trình chuyến đi
                </h3>
                <div className="vg-itinerary-sidebar-timeline">
                  {itinerary.map((item, index) => (
                    <div key={index} className="vg-itinerary-sidebar-step">
                      <span className="day-label">Ngày {item.day}</span>
                      <div className="day-summary">{item.title}</div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="vg-itinerary-zoom-btn"
                  onClick={() => setShowItineraryModal(true)}
                >
                  <Icon name="maximize" size={16} />
                  Phóng to xem chi tiết
                </button>
              </div>
            </div>
          </div>

          {/* Related Tours section */}
          {relatedTours.length > 0 && (
            <div className="vg-detail-related-section">
              <h2 className="related-title">Các chuyến đi tương tự</h2>
              <div className="vg-tour-grid">
                {relatedTours.map((t) => {
                  const rSale = Number(t.price?.discount || t.price?.base || 0);
                  const rOrig = Number(t.price?.base || rSale);
                  const rDispPrice = currency === "VND" && rSale > 0 && rSale < 100000 ? rSale * 25000 : rSale;
                  const rDispOrigPrice = currency === "VND" && rOrig > 0 && rOrig < 100000 ? rOrig * 25000 : rOrig;
                  const rFavorite = favorites.includes(t.id);

                  return (
                    <article key={t.id} className="vg-tour-card" onClick={() => navigate(getTourPath(t))}>
                      <div className="vg-tour-photo">
                        <img src={t.image} alt={t.title} />
                        <div className="vg-tour-badges">
                          {t.featured ? <span className="badge-featured">Nổi bật</span> : null}
                          {t.discountLabel ? <strong className="badge-discount">{t.discountLabel}</strong> : null}
                        </div>
                        <button
                          className={rFavorite ? "vg-heart is-active" : "vg-heart"}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFavorite(t);
                          }}
                        >
                          <Icon name="heart" size={19} />
                        </button>
                        <span className="vg-place">
                          <Icon name="mapPin" size={14} /> {t.destination}
                        </span>
                      </div>
                      <div className="vg-tour-info">
                        <div className="vg-tour-meta">
                          <span className="vg-tour-category">{t.category}</span>
                          <span className="vg-tour-rating">
                            <Icon name="star" size={13} />
                            <b>{Number(t.rating?.average || 4.8).toFixed(1)}</b>
                            <small>({t.rating?.count || 12})</small>
                          </span>
                        </div>
                        <h3>{t.title}</h3>
                        <div className="vg-tour-facts">
                          <span>
                            <Icon name="clock" size={15} /> {t.duration}
                          </span>
                          <span>
                            <Icon name="users" size={15} /> Tối đa {t.slots?.max || 12}
                          </span>
                        </div>
                        <div className="vg-tour-footer">
                          <div className="vg-tour-price-box">
                            <div className="vg-tour-price-row">
                              <strong className="vg-tour-sale-price">{formatCurrency(rDispPrice)}</strong>
                              <span className="vg-tour-price-unit">/ người</span>
                            </div>
                            {rDispOrigPrice > rDispPrice ? (
                              <div className="vg-tour-discount-row">
                                <span className="vg-tour-original-label">Giá gốc:</span>
                                <del className="vg-tour-original-price">{formatCurrency(rDispOrigPrice)}</del>
                              </div>
                            ) : (
                              <div className="vg-tour-discount-row placeholder">
                                <span>&nbsp;</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Booking Success Modal */}
      {bookingSuccess && (
        <div className="vg-modal-backdrop">
          <div className="vg-success-modal-card">
            <button className="modal-close-btn" onClick={() => setBookingSuccess(false)}>
              <Icon name="close" size={24} />
            </button>
            <div className="modal-icon-success">
              <span className="checkmark">✓</span>
            </div>
            <h2>Đăng Ký Đặt Tour Thành Công!</h2>
            <p className="modal-sub">Cảm ơn bạn đã lựa chọn tin tưởng dịch vụ lữ hành của ViVuGo.</p>
            
            <div className="modal-summary-box">
              <div className="summary-item">
                <span>Mã đặt chỗ:</span>
                <strong>{bookingCode}</strong>
              </div>
              <div className="summary-item">
                <span>Chuyến đi:</span>
                <strong>{tour.title}</strong>
              </div>
              <div className="summary-item">
                <span>Ngày xuất phát:</span>
                <strong>{startDate.split("-").reverse().join("/")}</strong>
              </div>
              <div className="summary-item">
                <span>Số lượng khách:</span>
                <strong>{adults} Người lớn {children > 0 ? `, ${children} Trẻ em` : ""} {infants > 0 ? `, ${infants} Em bé` : ""}</strong>
              </div>
              <div className="summary-item total">
                <span>Tổng giá trị đơn đặt:</span>
                <strong className="price">{formatCurrency(finalTotal)}</strong>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-done" onClick={() => setBookingSuccess(false)}>
                Hoàn thành
              </button>
              <button className="btn-support" onClick={() => navigate("/deals")}>
                Xem ưu đãi khác
              </button>
            </div>
            <p className="modal-footer-note">Nhân viên tổng đài sẽ gọi điện thoại xác nhận trong vòng 15-30 phút.</p>
          </div>
        </div>
      )}

      {/* Detailed Itinerary Modal */}
      {showItineraryModal && (
        <div className="vg-modal-backdrop" onClick={() => setShowItineraryModal(false)}>
          <div className="vg-success-modal-card vg-itinerary-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowItineraryModal(false)}>
              <Icon name="close" size={24} />
            </button>
            <div className="modal-header-title">
              <h2>Lịch trình chi tiết</h2>
              <p className="modal-sub">{tour.title}</p>
            </div>
            
            <div className="modal-itinerary-body">
              <div className="vg-itinerary-timeline">
                {itinerary.map((item, index) => (
                  <div
                    key={index}
                    className={`vg-timeline-day ${expandedDay === index ? "is-expanded" : ""}`}
                  >
                    <div
                      className="day-header"
                      onClick={() => setExpandedDay(expandedDay === index ? -1 : index)}
                    >
                      <div className="day-number">Ngày {item.day}</div>
                      <h4 className="day-title">{item.title}</h4>
                      <span className="day-arrow">
                        <Icon name="chevronDown" size={18} />
                      </span>
                    </div>
                    <div className="day-body-wrapper">
                      <div className="day-body-content">
                        <p>{item.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-done" onClick={() => setShowItineraryModal(false)}>
                Đóng lịch trình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TourDetailPage;
