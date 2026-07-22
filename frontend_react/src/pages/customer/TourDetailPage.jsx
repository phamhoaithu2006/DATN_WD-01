import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLocale } from "../../contexts/LocaleContext";
import { createCustomerBooking, fetchTourDetail, previewCustomerBooking } from "../../services/customerApi";
import { readSession, readToken } from "../../services/authStorage";
import Icon from "../../components/customer/Icon";
import { mediaUrl } from "../../utils/mediaUrl";

function normalizeTourDetail(tour, fallback = {}) {
  if (!tour) return fallback;

  return {
    ...fallback,
    ...tour,
    image: mediaUrl(tour.image || tour.thumbnail_url || tour.thumbnail?.image_url || fallback.image),
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

function getRuleAgeHint(rule) {
  if (rule.min_age === null || rule.min_age === undefined) return "Nhóm giá theo quy định tour";
  if (rule.max_age === null || rule.max_age === undefined) return `Từ ${rule.min_age} tuổi trở lên`;
  return `Từ ${rule.min_age} đến ${rule.max_age} tuổi`;
}

function getPricingRuleText(rule) {
  if (rule.pricing_type === "free") return "miễn phí";
  if (rule.pricing_type === "fixed") return `${Number(rule.price_value || 0).toLocaleString("vi-VN")}đ`;
  return `${rule.price_value}% giá người lớn`;
}

function isValidPhone(value) {
  const phone = String(value || "").replace(/\D/g, "");
  return phone.length === 10 && phone.charAt(0) === "0";
}
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDENTITY_REGEX = /^[A-Za-z0-9-]{6,20}$/;

function normalizePhone(value) {
  return String(value || "").trim().replace(/\D/g, "");
}

function getAgeFromBirthDate(birthDate, referenceDate) {
  const birth = new Date(`${birthDate}T00:00:00`);
  const reference = new Date(`${referenceDate}T00:00:00`);

  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime())) {
    return null;
  }

  let age = reference.getFullYear() - birth.getFullYear();
  const monthDifference = reference.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && reference.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function TourDetailPage({ tourId, tours = [], hasLiveTours = false, favorites = [], onFavorite }) {
  const { currency, formatCurrency } = useLocale();
  const navigate = useNavigate();
  const [expandedDay, setExpandedDay] = useState(0); // Default open first day of schedule
  const [imgError, setImgError] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [detailTour, setDetailTour] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Find tour
  const listTour = tours.find((t) => String(t.id) === String(tourId) || String(t.slug) === String(tourId)) || null;
  const tour = detailTour || listTour;
  const detailLookup = hasLiveTours && listTour?.slug
    ? listTour.slug
    : Number.isNaN(Number(tourId))
      ? tourId
      : null;

  // Booking checkout state
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedDepartureId, setSelectedDepartureId] = useState("");
  const [quantities, setQuantities] = useState({});
  const [bookingPreview, setBookingPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [useCustomContact, setUseCustomContact] = useState(false);
  const [contact, setContact] = useState(() => {
    const session = readSession() || {};
    return {
      contact_name: session.full_name || "",
      contact_email: session.email || "",
      contact_phone: session.phone || "",
      address: session.address || "",
      special_request: "",
    };
  });
  const [participants, setParticipants] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({ contact: {}, participants: {} });

  const [itineraryCollapsed, setItineraryCollapsed] = useState(false);

  // Refs for scroll spy & actions
  const overviewRef = useRef(null);
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
        setDetailLoading(false);
        return;
      }

      setDetailLoading(true);

      try {
        const item = await fetchTourDetail(detailLookup);
        if (!active) return;
        setDetailTour(normalizeTourDetail(item, listTour || {}));
      } catch {
        if (!active) return;
        setDetailTour(null);
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
  const departures = Array.isArray(tour.departures) ? tour.departures : [];
  const firstOpenDeparture = departures.find((departure) => departure.status === "open" && Number(departure.available_slots) > 0);
  const effectiveSelectedDepartureId = selectedDepartureId || (firstOpenDeparture ? String(firstOpenDeparture.id) : "");
  const selectedDeparture = departures.find((departure) => String(departure.id) === String(effectiveSelectedDepartureId)) || null;
  const adultPrice = Number(selectedDeparture?.price || displayBasePrice || 0);
  const activePricingRules = Array.isArray(tour.age_pricing_rules)
    ? tour.age_pricing_rules.filter((rule) => rule.is_active !== false)
    : [];
  const adultBookingGroup = {
    id: "adult_default",
    label: "Người lớn",
    min_age: 11,
    max_age: null,
    pricing_type: "percentage",
    price_value: 100,
    is_active: true,
  };
  const isDefaultAdultRule = (rule) => rule.id === adultBookingGroup.id;
  const isAdultPricingRule = (rule) => isDefaultAdultRule(rule) || (
    (rule.max_age === null || rule.max_age === undefined)
    && rule.pricing_type !== "free"
  );
  const adultPricingRule = activePricingRules.find(isAdultPricingRule) || adultBookingGroup;
  const bookingGroups = activePricingRules.some(isAdultPricingRule)
    ? activePricingRules
    : [adultBookingGroup, ...activePricingRules];
  const defaultQuantityRule = adultPricingRule;
  const effectiveQuantities = Object.keys(quantities).length
    ? quantities
    : { [defaultQuantityRule.id]: 1 };
  const getRuleQuantity = (rule) => Number(effectiveQuantities[rule.id] || 0);
  const getRuleUnitPrice = (rule) => {
    if (rule.pricing_type === "free") return 0;
    if (rule.pricing_type === "fixed") return Number(rule.price_value || 0);
    return Math.round(adultPrice * Number(rule.price_value || 100) / 100);
  };
  const totalGuests = bookingGroups.reduce((sum, rule) => sum + getRuleQuantity(rule), 0);
  const localTotal = bookingGroups.reduce((sum, rule) => sum + getRuleQuantity(rule) * getRuleUnitPrice(rule), 0);
  const finalTotal = Number(bookingPreview?.total_amount ?? localTotal);
  const availableSlots = Number(selectedDeparture?.available_slots || tour.slots?.available || 0);

  const ratingAverage = Number(tour.rating?.average || tour.average_rating || 0);
  const ratingCount = Number(tour.rating?.count || tour.review_count || 0);
  const hasRating = ratingCount > 0 && ratingAverage > 0;
  const bookingsCount = Number(tour.bookings_count || 0);

  const apiGalleryImages = Array.isArray(tour.images)
    ? tour.images
      .map((image) => mediaUrl(image?.image_url || image?.url || image))
      .filter(Boolean)
    : [];
  let galleryImages = Array.from(
    new Set([mediaUrl(tour.image), ...apiGalleryImages].filter(Boolean)),
  );
  const imageCount = Math.min(galleryImages.length || 1, 5);

  const itinerarySteps = Array.isArray(tour.itinerary)
    ? tour.itinerary
      .filter(Boolean)
      .sort((a, b) => (a.sort_order || a.day_number || 0) - (b.sort_order || b.day_number || 0))
      .map((item, index) => ({
        id: item.id,
        day: item.day_number || item.day || index + 1,
        time: [item.start_time, item.end_time].filter(Boolean).join(" - ") || `Ngày ${item.day_number || ""}`.trim(),
        title: item.title || `Ngày ${item.day_number || index + 1}`,
        desc: item.description || item.content || item.duration || "Chưa cập nhật mô tả lịch trình.",
        transport: item.transport || "",
        images: Array.isArray(item.images)
          ? item.images.map((image) => mediaUrl(image?.image_url || image?.url || image)).filter(Boolean)
          : [],
        isGreen: item.type === "activity",
      }))
    : [];
  const serviceInclusions = Array.isArray(tour.inclusions) ? tour.inclusions.filter(Boolean) : [];
  const serviceExclusions = Array.isArray(tour.exclusions) ? tour.exclusions.filter(Boolean) : [];

  const buildQuantitySummary = () => bookingGroups
    .map((rule) => ({
      rule_id: isDefaultAdultRule(rule) ? null : Number(rule.id),
      quantity: getRuleQuantity(rule),
    }))
    .filter((item) => item.quantity > 0);

  const notifyValidationError = (message) => {
    toast.error(message, {
      id: "tour-booking-validation",
      duration: 4500,
    });
  };

  const notifyRequestError = (message) => {
    setBookingError(message);
    toast.error(message, {
      id: "tour-booking-request-error",
      duration: 5000,
    });
  };

  const updateQuantity = (ruleId, nextQuantity) => {
    const isAdultGroup = String(ruleId) === String(adultPricingRule.id);
    const safeQuantity = Math.max(isAdultGroup ? 1 : 0, nextQuantity);

    const nextTotal = totalGuests - Number(effectiveQuantities[ruleId] || 0) + safeQuantity;

    if (availableSlots > 0 && nextTotal > availableSlots) {
      notifyValidationError(`Lịch này chỉ còn ${availableSlots} chỗ trống.`);
      return;
    }

    setBookingError("");
    setQuantities((current) => ({ ...effectiveQuantities, ...current, [ruleId]: safeQuantity }));
  };

  const createParticipantTemplate = () => ({
    full_name: "",
    phone: "",
    birth_date: "",
    gender: "male",
    identity_number: "",
  });

  const clearContactError = (field) => {
    setFieldErrors((current) => ({
      ...current,
      contact: { ...current.contact, [field]: "" },
    }));
  };

  const clearParticipantError = (index, field) => {
    setFieldErrors((current) => ({
      ...current,
      participants: {
        ...current.participants,
        [index]: { ...current.participants?.[index], [field]: "" },
      },
    }));
  };

  const updateContactField = (field, value) => {
    setContact((current) => ({ ...current, [field]: value }));
    clearContactError(field);
  };

  const updateParticipantField = (index, field, value) => {
    setParticipants((current) => current.map((participant, itemIndex) => (
      itemIndex === index ? { ...participant, [field]: value } : participant
    )));
    clearParticipantError(index, field);
  };

  const errorInputStyle = (hasError) => (hasError
    ? { borderColor: "#dc2626", boxShadow: "0 0 0 1px #dc2626" }
    : undefined);

  const fieldErrorStyle = {
    display: "block",
    color: "#dc2626",
    fontSize: "0.78rem",
    lineHeight: 1.35,
    marginTop: 5,
  };

  const validateBookingInformation = () => {
    const errors = { contact: {}, participants: {} };
    const contactName = String(contact.contact_name || "").trim();
    const contactPhone = normalizePhone(contact.contact_phone);
    const contactEmail = String(contact.contact_email || "").trim();
    const contactAddress = String(contact.address || "").trim();
    const specialRequest = String(contact.special_request || "").trim();

    if (!contactName) errors.contact.contact_name = "Vui lòng nhập họ tên người liên hệ.";
    else if (contactName.length < 2) errors.contact.contact_name = "Họ tên phải có ít nhất 2 ký tự.";
    else if (contactName.length > 100) errors.contact.contact_name = "Họ tên không được vượt quá 100 ký tự.";

    if (!contactPhone) errors.contact.contact_phone = "Vui lòng nhập số điện thoại liên hệ.";
    else if (!isValidPhone(contactPhone)) {
      errors.contact.contact_phone = "Số điện thoại bắt buộc gồm đúng 10 chữ số và bắt đầu bằng số 0.";
    }

    if (!contactEmail) errors.contact.contact_email = "Vui lòng nhập email liên hệ.";
    else if (contactEmail.length > 150) errors.contact.contact_email = "Email không được vượt quá 150 ký tự.";
    else if (!EMAIL_REGEX.test(contactEmail)) errors.contact.contact_email = "Email không đúng định dạng, ví dụ: ten@email.com.";

    if (contactAddress.length > 255) errors.contact.address = "Địa chỉ không được vượt quá 255 ký tự.";
    if (specialRequest.length > 500) errors.contact.special_request = "Yêu cầu đặc biệt không được vượt quá 500 ký tự.";

    const referenceDate = selectedDeparture?.departure_date || new Date().toISOString().split("T")[0];

    participants.forEach((participant, index) => {
      const itemErrors = {};
      const fullName = String(participant.full_name || "").trim();
      const birthDate = String(participant.birth_date || "").trim();
      const phone = normalizePhone(participant.phone);
      const identityNumber = String(participant.identity_number || "").trim();

      if (!fullName) itemErrors.full_name = "Vui lòng nhập họ tên hành khách.";
      else if (fullName.length < 2) itemErrors.full_name = "Họ tên phải có ít nhất 2 ký tự.";
      else if (fullName.length > 100) itemErrors.full_name = "Họ tên không được vượt quá 100 ký tự.";

      if (!birthDate) itemErrors.birth_date = "Vui lòng chọn ngày sinh.";
      else {
        const age = getAgeFromBirthDate(birthDate, referenceDate);
        if (age === null || age < 0) itemErrors.birth_date = "Ngày sinh không hợp lệ hoặc sau ngày khởi hành.";
        else if (age > 120) itemErrors.birth_date = "Tuổi hành khách không được vượt quá 120.";
      }

      if (!participant.gender || !["male", "female", "other"].includes(participant.gender)) {
        itemErrors.gender = "Vui lòng chọn giới tính.";
      }

      if (phone && !isValidPhone(phone)) {
        itemErrors.phone = "Số điện thoại bắt buộc gồm đúng 10 chữ số và bắt đầu bằng số 0.";
      }

      if (identityNumber && !IDENTITY_REGEX.test(identityNumber)) {
        itemErrors.identity_number = "CCCD/Hộ chiếu chỉ gồm chữ, số hoặc dấu gạch ngang; dài 6–20 ký tự.";
      }

      if (Object.keys(itemErrors).length) errors.participants[index] = itemErrors;
    });

    if (participants.length !== totalGuests) {
      errors.participants._form = `Thông tin hành khách phải có đủ ${totalGuests} người.`;
    }

    const hasErrors = Object.keys(errors.contact).length > 0
      || Object.keys(errors.participants).length > 0;

    setFieldErrors(errors);

    if (Object.keys(errors.contact).length > 0) setUseCustomContact(true);

    return !hasErrors;
  };

  const handleClearAll = () => {
    setQuantities({ [defaultQuantityRule.id]: 1 });
    setBookingError("");
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    setBookingError("");

    if (!readToken()) {
      toast.info("Vui lòng đăng nhập để tiếp tục đặt tour.", {
        id: "tour-booking-login",
      });
      navigate("/auth/login");
      return;
    }

    if (checkoutStep === 1) {
      if (!selectedDeparture) {
        notifyValidationError("Vui lòng chọn ngày khởi hành có sẵn.");
        return;
      }

      if (selectedDeparture.status && selectedDeparture.status !== "open") {
        notifyValidationError("Lịch khởi hành này hiện không còn nhận đặt chỗ.");
        return;
      }

      if (Number(selectedDeparture.available_slots ?? availableSlots) <= 0) {
        notifyValidationError("Lịch khởi hành này đã hết chỗ.");
        return;
      }

      if (totalGuests < 1) {
        notifyValidationError("Vui lòng chọn ít nhất 1 khách đặt tour.");
        return;
      }

      if (availableSlots > 0 && totalGuests > availableSlots) {
        notifyValidationError(`Lịch này chỉ còn ${availableSlots} chỗ trống.`);
        return;
      }

      if (!buildQuantitySummary().length) {
        notifyValidationError("Vui lòng chọn số lượng khách phù hợp.");
        return;
      }

      try {
        setPreviewLoading(true);
        const preview = await previewCustomerBooking({
          tour_departure_id: Number(selectedDeparture.id),
          quantity_summary: buildQuantitySummary(),
        });
        setBookingPreview(preview);
      } catch (error) {
        notifyRequestError(
          error.response?.data?.message ||
          "Chưa thể tính giá từ máy chủ, vui lòng thử lại."
        );
        return;
      } finally {
        setPreviewLoading(false);
      }

      const initialParticipants = Array.from(
        { length: totalGuests },
        () => createParticipantTemplate()
      );
      setParticipants(initialParticipants);
      setFieldErrors({ contact: {}, participants: {} });
      setCheckoutStep(2);
      return;
    }

    if (checkoutStep === 2) {
      if (!validateBookingInformation()) {
        notifyValidationError("Vui lòng kiểm tra các trường đang báo đỏ.");
        requestAnimationFrame(() => {
          document.querySelector('[data-validation-error="true"]')?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
        return;
      }

      try {
        setBookingSubmitting(true);
        const booking = await createCustomerBooking({
          tour_departure_id: Number(selectedDeparture.id),
          number_of_people: totalGuests,
          quantity_summary: buildQuantitySummary(),
          contact: {
            ...contact,
            contact_name: String(contact.contact_name || "").trim(),
            contact_email: String(contact.contact_email || "").trim(),
            contact_phone: normalizePhone(contact.contact_phone),
            address: String(contact.address || "").trim(),
            special_request: String(contact.special_request || "").trim(),
          },
          participants: participants.map((participant) => ({
            ...participant,
            full_name: String(participant.full_name || "").trim(),
            phone: normalizePhone(participant.phone) || "",
            identity_number: String(participant.identity_number || "").trim(),
          })),
          note: String(contact.special_request || "").trim() || undefined,
        });

        if (!booking?.checkout_url) {
          throw new Error("Không thể tạo liên kết thanh toán VNPAY.");
        }

        setCreatedBooking(booking);
        setCheckoutStep(3);
        toast.success("Thông tin hợp lệ. Đơn đặt tour đã được tạo.", {
          id: "tour-booking-created",
        });
      } catch (error) {
        const errors = error.response?.data?.errors;
        const firstError = errors ? Object.values(errors).flat()[0] : null;
        notifyRequestError(
          firstError ||
          error.response?.data?.message ||
          error.message ||
          "Không thể lưu đơn chờ thanh toán, vui lòng thử lại."
        );
      } finally {
        setBookingSubmitting(false);
      }

      return;
    }

    if (!createdBooking?.checkout_url) {
      notifyRequestError(
        "Không tìm thấy liên kết thanh toán. Vui lòng tiếp tục từ trang đơn hàng."
      );
      return;
    }

    setBookingSubmitting(true);
    window.location.assign(createdBooking.checkout_url);
  };

  // Filter 3 related tours (excluding current tour)
  const relatedTours = tours
    .filter((t) => String(t.id) !== String(tourId) && String(t.slug) !== String(tourId))
    .slice(0, 3);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="vg-tour-detail-page">
      {/* Redesigned Top Header (Above Gallery) */}
      <header className="vg-traveloka-header">
        <div className="vg-container">
          {/* Breadcrumb section */}
          <div className="vg-detail-breadcrumb" style={{ padding: 0, background: "none", marginBottom: 8 }}>
            <Link to="/">Trang chủ</Link>
            <Icon name="chevronRight" size={12} />
            <Link to="/tours">Danh sách Tour</Link>
            <Icon name="chevronRight" size={12} />
            <span style={{ color: "#687176" }}>{tour.title}</span>
          </div>

          {/* Title */}
          <h1 className="vg-traveloka-title">{tour.title}</h1>
        </div>
      </header>

      <main className="vg-detail-main" style={{ paddingTop: 0 }}>
        <div className="vg-container">
          {/* Traveloka Gallery Grid: 1 large left, 4 small right */}
          <div className={`vg-gallery-grid-traveloka layout-count-${imageCount}`}>
            <div className="vg-gallery-main-traveloka">
              {imgError || !galleryImages[0] ? (
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
            {imageCount > 1 && (
              <div className="vg-gallery-thumbs-traveloka">
                {galleryImages.slice(1, imageCount).map((imgUrl, i) => (
                  <div key={i} className="vg-gallery-thumb-item-traveloka">
                    <img src={imgUrl} alt={`${tour.title} view ${i + 1}`} />
                    {i === imageCount - 2 && galleryImages.length >= 5 && (
                      <button className="vg-gallery-btn-overlay" onClick={() => setShowItineraryModal(true)}>
                        <Icon name="camera" size={16} />
                        <span>Xem tất cả ảnh ({galleryImages.length})</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

                    {/* Post-Gallery Meta (Tags & Ratings) */}
          <div className="vg-post-gallery-meta" style={{ marginTop: '24px', marginBottom: '32px' }}>
            {/* Tags Pills Row */}
            <div className="vg-title-tags-row">
              {tour.category ? <span className="vg-title-tag-pill">{tour.category}</span> : null}
              {tour.destination ? <span className="vg-title-tag-pill">{tour.destination}</span> : null}
              {tour.duration ? <span className="vg-title-tag-pill">Thời lượng: {tour.duration}</span> : null}
              <span className="vg-title-tag-pill">{departures.length} lịch khởi hành đang mở</span>
            </div>

            {/* Ratings & Wishlist Row */}
            <div className="vg-meta-row-traveloka" style={{ marginTop: '16px' }}>
              <div className="vg-meta-left-traveloka">
                {hasRating ? (
                  <>
                    <span className="vg-rating-score-traveloka">★ {ratingAverage.toFixed(1)}/5</span>
                    <a href="#reviews" className="vg-reviews-link-traveloka">({ratingCount} đánh giá)</a>
                  </>
                ) : (
                  <span className="vg-reviews-link-traveloka">Chưa có đánh giá</span>
                )}
                <span className="meta-separator">•</span>
                <span className="vg-booked-tag-traveloka">{bookingsCount} lượt đặt</span>
                <span className="meta-separator">•</span>
                <a href="#overview" className="vg-loc-link-traveloka">
                  <Icon name="mapPin" size={14} />
                  <span>{tour.destination}</span>
                </a>
              </div>

              <button
                className={`vg-wishlist-btn-traveloka ${isFavorite ? "is-active" : ""}`}
                onClick={() => onFavorite(tour)}
                aria-label="Thêm vào danh sách yêu thích"
              >
                <Icon name="heart" size={16} />
                <span>{isFavorite ? "Đã lưu vào wishlist" : "Lưu vào wishlist"}</span>
              </button>
            </div>
          </div>

          {/* Tour Highlights Description */}
          <div className="vg-tour-description-block" style={{ marginBottom: "32px", padding: "0 12px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "12px", color: "#03121a" }}>
              Điểm nhấn nổi bật của hành trình
            </h3>
            {tour.description ? (
              <p className="vg-detail-summary-text" style={{ lineHeight: "1.6", color: "#333" }}>{tour.description}</p>
            ) : tour.summary ? (
              <p className="vg-detail-summary-text" style={{ lineHeight: "1.6", color: "#333" }}>{tour.summary}</p>
            ) : (
              <p className="vg-detail-summary-text" style={{ lineHeight: "1.6", color: "#333" }}>Tour này chưa cập nhật phần mô tả chi tiết.</p>
            )}
          </div>

          {/* Package Options Layout (2 columns) */}
          <div className="vg-package-options-layout-traveloka">
            {/* Left Column: Option selection form card */}
            <div className="vg-package-options-form-card">
              {/* Step Progress Indicator */}
              <div className="vg-checkout-steps-bar">
                <div className={`step-item ${checkoutStep === 1 ? 'active' : checkoutStep > 1 ? 'completed' : ''}`}>
                  <span className="step-num">{checkoutStep > 1 ? "✓" : "1"}</span>
                  <span className="step-label">Chọn lịch đi</span>
                </div>
                <div className="step-line" />
                <div className={`step-item ${checkoutStep === 2 ? 'active' : checkoutStep > 2 ? 'completed' : ''}`}>
                  <span className="step-num">{checkoutStep > 2 ? "✓" : "2"}</span>
                  <span className="step-label">Nhập thông tin</span>
                </div>
                <div className="step-line" />
                <div className={`step-item ${checkoutStep === 3 ? 'active' : ''}`}>
                  <span className="step-num">3</span>
                  <span className="step-label">Thanh toán</span>
                </div>
              </div>

              <div className="vg-form-title-row">
                <h3>
                  {checkoutStep === 1 && "Chọn ngày & số lượng"}
                  {checkoutStep === 2 && "Thông tin liên hệ & hành khách"}
                  {checkoutStep === 3 && "Xác nhận đặt tour"}
                </h3>
                {checkoutStep === 1 && (
                  <span className="vg-clear-all-link" onClick={handleClearAll}>
                    Xóa tất cả
                  </span>
                )}
              </div>

              {bookingError ? (
                <div className="booking-inline-error" style={{ marginBottom: 20 }}>
                  {bookingError}
                </div>
              ) : null}

              <form onSubmit={handleBookingSubmit} noValidate>
                {checkoutStep === 1 && (
                  <>
                    {/* Date Picker Input */}
                    <div className="vg-date-picker-section">
                      <label className="vg-date-picker-label">Vui lòng chọn ngày khởi hành</label>
                      <div className="vg-date-input-wrapper">
                        <Icon name="calendar" size={18} />
                        <select
                          className="vg-date-input-field"
                          value={effectiveSelectedDepartureId}
                          onChange={(event) => {
                            setSelectedDepartureId(event.target.value);
                            setBookingPreview(null);
                            setBookingError("");
                          }}
                          required
                        >
                          <option value="">Chọn ngày đi của bạn</option>
                          {departures.map((departure) => (
                            <option key={departure.id} value={departure.id}>
                              {departure.departure_date} (Còn {departure.available_slots} chỗ trống)
                            </option>
                          ))}
                        </select>
                      </div>
                      {!departures.length ? (
                        <small style={{ color: "#ff5b00", display: "block", marginTop: "6px" }}>
                          Tour này hiện tại chưa có lịch xuất phát sẵn sàng trực tuyến.
                        </small>
                      ) : null}
                    </div>

                    {/* Quantity Row */}
                    <div className="vg-quantity-section">
                      <label className="vg-options-group-title">Số lượng người tham gia</label>

                      {bookingGroups.map((rule) => {
                        const quantity = getRuleQuantity(rule);
                        const unitPrice = getRuleUnitPrice(rule);
                        const isAdultGroup = String(rule.id) === String(adultPricingRule.id);

                        return (
                          <div className="vg-qty-row-traveloka" key={rule.id}>
                            <div className="vg-qty-info">
                              <strong>{rule.label}</strong>
                              <small>{getRuleAgeHint(rule)} - {formatCurrency(unitPrice)}</small>
                            </div>
                            <div className="vg-counter-control">
                              <button
                                type="button"
                                className="vg-counter-btn"
                                disabled={isAdultGroup ? quantity <= 1 : quantity <= 0}
                                onClick={() => updateQuantity(rule.id, quantity - 1)}
                              >
                                -
                              </button>
                              <span className="vg-counter-value">{quantity}</span>
                              <button
                                type="button"
                                className="vg-counter-btn"
                                disabled={availableSlots > 0 && totalGuests >= availableSlots}
                                onClick={() => updateQuantity(rule.id, quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {checkoutStep === 2 && (
                  <div className="checkout-form-stack" style={{ marginBottom: 20 }}>
                    <section className="checkout-section">
                      <div className="checkout-section-title" style={{ marginBottom: 12 }}>
                        <h4>Thông tin liên hệ đặt chỗ</h4>
                        <button
                          type="button"
                          className="checkout-add-button"
                          onClick={() => setUseCustomContact((curr) => !curr)}
                        >
                          {useCustomContact ? "Sử dụng mặc định" : "+ Thay đổi"}
                        </button>
                      </div>
                      <div className="contact-preview-card" style={{ marginBottom: 12 }}>
                        <strong>{contact.contact_name || "Người đặt tour"}</strong>
                        <span>Số điện thoại: {contact.contact_phone || "Chưa có số điện thoại"}</span>
                        <span>Email: {contact.contact_email || "Chưa có email"}</span>
                      </div>
                      {useCustomContact && (
                        <div className="vg-checkout-grid" style={{ marginBottom: 12 }}>
                          <div className="vg-input-group">
                            <label>Họ tên người liên hệ *</label>
                            <input
                              className="vg-checkout-input"
                              style={errorInputStyle(Boolean(fieldErrors.contact.contact_name))}
                              data-validation-error={fieldErrors.contact.contact_name ? "true" : undefined}
                              value={contact.contact_name}
                              maxLength={100}
                              onChange={(e) => updateContactField("contact_name", e.target.value)}
                              placeholder="Họ tên liên hệ"
                            />
                            {fieldErrors.contact.contact_name && <small style={fieldErrorStyle}>{fieldErrors.contact.contact_name}</small>}
                          </div>
                          <div className="vg-input-group">
                            <label>Số điện thoại *</label>
                            <input
                              className="vg-checkout-input"
                              style={errorInputStyle(Boolean(fieldErrors.contact.contact_phone))}
                              data-validation-error={fieldErrors.contact.contact_phone ? "true" : undefined}
                              value={contact.contact_phone}
                              inputMode="numeric"
                              maxLength={10}
                              onChange={(e) => updateContactField(
                                "contact_phone",
                                e.target.value.replace(/\D/g, "").slice(0, 10)
                              )}
                              placeholder="Ví dụ: 0123456789"
                            />
                            {fieldErrors.contact.contact_phone && (
                              <small style={fieldErrorStyle}>{fieldErrors.contact.contact_phone}</small>
                            )}
                          </div>
                          <div className="vg-input-group">
                            <label>Email *</label>
                            <input
                              className="vg-checkout-input"
                              style={errorInputStyle(Boolean(fieldErrors.contact.contact_email))}
                              data-validation-error={fieldErrors.contact.contact_email ? "true" : undefined}
                              type="email"
                              value={contact.contact_email}
                              maxLength={150}
                              onChange={(e) => updateContactField("contact_email", e.target.value)}
                              placeholder="ten@email.com"
                            />
                            {fieldErrors.contact.contact_email && <small style={fieldErrorStyle}>{fieldErrors.contact.contact_email}</small>}
                          </div>
                          <div className="vg-input-group">
                            <label>Địa chỉ</label>
                            <input
                              className="vg-checkout-input"
                              style={errorInputStyle(Boolean(fieldErrors.contact.address))}
                              data-validation-error={fieldErrors.contact.address ? "true" : undefined}
                              value={contact.address}
                              maxLength={255}
                              onChange={(e) => updateContactField("address", e.target.value)}
                              placeholder="Địa chỉ"
                            />
                            {fieldErrors.contact.address && <small style={fieldErrorStyle}>{fieldErrors.contact.address}</small>}
                          </div>
                        </div>
                      )}
                      <div className="vg-input-group">
                        <label>Yêu cầu đặc biệt</label>
                        <textarea
                          className="vg-checkout-input"
                          style={errorInputStyle(Boolean(fieldErrors.contact.special_request))}
                          data-validation-error={fieldErrors.contact.special_request ? "true" : undefined}
                          value={contact.special_request}
                          maxLength={500}
                          onChange={(e) => updateContactField("special_request", e.target.value)}
                          placeholder="Yêu cầu đặc biệt nếu có (ăn chay, dị ứng, xe đẩy...)"
                          rows={3}
                        />
                        {fieldErrors.contact.special_request && <small style={fieldErrorStyle}>{fieldErrors.contact.special_request}</small>}
                      </div>
                    </section>

                    <section className="checkout-section" style={{ marginTop: 16 }}>
                      <div className="checkout-section-title" style={{ marginBottom: 12 }}>
                        <h4>Thông tin hành khách tham gia</h4>
                        <span style={{ fontSize: "0.85rem", color: "#687176" }}>{participants.length}/{totalGuests} khách</span>
                      </div>
                      {fieldErrors.participants?._form && (
                        <div className="booking-inline-error" data-validation-error="true" style={{ marginBottom: 12 }}>
                          {fieldErrors.participants._form}
                        </div>
                      )}
                      {participants.map((p, index) => (
                        <div className="vg-participant-card" key={index}>
                          <div className="vg-participant-card-header">
                            <h5>Hành khách {index + 1}</h5>
                            <span className={`vg-participant-status ${p.full_name && p.birth_date && p.gender ? 'is-complete' : 'is-missing'}`}>
                              {p.full_name && p.birth_date && p.gender ? 'Đã đủ' : 'Thiếu thông tin'}
                            </span>
                          </div>
                          <div className="vg-checkout-grid">
                            <div className="vg-input-group full-width-tablet">
                              <label>Họ tên hành khách *</label>
                              <input
                                className="vg-checkout-input"
                                style={errorInputStyle(Boolean(fieldErrors.participants?.[index]?.full_name))}
                                data-validation-error={fieldErrors.participants?.[index]?.full_name ? "true" : undefined}
                                value={p.full_name}
                                maxLength={100}
                                onChange={(e) => updateParticipantField(index, "full_name", e.target.value)}
                                placeholder="Họ và tên như trong giấy tờ"
                                required
                              />
                              {fieldErrors.participants?.[index]?.full_name && <small style={fieldErrorStyle}>{fieldErrors.participants[index].full_name}</small>}
                            </div>
                            <div className="vg-input-group">
                              <label>Ngày sinh *</label>
                              <input
                                className="vg-checkout-input"
                                style={errorInputStyle(Boolean(fieldErrors.participants?.[index]?.birth_date))}
                                data-validation-error={fieldErrors.participants?.[index]?.birth_date ? "true" : undefined}
                                type="date"
                                value={p.birth_date}
                                onChange={(e) => updateParticipantField(index, "birth_date", e.target.value)}
                                max={todayStr}
                                required
                              />
                              {fieldErrors.participants?.[index]?.birth_date && <small style={fieldErrorStyle}>{fieldErrors.participants[index].birth_date}</small>}
                            </div>
                            <div className="vg-input-group">
                              <label>Giới tính</label>
                              <select
                                className="vg-checkout-input"
                                style={errorInputStyle(Boolean(fieldErrors.participants?.[index]?.gender))}
                                data-validation-error={fieldErrors.participants?.[index]?.gender ? "true" : undefined}
                                value={p.gender}
                                onChange={(e) => updateParticipantField(index, "gender", e.target.value)}
                              >
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                                <option value="other">Khác</option>
                              </select>
                              {fieldErrors.participants?.[index]?.gender && <small style={fieldErrorStyle}>{fieldErrors.participants[index].gender}</small>}
                            </div>
                            <div className="vg-input-group">
                              <label>Số điện thoại</label>
                              <input
                                className="vg-checkout-input"
                                style={errorInputStyle(Boolean(fieldErrors.participants?.[index]?.phone))}
                                data-validation-error={fieldErrors.participants?.[index]?.phone ? "true" : undefined}
                                value={p.phone}
                                inputMode="tel"
                                maxLength={15}
                                onChange={(e) => updateParticipantField(index, "phone", e.target.value)}
                                placeholder="Ví dụ: 0912345678"
                              />
                              {fieldErrors.participants?.[index]?.phone && <small style={fieldErrorStyle}>{fieldErrors.participants[index].phone}</small>}
                            </div>
                            <div className="vg-input-group">
                              <label>CCCD / Hộ chiếu</label>
                              <input
                                className="vg-checkout-input"
                                style={errorInputStyle(Boolean(fieldErrors.participants?.[index]?.identity_number))}
                                data-validation-error={fieldErrors.participants?.[index]?.identity_number ? "true" : undefined}
                                value={p.identity_number}
                                maxLength={20}
                                onChange={(e) => updateParticipantField(index, "identity_number", e.target.value)}
                                placeholder="Số CCCD hoặc số hộ chiếu"
                              />
                              {fieldErrors.participants?.[index]?.identity_number && <small style={fieldErrorStyle}>{fieldErrors.participants[index].identity_number}</small>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </section>
                  </div>
                )}

                {checkoutStep === 3 && (
                  <div className="fake-payment-box" style={{ marginBottom: 20 }}>
                    <div className="fake-payment-header">
                      <Icon name="shield" size={24} />
                      <h4>Thanh toán đặt chỗ an toàn</h4>
                    </div>
                    <p style={{ color: "#475569", fontSize: "0.88rem", lineHeight: 1.6, margin: "12px 0" }}>
                      Bạn sẽ được chuyển đến VNPAY Sandbox để hoàn tất thanh toán. Chỗ sẽ được giữ trong 15 phút và tự động hoàn lại khi thanh toán không thành công hoặc hết hạn.
                    </p>
                    <div className="fake-payment-warning">
                      <span>✓ Bạn có thể hoàn hủy hoặc thay đổi thông tin theo chính sách của ViVuGo.</span>
                    </div>
                  </div>
                )}

                {/* Bottom sticky actions bar inside options card */}
                <div className="vg-options-bottom-summary">
                  <div className="vg-summary-price-box">
                    <span className="vg-summary-price-value">
                      {formatCurrency(finalTotal)}
                    </span>
                    <span className="vg-summary-price-label">
                      Tổng tiền cho {totalGuests} khách hàng
                    </span>
                  </div>

                  <div className="vg-options-action-buttons">
                    {checkoutStep > 1 && checkoutStep < 3 && (
                      <button
                        type="button"
                        className="checkout-back-button"
                        onClick={() => setCheckoutStep(checkoutStep - 1)}
                      >
                        Quay lại
                      </button>
                    )}

                    <button
                      type="submit"
                      className="vg-btn-book-traveloka"
                      disabled={previewLoading || bookingSubmitting || !departures.length}
                    >
                      {checkoutStep === 1 && (previewLoading ? "Đang xử lý..." : "Đặt ngay")}
                      {checkoutStep === 2 && (bookingSubmitting ? "Đang lưu đơn..." : "Đến bước thanh toán")}
                      {checkoutStep === 3 && (bookingSubmitting ? "Đang chuyển đến VNPAY..." : "Thanh toán qua VNPAY")}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right Column: Dynamic Booking Summary / Chi tiết đơn hàng */}
            <div className="vg-package-details-col-traveloka">
              <div className="vg-booking-summary-card">
                <div className="summary-header">
                  <Icon name="briefcase" size={18} />
                  <h3>Chi tiết đơn đặt tour</h3>
                </div>

                {/* Tour Info Block */}
                <div className="summary-tour-block">
                  <img src={tour.image} alt={tour.title} className="summary-tour-img" />
                  <div className="summary-tour-details">
                    <h4 className="summary-tour-title">{tour.title}</h4>
                    <div className="summary-tour-meta">
                      <span><Icon name="clock" size={12} /> {tour.duration}</span>
                      {selectedDeparture && (
                        <span><Icon name="calendar" size={12} /> Khởi hành: {selectedDeparture.departure_date}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price Breakdown Block */}
                <div className="summary-price-breakdown">
                  <h5>Tóm tắt chi phí</h5>
                  <div className="price-rows">
                    {bookingGroups.map((rule) => {
                      const qty = getRuleQuantity(rule);
                      if (qty <= 0) return null;
                      const unitPrice = getRuleUnitPrice(rule);
                      return (
                        <div className="price-row" key={rule.id}>
                          <span>{rule.label} (x{qty})</span>
                          <strong>{formatCurrency(unitPrice * qty)}</strong>
                        </div>
                      );
                    })}

                    {bookingPreview?.discount_amount > 0 && (
                      <div className="price-row discount">
                        <span>Giảm giá</span>
                        <strong>-{formatCurrency(Number(bookingPreview.discount_amount))}</strong>
                      </div>
                    )}
                  </div>

                  <div className="price-total-row">
                    <span>Tổng cộng:</span>
                    <strong className="total-amount">{formatCurrency(finalTotal)}</strong>
                  </div>
                </div>

                {/* Contact Info Live Preview (Step 2 and 3) */}
                {checkoutStep >= 2 && (
                  <div className="summary-info-preview-block">
                    <h5>Thông tin liên hệ</h5>
                    <div className="preview-content">
                      <p><strong>Người liên hệ:</strong> {contact.contact_name || <em className="placeholder-text">Chưa nhập</em>}</p>
                      <p><strong>Số điện thoại:</strong> {contact.contact_phone || <em className="placeholder-text">Chưa nhập</em>}</p>
                      <p><strong>Email:</strong> {contact.contact_email || <em className="placeholder-text">Chưa nhập</em>}</p>
                      {contact.address && <p><strong>Địa chỉ:</strong> {contact.address}</p>}
                      {contact.special_request && <p><strong>Yêu cầu đặc biệt:</strong> {contact.special_request}</p>}
                    </div>
                  </div>
                )}

                {/* Simulated Payment Info (Step 3) */}
                {checkoutStep === 3 && (
                  <div className="summary-info-preview-block payment-preview">
                    <h5>Phương thức thanh toán</h5>
                    <div className="preview-content">
                      <p><strong>Cổng thanh toán:</strong> Giả lập kiểm thử ViVuGo</p>
                      <p><strong>Trạng thái:</strong> Chờ xác nhận đặt chỗ</p>
                    </div>
                  </div>
                )}

                {/* Collapsible detailed itinerary */}
                <div className="summary-itinerary-collapsible">
                  <div
                    className={`vg-itinerary-timeline-title-row ${itineraryCollapsed ? "is-collapsed" : ""}`}
                    onClick={() => setItineraryCollapsed(!itineraryCollapsed)}
                  >
                    <h4>
                      <Icon name="calendar" size={16} />
                      Xem lịch trình chi tiết
                    </h4>
                    <Icon name="chevronDown" size={16} />
                  </div>

                  <div className={`vg-itinerary-list-traveloka ${itineraryCollapsed ? "is-collapsed" : ""}`}>
                    {itinerarySteps.length ? (
                      itinerarySteps.map((step, idx) => (
                        <div
                          key={step.id || idx}
                          className={`vg-itinerary-step-traveloka ${step.isGreen ? "is-green" : ""}`}
                        >
                          <span className={`vg-step-time-traveloka ${step.isGreen ? "is-green" : ""}`}>
                            {step.time}
                          </span>
                          <span className="vg-step-title-traveloka">{step.title}</span>
                          <span className="vg-step-desc-traveloka">{step.desc}</span>
                          {step.transport ? <span className="vg-step-desc-traveloka">Phương tiện: {step.transport}</span> : null}
                          {step.images.length ? (
                            <div className="vg-step-images-grid-traveloka">
                              {step.images.map((imgUrl, imgIdx) => (
                                <img key={imgIdx} src={imgUrl} alt={`${step.title} preview ${imgIdx + 1}`} />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="vg-itinerary-step-traveloka">
                        <span className="vg-step-title-traveloka">Chưa cập nhật lịch trình chi tiết.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overview Section */}
          <section id="overview" ref={overviewRef} className="vg-detail-section" style={{ marginTop: 48 }}>
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
                  <strong>Lịch khởi hành</strong>
                  <span>{departures.length ? `${departures.length} lịch đang mở` : "Chưa có lịch đang mở"}</span>
                </div>
              </div>
              <div className="highlight-card">
                <Icon name="mapPin" size={24} />
                <div>
                  <strong>Điểm đến</strong>
                  <span>{tour.destination || "Chưa cập nhật"}</span>
                </div>
              </div>
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
                  {serviceInclusions.length ? (
                    serviceInclusions.map((text, i) => (
                      <li key={i}>{text}</li>
                    ))
                  ) : (
                    <li>Tour này chưa cập nhật danh sách dịch vụ bao gồm.</li>
                  )}
                </ul>
              </div>
              <div className="services-box exclusion-box">
                <h3>
                  <span className="bullet-icon exclusion">✗</span>
                  Dịch vụ không bao gồm (Excluded)
                </h3>
                <ul>
                  {serviceExclusions.length ? (
                    serviceExclusions.map((text, i) => (
                      <li key={i}>{text}</li>
                    ))
                  ) : (
                    <li>Tour này chưa cập nhật danh sách dịch vụ không bao gồm.</li>
                  )}
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
                  {bookingGroups.length ? (
                    bookingGroups.map((rule) => (
                      <li key={rule.id}>
                        {rule.label}: {getRuleAgeHint(rule)} - {getPricingRuleText(rule)}
                      </li>
                    ))
                  ) : (
                    <li>Tour này chưa cập nhật chính sách giá theo độ tuổi.</li>
                  )}
                </ul>
              </div>
              <div className="policy-block">
                <h4>2. Điều kiện hoàn hủy hủy tour</h4>
                <ul>
                  <li>Tour này chưa cập nhật chính sách hoàn hủy riêng.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Reviews Section */}
          <section id="reviews" ref={reviewsRef} className="vg-detail-section">
            <h2>Đánh giá từ khách hàng</h2>
            <div className="vg-reviews-summary">
              <div className="reviews-score-box">
                {hasRating ? (
                  <>
                    <strong className="score-average">{ratingAverage.toFixed(1)}</strong>
                    <div className="score-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < Math.round(ratingAverage) ? "star-active" : "star-inactive"}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="score-count">{ratingCount} đánh giá</span>
                  </>
                ) : (
                  <>
                    <strong className="score-average">--</strong>
                    <span className="score-count">Tour này chưa có đánh giá.</span>
                  </>
                )}
              </div>
            </div>

            <div className="vg-reviews-list">
              <div className="vg-review-item">
                <div className="review-main">
                  <p className="review-text">Danh sách nhận xét chi tiết chưa được kết nối với API đánh giá.</p>
                </div>
              </div>
            </div>
          </section>

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
                            {Number(t.rating?.count || 0) > 0 ? (
                              <>
                                <b>{Number(t.rating?.average || 0).toFixed(1)}</b>
                                <small>({t.rating?.count})</small>
                              </>
                            ) : (
                              <small>Chưa có đánh giá</small>
                            )}
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
                {itinerarySteps.length ? (
                  itinerarySteps.map((item, index) => (
                    <div
                      key={item.id || index}
                      className={`vg-timeline-day ${expandedDay === index ? "is-expanded" : ""}`}
                    >
                      <div
                        className="day-header"
                        onClick={() => setExpandedDay(expandedDay === index ? -1 : index)}
                      >
                        <div className="day-number">{item.time}</div>
                        <h4 className="day-title">{item.title}</h4>
                        <span className="day-arrow">
                          <Icon name="chevronDown" size={18} />
                        </span>
                      </div>
                      <div className="day-body-wrapper">
                        <div className="day-body-content">
                          <p>{item.desc}</p>
                          {item.transport ? <p>Phương tiện: {item.transport}</p> : null}
                          {item.images.length ? (
                            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                              {item.images.map((imgUrl, imgIdx) => (
                                <img
                                  key={imgIdx}
                                  src={imgUrl}
                                  alt={`${item.title} preview ${imgIdx + 1}`}
                                  style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8 }}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="vg-timeline-day is-expanded">
                    <div className="day-header">
                      <h4 className="day-title">Chưa cập nhật lịch trình chi tiết.</h4>
                    </div>
                  </div>
                )}
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