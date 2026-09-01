import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLocale } from "../../contexts/LocaleContext";
import {
  continueCustomerBookingPayment,
  createCustomerBooking,
  fetchActivePendingBooking,
  fetchTourDetail,
  previewCustomerBooking,
} from "../../services/customerApi";
import { getTourReviews } from "../../services/customerReviewApi";
import { readSession, readToken } from "../../services/authStorage";
import Icon from "../../components/customer/Icon";
import LoadingState from "../../components/common/LoadingState";
import { formatVndCurrency } from "../../utils/currencyFormat";
import { mediaUrl } from "../../utils/mediaUrl";
import { formatDestinationPlace, formatDestinationPlaceAddress } from '../../utils/destinationPlaceFormat'
import { STANDARD_AGE_PRICING_RULES } from "../../constants/tourPricing";

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
  if (Number(rule.min_age) >= 12 && (rule.max_age === null || rule.max_age === undefined || Number(rule.max_age) >= 120)) {
    return "Người trưởng thành";
  }
  if (rule.max_age === null || rule.max_age === undefined) return `Từ ${rule.min_age} tuổi trở lên`;
  return `Từ ${rule.min_age} đến ${rule.max_age} tuổi`;
}

function getPricingRuleText(rule) {
  if (rule.pricing_type === "free") return "miễn phí";
  if (rule.pricing_type === "fixed") return formatVndCurrency(rule.price_value ?? 0);
  return `${rule.price_value}% giá người lớn`;
}

function isValidPhone(value) {
  const phone = String(value || "").replace(/\D/g, "");
  return phone.length === 10 && phone.charAt(0) === "0";
}
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDENTITY_REGEX = /^[A-Za-z0-9-]{6,20}$/;
const MAX_BOOKING_GUESTS = 20;
const BOOKING_DRAFT_VERSION = 1;
const BOOKING_DRAFT_STORAGE_PREFIX = "vivugo:booking-draft";

function getBookingDraftStorageKey(tourId) {
  if (!tourId) return "";

  const session = readSession() || {};
  const accountKey = session.id || session.email || "guest";

  return `${BOOKING_DRAFT_STORAGE_PREFIX}:${String(accountKey)}:${String(tourId)}`;
}

function readBookingDraft(storageKey) {
  if (!storageKey || typeof window === "undefined") return null;

  try {
    const rawDraft = window.sessionStorage.getItem(storageKey);
    if (!rawDraft) return null;

    const draft = JSON.parse(rawDraft);
    const checkoutStep = Number(draft?.checkoutStep);

    if (draft?.version !== BOOKING_DRAFT_VERSION || ![1, 2].includes(checkoutStep)) {
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

function writeBookingDraft(storageKey, draft) {
  if (!storageKey || typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Không làm gián đoạn việc nhập thông tin nếu bộ nhớ phiên không khả dụng.
  }
}

function clearBookingDraft(storageKey) {
  if (!storageKey || typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Bản nháp chỉ là dữ liệu hỗ trợ; không chặn luồng đặt tour nếu không xóa được.
  }
}

function normalizePhone(value) {
  return String(value || "").trim().replace(/\D/g, "");
}

function formatBirthDateForDisplay(value) {
  const isoMatch = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!isoMatch) return String(value || "");

  return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
}

function parseBirthDateInput(value) {
  const rawValue = String(value || "");
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);

  if (digits.length < 8) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  return `${year.toString().padStart(4, "0")}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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


function formatReviewDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatReviewDateTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPersistedBookingGroups(participants = []) {
  const groups = new Map();

  participants.forEach((participant) => {
    const label = participant.pricing_rule_label
      || (participant.participant_type === "child" ? "Trẻ em" : "Người lớn");
    const unitPrice = Number(participant.unit_price ?? 0);
    const key = [
      label,
      participant.pricing_type || "",
      participant.pricing_value ?? "",
      unitPrice,
    ].join("|");
    const existing = groups.get(key);

    if (existing) {
      existing.quantity += 1;
      existing.total += unitPrice;
      return;
    }

    groups.set(key, {
      id: `persisted-${groups.size}`,
      label,
      quantity: 1,
      unitPrice,
      total: unitPrice,
    });
  });

  return Array.from(groups.values());
}

function getPersistedBookingPreview(booking) {
  const departure = booking?.tour_departure || {};
  const discountAmount = Number(booking?.discount_amount || 0);
  const totalAmount = Number(booking?.total_amount || 0);

  return {
    tour_departure_id: booking?.tour_departure_id,
    departure_date: departure.departure_date,
    return_date: departure.return_date,
    available_slots: Math.max(
      0,
      Number(departure.total_slots || 0) - Number(departure.booked_slots || 0),
    ),
    total_people: Number(booking?.number_of_people || booking?.participants?.length || 0),
    subtotal: totalAmount + discountAmount,
    discount_amount: discountAmount,
    total_amount: totalAmount,
    pricing_groups: getPersistedBookingGroups(booking?.participants || []),
  };
}

function getReviewUserName(review) {
  return (
    review?.user?.full_name ||
    review?.user_name ||
    review?.customer_name ||
    "Khách hàng"
  );
}

function getSummaryAverage(summary) {
  return Number(
    summary?.average_rating ??
    summary?.average ??
    summary?.rating_average ??
    0
  );
}

function getSummaryCount(summary) {
  return Number(
    summary?.review_count ??
    summary?.total_reviews ??
    summary?.count ??
    summary?.total ??
    0
  );
}

function TourDetailPage({ tourId, tours = [], hasLiveTours = false, favorites = [], onFavorite }) {
  const { currency, formatCurrency } = useLocale();
  const navigate = useNavigate();
  const [expandedDay, setExpandedDay] = useState(0); // Default open first day of schedule
  const [imgError, setImgError] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [detailTour, setDetailTour] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tourReviews, setTourReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({});
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState({});
  const [isExpandedReviews, setIsExpandedReviews] = useState(false);
  const INITIAL_REVIEW_COUNT = 3;

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
  const [bookingConfirmationModal, setBookingConfirmationModal] = useState(null);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [bookingRestoreLoading, setBookingRestoreLoading] = useState(() => Boolean(readToken()));
  const bookingIdempotencyKeyRef = useRef("");
  const bookingDraftHydratedRef = useRef(false);
  const bookingDraftStorageKey = getBookingDraftStorageKey(tourId);
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
    // React giữ nguyên component khi chuyển trực tiếp giữa hai URL chi tiết tour.
    // Xóa dữ liệu checkout của tour trước để ID nhóm giá/lịch khởi hành cũ
    // không làm sai tổng số khách hoặc payload của tour vừa mở.
    setCheckoutStep(1);
    setSelectedDepartureId("");
    setQuantities({});
    setBookingPreview(null);
    setBookingError("");
    setBookingConfirmationModal(null);
    setCreatedBooking(null);
    setParticipants([]);
    setFieldErrors({ contact: {}, participants: {} });
    setContact((current) => ({ ...current, special_request: "" }));
    bookingIdempotencyKeyRef.current = "";
    bookingDraftHydratedRef.current = false;
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

  useEffect(() => {
    let active = true;
    const currentTourId = Number(tour?.id);

    if (!Number.isInteger(currentTourId) || currentTourId <= 0) return undefined;

    const restoreBookingDraft = () => {
      const draft = readBookingDraft(bookingDraftStorageKey);

      if (!draft) return false;

      const currentDepartures = Array.isArray(tour?.departures) ? tour.departures : [];
      const draftDepartureId = String(draft.selectedDepartureId || "");
      const draftDeparture = currentDepartures.find(
        (departure) => String(departure.id) === draftDepartureId,
      );
      const hasDepartureData = currentDepartures.length > 0;
      const hasUsableDeparture = !draftDepartureId
        || !hasDepartureData
        || (
          Boolean(draftDeparture)
          && (!draftDeparture.status || draftDeparture.status === "open")
          && Number(draftDeparture.available_slots ?? 0) > 0
        );
      const restoredDepartureId = hasUsableDeparture ? draftDepartureId : "";
      const restoredParticipants = Array.isArray(draft.participants)
        ? draft.participants.slice(0, MAX_BOOKING_GUESTS).map((participant) => ({
          full_name: participant?.full_name || "",
          phone: participant?.phone || "",
          birth_date: participant?.birth_date || "",
          gender: ["male", "female", "other"].includes(participant?.gender)
            ? participant.gender
            : "male",
          identity_number: participant?.identity_number || "",
        }))
        : [];
      const restoredContact = draft.contact && typeof draft.contact === "object"
        ? {
          contact_name: draft.contact.contact_name || "",
          contact_email: draft.contact.contact_email || "",
          contact_phone: draft.contact.contact_phone || "",
          address: draft.contact.address || "",
          special_request: draft.contact.special_request || "",
        }
        : null;
      const restoredQuantities = draft.quantities && typeof draft.quantities === "object"
        && !Array.isArray(draft.quantities)
        ? draft.quantities
        : {};

      setSelectedDepartureId(restoredDepartureId);
      setQuantities(restoredQuantities);
      setBookingPreview(null);
      setBookingError("");
      setBookingConfirmationModal(null);
      setCreatedBooking(null);
      setParticipants(restoredParticipants);
      setFieldErrors({ contact: {}, participants: {} });
      setUseCustomContact(Boolean(draft.useCustomContact));
      if (restoredContact) {
        setContact((current) => ({ ...current, ...restoredContact }));
      }
      setCheckoutStep(Number(draft.checkoutStep) === 2 && hasUsableDeparture ? 2 : 1);
      bookingDraftHydratedRef.current = true;

      return true;
    };

    if (!readToken()) {
      bookingDraftHydratedRef.current = true;
      setBookingRestoreLoading(false);
      return undefined;
    }

    setBookingRestoreLoading(true);

    fetchActivePendingBooking(currentTourId)
      .then((booking) => {
        if (!active) return;

        setBookingError("");
        setBookingConfirmationModal(null);
        setCreatedBooking(booking || null);
        setBookingPreview(booking ? getPersistedBookingPreview(booking) : null);
        setSelectedDepartureId(booking ? String(booking.tour_departure_id) : "");
        setParticipants(booking?.participants || []);
        setCheckoutStep(booking ? 3 : 1);

        if (booking?.contact) {
          setContact((current) => ({
            ...current,
            ...booking.contact,
          }));
          setUseCustomContact(true);
        }

        if (booking) {
          clearBookingDraft(bookingDraftStorageKey);
          bookingDraftHydratedRef.current = true;
        } else {
          restoreBookingDraft();
          bookingDraftHydratedRef.current = true;
        }

      })
      .catch((error) => {
        if (!active) return;

        if (error.response?.status !== 401) {
          console.warn("Không thể khôi phục đơn chờ thanh toán:", error);
          restoreBookingDraft();
        }

        bookingDraftHydratedRef.current = true;
      })
      .finally(() => {
        if (active) setBookingRestoreLoading(false);
      });

    return () => {
      active = false;
    };
  // Draft được khôi phục theo tour hiện tại; dữ liệu lịch đã có trong snapshot tour khi vào checkout.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour?.id, tourId, bookingDraftStorageKey]);

  useEffect(() => {
    if (!bookingDraftHydratedRef.current || !readToken()) return;

    if (checkoutStep === 3) {
      clearBookingDraft(bookingDraftStorageKey);
      return;
    }

    if (![1, 2].includes(checkoutStep)) return;

    writeBookingDraft(bookingDraftStorageKey, {
      version: BOOKING_DRAFT_VERSION,
      updatedAt: Date.now(),
      checkoutStep,
      selectedDepartureId: String(selectedDepartureId || ""),
      quantities,
      contact,
      participants,
      useCustomContact,
    });
  }, [
    bookingDraftStorageKey,
    checkoutStep,
    contact,
    participants,
    quantities,
    selectedDepartureId,
    useCustomContact,
  ]);

  const reviewSlug =
    detailTour?.slug ||
    listTour?.slug ||
    (Number.isNaN(Number(tourId)) ? String(tourId) : "");

  useEffect(() => {
    let active = true;

    async function loadTourReviews() {
      if (!reviewSlug) {
        setTourReviews([]);
        setReviewSummary({});
        setReviewsError("");
        return;
      }

      try {
        setReviewsLoading(true);
        setReviewsError("");

        const payload = await getTourReviews(reviewSlug, {
          sort: "newest",
          per_page: 10,
        });

        if (!active) return;

        setTourReviews(Array.isArray(payload.reviews) ? payload.reviews : []);
        setReviewSummary(payload.summary || {});
      } catch (error) {
        if (!active) return;

        console.error("Không thể tải đánh giá tour:", error);
        setTourReviews([]);
        setReviewSummary({});
        setReviewsError(
          error?.response?.data?.message ||
          "Không thể tải danh sách đánh giá tour."
        );
      } finally {
        if (active) setReviewsLoading(false);
      }
    }

    loadTourReviews();

    return () => {
      active = false;
    };
  }, [reviewSlug]);

  if (!tour && detailLoading) {
    return (
      <div className="vg-container" style={{ padding: "80px 20px" }}>
        <LoadingState label="Đang tải chi tiết tour..." />
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
  const adultPrice = Number(selectedDeparture?.price ?? displayBasePrice ?? 0);
  const activePricingRules = Array.isArray(tour.age_pricing_rules)
    ? tour.age_pricing_rules.filter((rule) => rule.is_active !== false)
    : [];
  const adultBookingGroup = {
    id: "adult_default",
    ...STANDARD_AGE_PRICING_RULES[2],
  };
  const isDefaultAdultRule = (rule) => rule.id === adultBookingGroup.id;
  const isAdultPricingRule = (rule) => {
    if (isDefaultAdultRule(rule) || rule.pricing_type === "free") return isDefaultAdultRule(rule);

    const minAge = Number(rule.min_age ?? 0);
    const maxAge = rule.max_age === null || rule.max_age === undefined
      ? null
      : Number(rule.max_age);

    return minAge >= 12 && (maxAge === null || maxAge >= 120);
  };
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
    if (rule.pricing_type === "fixed") return Number(rule.price_value ?? 0);
    return Math.round(adultPrice * Number(rule.price_value ?? 100) / 100);
  };
  const totalGuests = bookingGroups.reduce((sum, rule) => sum + getRuleQuantity(rule), 0);
  const localTotal = bookingGroups.reduce((sum, rule) => sum + getRuleQuantity(rule) * getRuleUnitPrice(rule), 0);
  const finalTotal = Number(bookingPreview?.total_amount ?? localTotal);
  const availableSlots = Number(selectedDeparture?.available_slots || tour.slots?.available || 0);
  const persistedParticipants = Array.isArray(createdBooking?.participants)
    ? createdBooking.participants
    : [];
  const persistedBookingGroups = getPersistedBookingGroups(persistedParticipants);
  const usePersistedBookingSnapshot = checkoutStep === 3
    && Boolean(createdBooking?.id)
    && persistedParticipants.length > 0;
  const summaryGroups = usePersistedBookingSnapshot ? persistedBookingGroups : bookingGroups.map((rule) => ({
    id: rule.id,
    label: rule.label,
    quantity: getRuleQuantity(rule),
    unitPrice: getRuleUnitPrice(rule),
    total: getRuleQuantity(rule) * getRuleUnitPrice(rule),
  }));
  const summaryGuests = usePersistedBookingSnapshot
    ? Number(createdBooking.number_of_people || persistedParticipants.length)
    : totalGuests;
  const summaryTotal = usePersistedBookingSnapshot
    ? Number(createdBooking.total_amount || 0)
    : finalTotal;

  const apiRatingAverage = getSummaryAverage(reviewSummary);
  const apiRatingCount = getSummaryCount(reviewSummary);
  const ratingAverage = apiRatingCount > 0
    ? apiRatingAverage
    : Number(tour.rating?.average || tour.average_rating || 0);
  const ratingCount = apiRatingCount > 0
    ? apiRatingCount
    : Number(tour.rating?.count || tour.review_count || 0);
  const hasRating = ratingCount > 0 && ratingAverage > 0;
  const bookingsCount = Number(tour.bookings_count || 0);
  const ratingLabel = ratingAverage >= 4.5
    ? "Xuất sắc"
    : ratingAverage >= 4
      ? "Rất tốt"
      : ratingAverage >= 3
        ? "Khá tốt"
        : "Đang cập nhật";
  const reviewDistribution = [5, 4, 3, 2, 1].map((star) => {
    const actualCount = tourReviews.filter((review) => Math.round(Number(review?.rating || 0)) === star).length;
    const fallbackCount = star === Math.round(ratingAverage) ? Math.max(ratingCount - tourReviews.length, 0) : 0;
    return { star, count: actualCount + fallbackCount };
  });

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
        destinationPlace: item.destination_place || item.destinationPlace || null,
        transport: item.transport || "",
        images: Array.isArray(item.images)
          ? item.images.map((image) => mediaUrl(image?.image_url || image?.url || image)).filter(Boolean)
          : [],
        isGreen: item.type === "activity",
      }))
    : [];
  const serviceInclusions = Array.isArray(tour.inclusions) && tour.inclusions.filter(Boolean).length
    ? tour.inclusions.filter(Boolean)
    : [
      "Phương tiện di chuyển theo lịch trình tour.",
      "Hướng dẫn viên theo đoàn trong suốt hành trình.",
      "Vé tham quan các điểm có ghi trong chương trình.",
      "Nước uống phục vụ theo chương trình tour.",
      "Bảo hiểm du lịch theo quy định của đơn vị tổ chức.",
    ];
  const serviceExclusions = Array.isArray(tour.exclusions) && tour.exclusions.filter(Boolean).length
    ? tour.exclusions.filter(Boolean)
    : [
      "Chi phí cá nhân, mua sắm và các khoản ngoài chương trình.",
      "Đồ uống, dịch vụ phát sinh tại nhà hàng hoặc khách sạn.",
      "Tiền tip cho hướng dẫn viên và tài xế (nếu có).",
      "Thuế VAT và phụ thu phát sinh không được nêu trong giá tour.",
    ];

  const buildQuantitySummary = () => bookingGroups
    .map((rule) => ({
      rule_id: isDefaultAdultRule(rule) ? null : Number(rule.id),
      quantity: getRuleQuantity(rule),
    }))
    .filter((item) => item.quantity > 0);

  const getBookingGroupKey = (rule) => (
    isDefaultAdultRule(rule) ? "adult_default" : String(rule.id)
  );

  const getPricingGroupKeyForAge = (age) => {
    const matchedRule = activePricingRules.find((rule) => {
      const minAge = Number(rule.min_age || 0);
      const maxAge = rule.max_age === null || rule.max_age === undefined
        ? null
        : Number(rule.max_age);

      return age >= minAge && (maxAge === null || age <= maxAge);
    });

    return matchedRule ? String(matchedRule.id) : "adult_default";
  };

  const isCompleteBirthDate = (birthDate) => (
    String(birthDate || "").replace(/\D/g, "").length === 8
  );

  const getParticipantBirthDateErrors = (
    participantList,
    quantitySnapshot = effectiveQuantities,
  ) => {
    const errors = {};
    const selectedQuantities = {};
    const validParticipants = [];
    const referenceDate = selectedDeparture?.departure_date
      || new Date().toISOString().split("T")[0];

    bookingGroups.forEach((rule) => {
      selectedQuantities[getBookingGroupKey(rule)] = Number(quantitySnapshot?.[rule.id] || 0);
    });

    participantList.forEach((participant, index) => {
      const birthDate = String(participant.birth_date || "").trim();

      // Không báo lỗi khi khách vẫn đang nhập dở ngày sinh.
      if (!birthDate || !isCompleteBirthDate(birthDate)) return;

      const age = getAgeFromBirthDate(birthDate, referenceDate);

      if (age === null || age < 0 || age > 120) {
        errors[index] = "Ngày sinh không hợp lệ.";
        return;
      }

      validParticipants.push({
        index,
        groupKey: getPricingGroupKeyForAge(age),
      });
    });

    const actualGroupCounts = validParticipants.reduce((counts, participant) => ({
      ...counts,
      [participant.groupKey]: (counts[participant.groupKey] || 0) + 1,
    }), {});

    Object.entries(actualGroupCounts).forEach(([groupKey, actualCount]) => {
      const allowedCount = selectedQuantities[groupKey] || 0;

      if (actualCount <= allowedCount) return;

      validParticipants
        .filter((participant) => participant.groupKey === groupKey)
        .slice(allowedCount)
        .forEach((participant) => {
          errors[participant.index] = "Ngày sinh không hợp lệ.";
        });
    });

    return errors;
  };

  const syncParticipantBirthDateErrors = (participantList, quantitySnapshot = effectiveQuantities) => {
    const birthDateErrors = getParticipantBirthDateErrors(participantList, quantitySnapshot);

    setFieldErrors((current) => {
      const nextParticipantErrors = { ...current.participants };

      participantList.forEach((_, index) => {
        const nextErrors = { ...(nextParticipantErrors[index] || {}) };

        if (birthDateErrors[index]) nextErrors.birth_date = birthDateErrors[index];
        else delete nextErrors.birth_date;

        if (Object.keys(nextErrors).length) nextParticipantErrors[index] = nextErrors;
        else delete nextParticipantErrors[index];
      });

      return { ...current, participants: nextParticipantErrors };
    });
  };

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

  const getApiErrorMessage = (error, fallback) => {
    const validationErrors = error.response?.data?.errors;
    const firstValidationError = validationErrors
      ? Object.values(validationErrors).flat()[0]
      : null;

    return firstValidationError || error.response?.data?.message || fallback;
  };

  const openBookingIssueModal = (error, fallback) => {
    setBookingConfirmationModal({
      type: "issue",
      title: error.response?.status === 422
        ? "Lịch khởi hành vừa thay đổi"
        : "Chưa thể xác nhận đặt tour",
      message: getApiErrorMessage(error, fallback),
    });
  };

  const updateQuantity = (ruleId, nextQuantity) => {
    const isAdultGroup = String(ruleId) === String(adultPricingRule.id);
    const safeQuantity = Math.max(isAdultGroup ? 1 : 0, nextQuantity);

    const nextTotal = totalGuests - Number(effectiveQuantities[ruleId] || 0) + safeQuantity;

    if (nextTotal > MAX_BOOKING_GUESTS) {
      notifyValidationError(`Mỗi booking được đặt tối đa ${MAX_BOOKING_GUESTS} hành khách.`);
      return;
    }

    if (availableSlots > 0 && nextTotal > availableSlots) {
      notifyValidationError(`Lịch này chỉ còn ${availableSlots} chỗ trống.`);
      return;
    }

    setBookingError("");
    const nextQuantities = { ...effectiveQuantities, [ruleId]: safeQuantity };
    setQuantities((current) => ({ ...nextQuantities, ...current, [ruleId]: safeQuantity }));
    syncParticipantBirthDateErrors(participants, nextQuantities);
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
    const nextParticipants = participants.map((participant, itemIndex) => (
      itemIndex === index ? { ...participant, [field]: value } : participant
    ));

    setParticipants(nextParticipants);
    clearParticipantError(index, field);

    if (field === "birth_date") {
      syncParticipantBirthDateErrors(nextParticipants);
    }
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
        if (age === null || age < 0) itemErrors.birth_date = "Ngày sinh không hợp lệ.";
        else if (age > 120) itemErrors.birth_date = "Ngày sinh không hợp lệ.";
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

    Object.entries(getParticipantBirthDateErrors(participants)).forEach(([index, message]) => {
      errors.participants[index] = {
        ...(errors.participants[index] || {}),
        birth_date: message,
      };
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

  const getBookingPayload = () => ({
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

      if (totalGuests > MAX_BOOKING_GUESTS) {
        notifyValidationError(`Mỗi booking được đặt tối đa ${MAX_BOOKING_GUESTS} hành khách.`);
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
        openBookingIssueModal(error, "Chưa thể kiểm tra số chỗ từ máy chủ, vui lòng thử lại.");
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
        setPreviewLoading(true);
        const latestPreview = await previewCustomerBooking({
          tour_departure_id: Number(selectedDeparture.id),
          quantity_summary: buildQuantitySummary(),
        });
        setBookingPreview(latestPreview);
        setBookingConfirmationModal({ type: "confirm" });
      } catch (error) {
        openBookingIssueModal(error, "Chưa thể kiểm tra số chỗ từ máy chủ, vui lòng thử lại.");
      } finally {
        setPreviewLoading(false);
      }

      return;
    }

    if (!createdBooking?.id && !createdBooking?.checkout_url) {
      notifyRequestError(
        "Không tìm thấy liên kết thanh toán. Vui lòng tiếp tục từ trang đơn hàng."
      );
      return;
    }

    setBookingSubmitting(true);
    try {
      const payment = createdBooking.id
        ? await continueCustomerBookingPayment(createdBooking.id)
        : createdBooking;

      if (!payment?.checkout_url) {
        throw new Error("Không thể tạo liên kết thanh toán VNPAY.");
      }

      window.location.assign(payment.checkout_url);
    } catch (error) {
      notifyRequestError(
        getApiErrorMessage(
          error,
          "Đơn chờ thanh toán có thể đã hết hạn. Vui lòng kiểm tra lại trong trang đơn hàng.",
        ),
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleConfirmBooking = async () => {
    try {
      setBookingSubmitting(true);
      if (!bookingIdempotencyKeyRef.current) {
        bookingIdempotencyKeyRef.current = window.crypto?.randomUUID?.()
          || `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }

      const booking = await createCustomerBooking(
        getBookingPayload(),
        bookingIdempotencyKeyRef.current,
      );

      if (!booking?.checkout_url) {
        throw new Error("Không thể tạo liên kết thanh toán VNPAY.");
      }

      setBookingConfirmationModal(null);
      setCreatedBooking(booking);
      setCheckoutStep(3);
      clearBookingDraft(bookingDraftStorageKey);
      toast.success("Thông tin hợp lệ. Đơn đặt tour đã được tạo.", {
        id: "tour-booking-created",
      });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        error.message || "Không thể tạo đơn chờ thanh toán, vui lòng thử lại.",
      );
      const validationErrors = error.response?.data?.errors || {};
      const isAvailabilityConflict = Boolean(
        validationErrors.number_of_people
        || validationErrors.quantity_summary
        || /chỗ|lịch khởi hành/i.test(message),
      );

      if (
        error.response?.status === 409
        && error.response?.data?.code === "ACTIVE_PENDING_BOOKING"
      ) {
        setBookingConfirmationModal({
          type: "pending",
          title: "Bạn đang có đơn chờ thanh toán",
          message: error.response?.data?.message || "Vui lòng tiếp tục thanh toán đơn hiện có trước khi đặt tour mới.",
          booking: error.response?.data?.data || null,
        });
        return;
      }

      if (isAvailabilityConflict) {
        openBookingIssueModal(error, message);
      } else {
        setBookingConfirmationModal({
          type: "issue",
          title: "Chưa thể tạo đơn đặt tour",
          message,
        });
      }
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleContinuePendingBooking = async () => {
    const pendingBooking = bookingConfirmationModal?.booking;

    if (!pendingBooking?.booking_id) {
      navigate("/customer/profile");
      return;
    }

    try {
      setBookingSubmitting(true);
      const payment = await continueCustomerBookingPayment(pendingBooking.booking_id);

      if (!payment?.checkout_url) {
        throw new Error("Không thể tạo liên kết thanh toán VNPAY.");
      }

      window.location.assign(payment.checkout_url);
    } catch (error) {
      setBookingConfirmationModal({
        type: "issue",
        title: "Không thể tiếp tục thanh toán",
        message: getApiErrorMessage(
          error,
          "Đơn chờ thanh toán có thể đã hết hạn. Vui lòng kiểm tra lại trong trang đơn hàng.",
        ),
      });
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleBookingIssueReturn = () => {
    setBookingConfirmationModal(null);
    setBookingPreview(null);
    setBookingError("");
    bookingIdempotencyKeyRef.current = "";
    setCheckoutStep(1);
  };

  // Filter 3 related tours (excluding current tour)
  const relatedTours = tours
    .filter((t) => String(t.id) !== String(tourId) && String(t.slug) !== String(tourId))
    .slice(0, 3);

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

          {/* Tour Highlights / Description */}
          <div className="vg-tour-description-block vg-tour-description-card">
            <div className="vg-tour-description-heading">
              <div className="vg-tour-heading-left">
                <span className="vg-tour-description-icon">
                  <Icon name="compass" size={19} />
                </span>
                <h3>Điểm nổi bật của chuyến đi</h3>
              </div>
            </div>

            {tour.description ? (
              <p className="vg-detail-summary-text">{tour.description}</p>
            ) : tour.summary ? (
              <p className="vg-detail-summary-text">{tour.summary}</p>
            ) : (
              <p className="vg-detail-summary-text vg-empty-summary">
                Tour này chưa cập nhật phần mô tả chi tiết.
              </p>
            )}
          </div>

          {/* Package Options Layout (2 columns) */}
          <div className="vg-package-options-layout-traveloka">
            {/* Left Column: Option selection form card */}
            <div className="vg-package-options-form-card">
              {/* Step Progress Indicator */}
              <div
                className="vg-checkout-steps-bar"
                style={{ visibility: bookingRestoreLoading ? "hidden" : "visible" }}
              >
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
                  {bookingRestoreLoading && "Đang khôi phục đơn chờ thanh toán"}
                  {!bookingRestoreLoading && checkoutStep === 1 && "Chọn ngày & số lượng"}
                  {!bookingRestoreLoading && checkoutStep === 2 && "Thông tin liên hệ & hành khách"}
                  {!bookingRestoreLoading && checkoutStep === 3 && "Xác nhận đặt tour"}
                </h3>
                {!bookingRestoreLoading && checkoutStep === 1 && (
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

              {bookingRestoreLoading && (
                <div
                  role="status"
                  style={{
                    marginBottom: 20,
                    padding: "16px 18px",
                    border: "1px solid #bfdbfe",
                    borderRadius: 12,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                  }}
                >
                  Đang kiểm tra và khôi phục đơn chờ thanh toán...
                </div>
              )}

              <form
                onSubmit={handleBookingSubmit}
                noValidate
                aria-busy={bookingRestoreLoading}
                style={bookingRestoreLoading
                  ? { pointerEvents: "none", visibility: "hidden", opacity: 0 }
                  : undefined}
              >
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
                                disabled={
                                  totalGuests >= MAX_BOOKING_GUESTS
                                  || (availableSlots > 0 && totalGuests >= availableSlots)
                                }
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
                              <div className="vg-birth-date-control">
                                <input
                                  className="vg-checkout-input vg-birth-date-text"
                                  style={errorInputStyle(Boolean(fieldErrors.participants?.[index]?.birth_date))}
                                  data-validation-error={fieldErrors.participants?.[index]?.birth_date ? "true" : undefined}
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="bday"
                                  placeholder="dd/mm/yyyy"
                                  maxLength={10}
                                  value={formatBirthDateForDisplay(p.birth_date)}
                                  onChange={(e) => updateParticipantField(index, "birth_date", parseBirthDateInput(e.target.value))}
                                  required
                                />
                                <span className="vg-birth-date-picker" title="Chọn ngày sinh">
                                  <Icon name="calendar" size={18} />
                                  <input
                                    className="vg-birth-date-native"
                                    type="date"
                                    aria-label={`Chọn ngày sinh hành khách ${index + 1}`}
                                    max={getTodayDateInputValue()}
                                    value={/^\d{4}-\d{2}-\d{2}$/.test(p.birth_date) ? p.birth_date : ""}
                                    onChange={(e) => updateParticipantField(index, "birth_date", e.target.value)}
                                  />
                                </span>
                              </div>
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
                      Bạn sẽ được chuyển đến VNPAY Sandbox để hoàn tất thanh toán. Link thanh toán có hiệu lực trong 15 phút; chỗ chỉ được xác nhận sau khi thanh toán thành công.
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
                      {formatCurrency(summaryTotal)}
                    </span>
                    <span className="vg-summary-price-label">
                      Tổng tiền cho {summaryGuests} khách hàng
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
                      {checkoutStep === 2 && (previewLoading ? "Đang kiểm tra chỗ..." : "Đến bước xác nhận")}
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
                    {summaryGroups.map((group) => {
                      const qty = Number(group.quantity || 0);
                      if (qty <= 0) return null;
                      const unitPrice = Number(group.unitPrice || 0);
                      return (
                        <div className="price-row" key={group.id}>
                          <span>{group.label} (x{qty})</span>
                          <strong>{formatCurrency(Number(group.total ?? unitPrice * qty))}</strong>
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
                    <strong className="total-amount">{formatCurrency(summaryTotal)}</strong>
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
                          {step.destinationPlace?.name ? (
                            <span className="vg-step-desc-traveloka">
                              Điểm đến: {formatDestinationPlace(step.destinationPlace)}
                            </span>
                          ) : null}
                          {formatDestinationPlaceAddress(step.destinationPlace) ? <span className="vg-step-desc-traveloka">Địa chỉ: {formatDestinationPlaceAddress(step.destinationPlace)}</span> : null}
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
                  {serviceInclusions.map((text, i) => (
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
                  {serviceExclusions.map((text, i) => (
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
                <h4>2. Điều kiện khởi hành</h4>
                <ul>
                  <li>Tour cần tối thiểu 10 hành khách hợp lệ để khởi hành; số khách được tính theo tổng số hành khách, không theo số booking.</li>
                  <li>Hệ thống chốt số lượng trước giờ khởi hành 72 giờ theo múi giờ hệ thống.</li>
                  <li>Nếu đủ điều kiện, tour được xác nhận. Nếu không đủ khách, tour được hủy và ngừng nhận booking mới.</li>
                </ul>
              </div>
              <div className="policy-block">
                <h4>3. Hoàn hủy và phương án hỗ trợ</h4>
                <ul>
                  <li>Khi tour bị hủy do không đủ khách hoặc điều kiện thời tiết, khách không bị áp dụng phí hủy.</li>
                  <li>Khách có thể đổi ngày khởi hành, đổi sang tour khác, nhận hoàn tiền hoặc chuyển thành số dư/voucher nếu hệ thống hỗ trợ.</li>
                  <li>Với booking đã thanh toán, số tiền hoàn không vượt quá số tiền thực tế đã thanh toán. Booking chưa thanh toán không phát sinh hoàn tiền.</li>
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
              <div className="reviews-bars" aria-label="Phân bố điểm đánh giá">
                {hasRating ? reviewDistribution.map(({ star, count }) => (
                  <div className="bar-row" key={star}>
                    <span>{star} sao</span>
                    <div className="bar-bg">
                      <div className="bar-fill" style={{ width: `${Math.round((count / Math.max(ratingCount, 1)) * 100)}%` }} />
                    </div>
                    <span>{count}</span>
                  </div>
                )) : (
                  <p className="reviews-empty-note">Hãy là người đầu tiên chia sẻ trải nghiệm về tour này.</p>
                )}
              </div>
              <div className="reviews-summary-note">
                <span className="reviews-summary-badge">{hasRating ? ratingLabel : "Chưa có đánh giá"}</span>
                <strong>{hasRating ? "Khách hàng đã trải nghiệm tour" : "Đánh giá xác thực"}</strong>
              </div>
            </div>

            <div className="vg-reviews-list">
              {reviewsLoading ? (
                <div className="vg-review-item">
                  <div className="review-main">
                    <LoadingState compact label="Đang tải đánh giá..." />
                  </div>
                </div>
              ) : reviewsError ? (
                <div className="vg-review-item">
                  <div className="review-main">
                    <p className="review-text" style={{ color: "#dc2626" }}>
                      {reviewsError}
                    </p>
                  </div>
                </div>
              ) : tourReviews.length === 0 ? (
                <div className="vg-review-item">
                  <div className="review-main">
                    <p className="review-text">
                      Chưa có nhận xét nào cho tour này.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {(isExpandedReviews ? tourReviews : tourReviews.slice(0, INITIAL_REVIEW_COUNT)).map((review) => {
                    const reviewRating = Number(review?.rating || 0);

                    return (
                      <article key={review.id} className="vg-review-card-premium">
                        <div className="vg-review-header">
                          <div className="vg-review-user-info">
                            <div className="vg-review-avatar">
                              {review?.user?.avatar ? (
                                <img src={mediaUrl(review.user.avatar)} alt={getReviewUserName(review)} />
                              ) : (
                                <span>{getReviewUserName(review).charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="vg-review-meta">
                              <strong className="vg-review-author">{getReviewUserName(review)}</strong>
                              <span className="vg-review-date">
                                Đánh giá ngày {formatReviewDate(review?.created_at) || "gần đây"}
                              </span>
                            </div>
                          </div>

                          <div className="vg-review-rating-pill" aria-label={`${reviewRating} trên 5 sao`}>
                            <span className="pill-star">★</span>
                            <span className="pill-score">{reviewRating.toFixed(1).replace(".0", ",0")}</span>
                            <span className="pill-divider">•</span>
                            <span className="pill-label">
                              {reviewRating >= 4.5 ? "Tuyệt hảo" : reviewRating >= 4 ? "Rất tốt" : reviewRating >= 3 ? "Hài lòng" : "Tạm ổn"}
                            </span>
                          </div>
                        </div>

                        <div className="vg-review-body">
                          <p className="vg-review-comment">
                            {review?.comment || "Khách hàng không để lại nhận xét chi tiết."}
                          </p>
                        </div>

                        <div className="vg-review-footer">
                          <button
                            type="button"
                            onClick={() =>
                              setReviewFeedback((current) => ({
                                ...current,
                                [review.id]: current[review.id] === "helpful" ? null : "helpful",
                              }))
                            }
                            className={`vg-review-helpful-btn ${
                              reviewFeedback[review.id] === "helpful" ? "is-active" : ""
                            }`}
                            aria-pressed={reviewFeedback[review.id] === "helpful"}
                          >
                            <Icon name="heart" size={13} />
                            <span>
                              {reviewFeedback[review.id] === "helpful" ? "Đã cảm ơn" : "Hữu ích"}
                            </span>
                          </button>
                        </div>
                      </article>
                    );
                  })}

                  {tourReviews.length > INITIAL_REVIEW_COUNT && (
                    <div className="vg-reviews-expand-wrapper">
                      <button
                        type="button"
                        className="vg-reviews-expand-btn"
                        onClick={() => setIsExpandedReviews((prev) => !prev)}
                      >
                        {isExpandedReviews ? (
                          <>
                            <span>Thu gọn bớt đánh giá</span>
                            <span className="expand-arrow">↑</span>
                          </>
                        ) : (
                          <>
                            <span>Xem thêm {tourReviews.length - INITIAL_REVIEW_COUNT} đánh giá khác</span>
                            <span className="expand-arrow">↓</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
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

      {bookingConfirmationModal && (
        <div
          className="vg-modal-backdrop"
          role="presentation"
          onClick={() => !bookingSubmitting && setBookingConfirmationModal(null)}
        >
          <div
            className={`vg-success-modal-card booking-confirmation-modal ${bookingConfirmationModal.type === "issue" ? "is-issue" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-confirmation-title"
            onClick={(event) => event.stopPropagation()}
          >
            {bookingConfirmationModal.type === "pending" ? (
              <>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setBookingConfirmationModal(null)}
                  disabled={bookingSubmitting}
                  aria-label="Đóng thông báo đơn chờ thanh toán"
                >
                  <Icon name="close" size={24} />
                </button>

                <div className="modal-icon-warning booking-confirmation-icon">
                  <Icon name="clock" size={34} />
                </div>
                <div className="modal-header-title">
                  <h2 id="booking-confirmation-title">{bookingConfirmationModal.title}</h2>
                  <p className="modal-sub">{bookingConfirmationModal.message}</p>
                </div>

                {bookingConfirmationModal.booking ? (
                  <div className="modal-summary-box">
                    <div className="summary-item">
                      <span>Mã đơn</span>
                      <strong>{bookingConfirmationModal.booking.booking_code}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Tour</span>
                      <strong>{bookingConfirmationModal.booking.tour_title}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Ngày khởi hành</span>
                      <strong>{formatReviewDate(bookingConfirmationModal.booking.departure_date)}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Tổng thanh toán</span>
                      <strong className="price">{formatCurrency(bookingConfirmationModal.booking.total_amount)}</strong>
                    </div>
                  </div>
                ) : null}

                <div className="booking-confirmation-note">
                  <Icon name="clock" size={18} />
                  <span>
                    Link thanh toán của đơn có hiệu lực đến {formatReviewDateTime(bookingConfirmationModal.booking?.expires_at)}. Chỗ chỉ được xác nhận sau khi thanh toán thành công.
                  </span>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-support"
                    onClick={() => {
                      setBookingConfirmationModal(null);
                      navigate("/customer/profile");
                    }}
                    disabled={bookingSubmitting}
                  >
                    Xem đơn hàng
                  </button>
                  <button
                    type="button"
                    className="btn-done"
                    onClick={handleContinuePendingBooking}
                    disabled={bookingSubmitting}
                  >
                    {bookingSubmitting ? "Đang tạo liên kết..." : "Tiếp tục thanh toán"}
                  </button>
                </div>
              </>
            ) : bookingConfirmationModal.type === "confirm" ? (
              <>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setBookingConfirmationModal(null)}
                  disabled={bookingSubmitting}
                  aria-label="Đóng xác nhận đặt tour"
                >
                  <Icon name="close" size={24} />
                </button>

                <div className="modal-icon-success booking-confirmation-icon">
                  <Icon name="shield" size={34} />
                </div>
                <div className="modal-header-title">
                  <h2 id="booking-confirmation-title">Xác nhận đặt tour</h2>
                  <p className="modal-sub">Vui lòng kiểm tra lại thông tin trước khi tạo đơn đặt chỗ.</p>
                </div>

                <div className="modal-summary-box">
                  <div className="summary-item">
                    <span>Tour</span>
                    <strong>{tour.title}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Ngày khởi hành</span>
                    <strong>{formatReviewDate(selectedDeparture?.departure_date)}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Số khách</span>
                    <strong>{totalGuests} người</strong>
                  </div>
                  <div className="summary-item">
                    <span>Chỗ hiện có trước thanh toán</span>
                    <strong>{Number(bookingPreview?.available_slots ?? 0)} chỗ</strong>
                  </div>
                  <div className="summary-item total">
                    <span>Tổng thanh toán</span>
                    <strong className="price">{formatCurrency(finalTotal)}</strong>
                  </div>
                </div>

                <div className="booking-confirmation-note">
                  <Icon name="clock" size={18} />
                  <span>Chỗ chỉ được xác nhận sau khi VNPAY báo thanh toán thành công. Link thanh toán có hiệu lực trong 15 phút.</span>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-support"
                    onClick={() => setBookingConfirmationModal(null)}
                    disabled={bookingSubmitting}
                  >
                    Kiểm tra lại
                  </button>
                  <button
                    type="button"
                    className="btn-done"
                    onClick={handleConfirmBooking}
                    disabled={bookingSubmitting}
                  >
                    {bookingSubmitting ? "Đang tạo đơn..." : "Xác nhận đặt tour"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-icon-warning booking-confirmation-icon">
                  <Icon name="alertCircle" size={34} />
                </div>
                <div className="modal-header-title">
                  <h2 id="booking-confirmation-title">{bookingConfirmationModal.title}</h2>
                  <p className="modal-sub">{bookingConfirmationModal.message}</p>
                </div>

                <div className="booking-issue-message">
                  <Icon name="calendar" size={18} />
                  <span>Đơn đặt tour chưa được tạo. Vui lòng chọn lại lịch khởi hành hoặc số lượng khách.</span>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-done"
                    onClick={handleBookingIssueReturn}
                  >
                    Chọn lại lịch
                  </button>
                </div>
              </>
            )}
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
                          {item.destinationPlace?.name ? (
                            <p><strong>Điểm đến:</strong> {formatDestinationPlace(item.destinationPlace)}</p>
                          ) : null}
                          {formatDestinationPlaceAddress(item.destinationPlace) ? <p><strong>Địa chỉ:</strong> {formatDestinationPlaceAddress(item.destinationPlace)}</p> : null}
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
