import { useEffect, useMemo, useRef, useState } from "react";
import {
  checkInGuideCustomer,
  deleteGuideAttendancePhoto,
  advanceGuideTourStage,
  getGuideAttendanceSessions,
  getGuideAttendanceStatistics,
  getGuideTourCustomerDetail,
  getGuideTourCustomers,
  getGuideTourDetail,
  getGuideTourOngoing,
  getGuideTourStages,
  undoGuideCustomerCheckIn,
  updateGuideAttendanceNote,
  uploadGuideAttendancePhotos,
} from "../../services/guideTourApi";
import { mediaUrl } from "../../utils/mediaUrl";
import {
  formatDate,
  formatNumber,
  getCustomerName,
  getCustomerPhone,
  getCustomerType,
  getDestination,
  getInitials,
  getTourImage,
  getTourState,
  getTourTitle,
  normalizePaginator,
} from "./guidePageUtils";
const filters = [
  { key: "all", label: "Tất cả" },
  { key: "checked", label: "Đã điểm danh" },
  { key: "unchecked", label: "Chưa điểm danh" },
];
const participantTypeLabels = {
  adult: "Người lớn",
  child: "Trẻ em",
  infant: "Em bé",
};
const genderLabels = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};
const MAX_ATTENDANCE_PHOTOS = 6;
const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";
function getVietnameseLabel(value, labels) {
  if (!value) return "Chưa có";
  return labels[String(value).trim().toLowerCase()] || value;
}
function getAttendance(customer) {
  return customer?.attendance || customer?.current_attendance || {};
}
function isChecked(customer) {
  return Boolean(getAttendance(customer)?.checked_in_at);
}
function isAbsent(customer) {
  return String(getAttendance(customer)?.status || "").toLowerCase() === "absent";
}
function isUnchecked(customer) {
  return !isChecked(customer) && !isAbsent(customer);
}
function getCheckTime(customer) {
  const checkedAt = getAttendance(customer)?.checked_in_at;
  if (!checkedAt) return "--:--";
  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime()))
    return String(checkedAt).slice(11, 16) || "--:--";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .trim();
}
function getPageNumbers(currentPage, lastPage) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(lastPage, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
function isSameLocalDate(value) {
  return getSessionDateState(value) === "today";
}
function formatDestinationPlace(place) {
  return place?.name || place?.title || "Chưa xác định";
}
function formatDestinationPlaceAddress(place) {
  return place?.address || place?.full_address || "";
}
function getBusinessDateValue(date = new Date()) {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}
function getSessionDateState(value) {
  if (!value) return "upcoming";
  const sessionDate = String(value).slice(0, 10);
  const today = getBusinessDateValue();

  if (sessionDate === today) return "today";
  return sessionDate < today ? "past" : "upcoming";
}
function getBusinessTimeInMinutes(date = new Date()) {
  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(timeParts.map((part) => [part.type, part.value]));

  return Number(values.hour || 0) * 60 + Number(values.minute || 0);
}
function parseClockMinutes(value) {
  const [hours, minutes] = String(value || "")
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}
function getActivityWindowState(activity, activityIndex, activities, dayState, currentTime) {
  if (dayState === "past") return "past";
  if (dayState === "upcoming") return "upcoming";

  const startMinutes = parseClockMinutes(activity?.start_time);
  const endMinutes = parseClockMinutes(activity?.end_time);
  const nextActivityStart = activities
    .slice(activityIndex + 1)
    .map((item) => parseClockMinutes(item?.start_time))
    .find((value) => value !== null);

  if (startMinutes === null && endMinutes === null) return "unscheduled";

  const windowStart = startMinutes ?? 0;
  const windowEnd = endMinutes ?? nextActivityStart ?? 24 * 60;
  if (windowEnd <= windowStart) return "unscheduled";

  const nowMinutes = getBusinessTimeInMinutes(currentTime);
  if (nowMinutes < windowStart) return "not_started";
  if (nowMinutes >= windowEnd) return "expired";
  return "active";
}
function getSessionScheduledDate(session, tour) {
  const providedDate = session?.scheduled_date || session?.scheduledDate;
  if (providedDate) return providedDate;

  const departureDate = tour?.departure_date;
  const dayNumber = Number(
    session?.itinerary?.day_number || session?.tour_itinerary?.day_number,
  );
  if (!departureDate || !Number.isFinite(dayNumber) || dayNumber < 1) return null;

  const date = new Date(`${String(departureDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + dayNumber - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function getApiErrorMessage(error, fallback) {
  const validationErrors = error?.response?.data?.errors;
  const firstValidationError = validationErrors
    ? Object.values(validationErrors).flat().find(Boolean)
    : null;

  return firstValidationError || error?.response?.data?.message || error?.message || fallback;
}

const TOUR_STAGE_STATUS_META = {
  pending: { label: "Chưa thực hiện", icon: "○" },
  in_progress: { label: "Đang thực hiện", icon: "●" },
  completed: { label: "Đã hoàn thành", icon: "✓" },
  past_unconfirmed: { label: "Đã qua – chưa xác nhận", icon: "!" },
  upcoming: { label: "Sắp tới", icon: "○" },
  not_started: { label: "Chưa đến giờ", icon: "○" },
  expired_unconfirmed: { label: "Đã hết giờ – chưa xác nhận", icon: "!" },
  unscheduled: { label: "Chưa có khung giờ", icon: "?" },
};

function getTourStageStatusMeta(status) {
  return TOUR_STAGE_STATUS_META[status] || { label: "Chưa đồng bộ", icon: "?" };
}

function getTourStageDisplayStatus(stage, dayState, activityWindowState) {
  if (!stage) return null;
  if (stage.status === "completed") return "completed";
  if (dayState === "past" && stage.status !== "completed") return "past_unconfirmed";
  if (dayState === "upcoming" && stage.status !== "completed") return "upcoming";
  if (activityWindowState === "not_started") return "not_started";
  if (activityWindowState === "expired") return "expired_unconfirmed";
  if (activityWindowState === "unscheduled") return "unscheduled";
  return stage.status;
}

function getStageForItinerary(activity, stages) {
  if (!Array.isArray(stages) || !activity) return null;

  const itineraryId = Number(activity.id);
  if (Number.isFinite(itineraryId) && itineraryId > 0) {
    const exactStage = stages.find(
      (stage) => Number(stage?.tour_itinerary_id) === itineraryId,
    );
    if (exactStage) return exactStage;
  }

  const dayNumber = Number(activity.day_number);
  const sortOrder = Number(activity.sort_order);
  if (!Number.isFinite(dayNumber)) return null;

  return stages.find((stage) => (
    Number(stage?.day_number) === dayNumber
    && (!Number.isFinite(sortOrder) || Number(stage?.sort_order) === sortOrder)
    && (!activity.title || stage?.title === activity.title)
  )) || null;
}

function GuideDayItineraryModal({
  tour,
  initialDayNumber = 1,
  sessions = [],
  stages = [],
  stagesLoading = false,
  stageError = "",
  stageFeedback = "",
  stageAdvancing = false,
  onAdvanceStage,
  onClose,
}) {
  const [selectedDayNumber, setSelectedDayNumber] = useState(initialDayNumber);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    setSelectedDayNumber(initialDayNumber);
  }, [initialDayNumber]);

  useEffect(() => {
    const intervalId = setInterval(() => setCurrentTime(new Date()), 30 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  if (!tour) return null;

  const itineraries = Array.isArray(tour?.tour?.itineraries)
    ? tour.tour.itineraries
    : Array.isArray(tour?.itineraries)
      ? tour.itineraries
      : [];

  const daysCount = Math.max(
    sessions.length,
    itineraries.reduce((max, item) => Math.max(max, Number(item?.day_number || 1)), 1),
  );

  const dayActivities = itineraries
    .filter((item, index) => Number(item?.day_number || index + 1) === Number(selectedDayNumber))
    .sort((a, b) => {
      const sortOrderDiff = Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
      if (sortOrderDiff !== 0) return sortOrderDiff;
      const timeA = String(a?.start_time || "");
      const timeB = String(b?.start_time || "");
      return timeA.localeCompare(timeB);
    });

  const currentSession = sessions.find((_, idx) => idx + 1 === Number(selectedDayNumber));
  const scheduledDate = currentSession?.scheduled_date
    || getSessionScheduledDate(currentSession, tour)
    || getSessionScheduledDate({ itinerary: { day_number: selectedDayNumber } }, tour);
  const dayState = getSessionDateState(scheduledDate);

  return (
    <div className="guide-tour-detail-backdrop" role="presentation" onClick={onClose}>
      <section
        className="guide-tour-detail-modal guide-day-itinerary-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Lịch trình chi tiết"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="guide-itinerary-modal-header">
          <div className="guide-itinerary-modal-header-main">
            <div className="guide-itinerary-modal-kicker-wrap">
              <span className="guide-itinerary-modal-kicker">Lịch trình chi tiết</span>
              {getDestination(tour) ? (
                <span className="guide-itinerary-modal-dest-badge">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {getDestination(tour)}
                </span>
              ) : null}
            </div>
            <h2 className="guide-itinerary-modal-title">{getTourTitle(tour)}</h2>
            <div className="guide-itinerary-modal-subtitle">
              <span className="guide-itinerary-modal-day-pill">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Ngày {selectedDayNumber}
              </span>
              {scheduledDate ? (
                <span className="guide-itinerary-modal-date-text">
                  {formatDate(scheduledDate)}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="guide-itinerary-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng popup lịch trình"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {daysCount > 1 ? (
          <div className="guide-itinerary-modal-day-tabs" role="tablist" aria-label="Chọn ngày xem lịch trình">
            {Array.from({ length: daysCount }).map((_, idx) => {
              const dayNum = idx + 1;
              const session = sessions[idx];
              const dateState = session ? getSessionDateState(session.scheduled_date) : null;
              const isActive = dayNum === Number(selectedDayNumber);
              const stateLabel = dateState === "today" ? "Hôm nay" : dateState === "past" ? "Đã qua" : "Sắp tới";

              return (
                <button
                  key={dayNum}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`guide-itinerary-modal-day-tab ${isActive ? "is-active" : ""} ${dateState ? `is-state-${dateState}` : ""}`}
                  onClick={() => setSelectedDayNumber(dayNum)}
                >
                  <span className="guide-itinerary-tab-day">Ngày {dayNum}</span>
                  <strong className="guide-itinerary-tab-date">
                    {session?.scheduled_date ? formatDate(session.scheduled_date) : `Ngày ${dayNum}`}
                  </strong>
                  {dateState ? (
                    <span className={`guide-itinerary-tab-badge is-${dateState}`}>
                      <span className="guide-itinerary-tab-dot" aria-hidden="true" />
                      {stateLabel}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {stageError ? (
          <div className="guide-itinerary-modal-feedback is-error" role="alert">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{stageError}</span>
          </div>
        ) : null}
        {stageFeedback ? (
          <div className="guide-itinerary-modal-feedback" role="status">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{stageFeedback}</span>
          </div>
        ) : null}

        {dayState !== "today" ? (
          <div className={`guide-itinerary-modal-day-notice is-${dayState}`} role="status">
            <span className="guide-itinerary-notice-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
            <div className="guide-itinerary-notice-content">
              <strong>{dayState === "past" ? "Lưu ý ngày đã qua" : "Lưu ý ngày sắp tới"}</strong>
              <p>
                {dayState === "past"
                  ? "Ngày này đã qua. Lịch trình chỉ được xem lại, không thể xác nhận bổ sung."
                  : "Ngày này chưa diễn ra. Lịch trình này dùng để xem trước các hoạt động dự kiến."}
              </p>
            </div>
          </div>
        ) : null}

        <div className="guide-itinerary-modal-body">
          {dayActivities.length > 0 ? (
            <div className="guide-itinerary-modal-steps">
              {dayActivities.map((step, index) => (
                (() => {
                  const stage = getStageForItinerary(step, stages);
                  const activityWindowState = getActivityWindowState(
                    step,
                    index,
                    dayActivities,
                    dayState,
                    currentTime,
                  );
                  const displayStatus = getTourStageDisplayStatus(
                    stage,
                    dayState,
                    activityWindowState,
                  );
                  const statusMeta = getTourStageStatusMeta(displayStatus);
                  const canConfirm = dayState === "today"
                    && activityWindowState === "active"
                    && stage?.status === "in_progress"
                    && !stageAdvancing
                    && typeof onAdvanceStage === "function";
                  const statusTargetLabel = step.destination_place
                    ? "điểm đến"
                    : "hoạt động";

                  return (
                    <article
                      key={step.id || index}
                      className={`guide-itinerary-modal-step is-stage-${displayStatus || "unknown"}`}
                    >
                      <div className="guide-itinerary-step-badge-col" aria-hidden="true">
                        <span className="guide-itinerary-step-num">{index + 1}</span>
                      </div>

                      <div className="guide-itinerary-step-card-content">
                        <div className="guide-itinerary-modal-step-header">
                          <span className="guide-itinerary-modal-step-time">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {step.start_time ? String(step.start_time).slice(0, 5) : "--:--"}
                            {step.end_time ? ` - ${String(step.end_time).slice(0, 5)}` : ""}
                          </span>
                          <h4 className="guide-itinerary-step-title">{step.title || `Hoạt động ${index + 1}`}</h4>
                          {stage ? (
                            <span className={`guide-itinerary-modal-step-status is-${displayStatus}`}>
                              <span className="guide-itinerary-status-dot" aria-hidden="true" />
                              {statusMeta.label}
                            </span>
                          ) : null}
                        </div>

                        <div className="guide-itinerary-step-info-grid">
                          {step.destination_place?.name ? (
                            <div className="guide-itinerary-info-item is-destination">
                              <span className="guide-itinerary-info-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                              </span>
                              <div className="guide-itinerary-info-text">
                                <span className="guide-itinerary-info-label">Điểm đến</span>
                                <strong className="guide-itinerary-info-value">{formatDestinationPlace(step.destination_place)}</strong>
                              </div>
                            </div>
                          ) : null}

                          {formatDestinationPlaceAddress(step.destination_place) ? (
                            <div className="guide-itinerary-info-item is-address">
                              <span className="guide-itinerary-info-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                </svg>
                              </span>
                              <div className="guide-itinerary-info-text">
                                <span className="guide-itinerary-info-label">Địa chỉ</span>
                                <span className="guide-itinerary-info-value">{formatDestinationPlaceAddress(step.destination_place)}</span>
                              </div>
                            </div>
                          ) : null}

                          {step.duration ? (
                            <div className="guide-itinerary-info-item is-duration">
                              <span className="guide-itinerary-info-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 15 15" />
                                </svg>
                              </span>
                              <div className="guide-itinerary-info-text">
                                <span className="guide-itinerary-info-label">Thời lượng</span>
                                <strong className="guide-itinerary-info-value">{step.duration}</strong>
                              </div>
                            </div>
                          ) : null}

                          {step.transport ? (
                            <div className="guide-itinerary-info-item is-transport">
                              <span className="guide-itinerary-info-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="4" width="18" height="16" rx="2" />
                                  <line x1="16" y1="2" x2="16" y2="4" />
                                  <line x1="8" y1="2" x2="8" y2="4" />
                                  <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                              </span>
                              <div className="guide-itinerary-info-text">
                                <span className="guide-itinerary-info-label">Di chuyển</span>
                                <strong className="guide-itinerary-info-value">{step.transport}</strong>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {stripHtml(step.description) ? (
                          <div className="guide-itinerary-modal-step-desc-box">
                            <p>{stripHtml(step.description)}</p>
                          </div>
                        ) : null}

                        {stage ? (
                          <div className={`guide-itinerary-modal-step-confirmation is-${displayStatus}`}>
                            <div className="guide-itinerary-confirm-state-wrap">
                              <span className="guide-itinerary-confirm-state-label">Tình trạng {statusTargetLabel}</span>
                              <strong className="guide-itinerary-confirm-state-val">{statusMeta.label}</strong>
                            </div>
                            {canConfirm ? (
                              <button
                                type="button"
                                className="guide-itinerary-modal-confirm-btn"
                                onClick={() => onAdvanceStage(stage)}
                                disabled={stageAdvancing}
                              >
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {stageAdvancing ? "Đang xác nhận..." : `Xác nhận hoàn thành ${statusTargetLabel}`}
                              </button>
                            ) : null}
                          </div>
                        ) : stagesLoading ? (
                          <div className="guide-itinerary-modal-step-status-loading" role="status">
                            <span className="guide-itinerary-inline-spinner" aria-hidden="true" />
                            Đang tải tình trạng...
                          </div>
                        ) : (
                          <div className="guide-itinerary-modal-step-status-loading">
                            Chưa có dữ liệu xác nhận cho {statusTargetLabel} này.
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })()
              ))}
            </div>
          ) : (
            <div className="guide-itinerary-modal-empty">
              <div className="guide-itinerary-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h4>Chưa có lịch trình cho Ngày {selectedDayNumber}</h4>
              <p>Chưa có thông tin hoạt động chi tiết cho Ngày {selectedDayNumber}.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
function GuideAttendancePage() {
  const [selectedTour, setSelectedTour] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [customerType, setCustomerType] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [customerMeta, setCustomerMeta] = useState({ total: 0, per_page: 10 });
  const [attendanceStats, setAttendanceStats] = useState({ total_customers: 0, checked_in: 0, not_checked_in: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [photoAlbumOpen, setPhotoAlbumOpen] = useState(false);
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);
  const [itineraryModalDayNumber, setItineraryModalDayNumber] = useState(1);
  const [tourStages, setTourStages] = useState([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [stageAdvancing, setStageAdvancing] = useState(false);
  const [stageError, setStageError] = useState("");
  const [stageFeedback, setStageFeedback] = useState("");
  const photoInputRef = useRef(null);
  useEffect(() => {
    let mounted = true;
    async function loadTours() {
      setLoading(true);
      setError("");
      try {
        const ongoing = await getGuideTourOngoing({ per_page: 1 });
        if (!mounted) return;
        const list = normalizePaginator(ongoing).items;
        const tour = list[0] || null;
        setSelectedTour(tour);
      } catch (err) {
        if (mounted)
          setError(
            err?.response?.data?.message || "Không tải được tour điểm danh.",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadTours();
    return () => {
      mounted = false;
    };
  }, []);
  const selectedTourId = selectedTour?.id;
  const selectedTourDepartureDate = selectedTour?.departure_date;

  useEffect(() => {
    if (!selectedTourId) return undefined;
    let mounted = true;
    async function loadCustomers() {
      setLoading(true);
      setError("");
      try {
        const sessionsPayload = await getGuideAttendanceSessions(selectedTourId);
        const rawSessions = Array.isArray(sessionsPayload) ? sessionsPayload : sessionsPayload?.data || [];
        const sessions = rawSessions.map((session) => ({
          ...session,
          scheduled_date: getSessionScheduledDate(session, {
            departure_date: selectedTourDepartureDate,
          }),
        }));
        const currentSession = sessions.find((session) => String(session.id) === String(sessionId))
          || sessions.find((session) => session.can_take_attendance === true)
          || sessions.find((session) => isSameLocalDate(session.scheduled_date))
          || sessions[0]
          || null;
        const status = activeFilter === "checked" ? "checked_in" : activeFilter === "unchecked" ? "not_checked_in" : undefined;
        const [detail, customerPayload, statistics] = await Promise.all([
          getGuideTourDetail(selectedTourId).catch(() => null),
          getGuideTourCustomers(selectedTourId, {
            page,
            per_page: 10,
            keyword: keyword.trim() || undefined,
            status,
            attendance_session_id: currentSession?.id,
          }),
          getGuideAttendanceStatistics(selectedTourId, {
            attendance_session_id: currentSession?.id,
          }),
        ]);
        if (!mounted) return;
        const customerPage = normalizePaginator(customerPayload);
        setSelectedTour((current) => detail || current);
        setAttendanceSessions(sessions);
        setCustomers(customerPage.items);
        setCustomerMeta(customerPage.meta);
        setSessionId(currentSession?.id || null);
        setAttendanceStats(statistics);
      } catch (err) {
        if (mounted)
          setError(
            getApiErrorMessage(err, "Không tải được danh sách khách."),
          );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadCustomers();
    return () => {
      mounted = false;
    };
  }, [activeFilter, keyword, page, selectedTourDepartureDate, selectedTourId, sessionId]);

  useEffect(() => {
    if (!itineraryModalOpen || !selectedTourId) return undefined;

    let mounted = true;
    setStagesLoading(true);
    setStageError("");
    setStageFeedback("");
    setTourStages([]);

    async function loadTourStages() {
      try {
        const payload = await getGuideTourStages(selectedTourId);
        if (!mounted) return;

        const stages = Array.isArray(payload) ? payload : payload?.stages;
        setTourStages(Array.isArray(stages) ? stages : []);
      } catch (err) {
        if (mounted) {
          setStageError(
            getApiErrorMessage(err, "Không tải được tình trạng các điểm đến."),
          );
        }
      } finally {
        if (mounted) setStagesLoading(false);
      }
    }

    void loadTourStages();

    return () => {
      mounted = false;
    };
  }, [itineraryModalOpen, selectedTourId]);

  const stats = useMemo(() => ({
    total: Number(attendanceStats.total_customers || 0),
    checked: Number(attendanceStats.checked_in || 0),
    unchecked: Number(attendanceStats.not_checked_in || 0),
    absent: Number(attendanceStats.absent || 0),
  }), [attendanceStats]);
  const visibleCustomers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return customers.filter((customer) => {
      if (activeFilter === "checked" && !isChecked(customer)) return false;
      if (activeFilter === "unchecked" && !isUnchecked(customer)) return false;
      if (customerType !== "all" && getCustomerType(customer) !== customerType)
        return false;
      if (!normalizedKeyword) return true;
      return `${getCustomerName(customer)} ${getCustomerPhone(customer)}`
        .toLowerCase()
        .includes(normalizedKeyword);
    });
  }, [activeFilter, customerType, customers, keyword]);
  async function ensureSession() {
    if (sessionId) return sessionId;
    throw new Error("Tour chưa có phiên điểm danh theo lịch trình.");
  }

  async function confirmTourStage(stage) {
    if (!selectedTourId || stage?.status !== "in_progress" || stageAdvancing) return;

    setStageAdvancing(true);
    setStageError("");
    setStageFeedback("");

    try {
      const payload = await advanceGuideTourStage(selectedTourId);
      const stages = Array.isArray(payload) ? payload : payload?.stages;
      setTourStages(Array.isArray(stages) ? stages : []);
      setStageFeedback(`Đã xác nhận hoàn thành ${stage.title || "hoạt động hiện tại"}.`);
    } catch (err) {
      setStageError(
        getApiErrorMessage(err, "Không thể cập nhật tình trạng điểm đến."),
      );
    } finally {
      setStageAdvancing(false);
    }
  }
  async function markCustomer(customer) {
    if (isChecked(customer) || busy) return;
    setBusy(true);
    setError("");
    try {
      const activeSession = await ensureSession();
      const updated = await checkInGuideCustomer(
        selectedTour.id,
        activeSession,
        customer.id,
      );
      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id
            ? { ...item, attendance: updated.attendance || updated }
            : item,
        ),
      );
      setAttendanceStats((current) => ({ ...current, checked_in: Number(current.checked_in || 0) + 1, not_checked_in: Math.max(Number(current.not_checked_in || 0) - 1, 0) }));
      setMessage(`Đã điểm danh ${getCustomerName(customer)}.`);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Không điểm danh được khách này."),
      );
    } finally {
      setBusy(false);
    }
  }
  async function undoCustomer(customer) {
    if (!isChecked(customer) || busy) return;
    setBusy(true);
    setError("");
    try {
      const activeSession = await ensureSession();
      const updated = await undoGuideCustomerCheckIn(
        selectedTour.id,
        activeSession,
        customer.id,
      );
      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id
            ? { ...item, attendance: updated.attendance || updated }
            : item,
        ),
      );
      setAttendanceStats((current) => ({
        ...current,
        checked_in: Math.max(Number(current.checked_in || 0) - 1, 0),
        not_checked_in: Number(current.not_checked_in || 0) + 1,
      }));
      setMessage(`Đã hoàn tác điểm danh ${getCustomerName(customer)}.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Không thể hoàn tác điểm danh khách này."));
    } finally {
      setBusy(false);
    }
  }
  async function openCustomerDetail(customer) {
    setDetailLoading(true);
    setError("");
    try {
      const detail = await getGuideTourCustomerDetail(selectedTour.id, customer.id);
      setCustomerDetail({ ...detail, listItem: customer });
    } catch (err) {
      setError(getApiErrorMessage(err, "Không tải được chi tiết khách hàng."));
    } finally {
      setDetailLoading(false);
    }
  }
  async function uploadPhotos(photos) {
    if (!photos.length || busy || !selectedSession) return;

    const uploadedPhotoCount = Array.isArray(selectedSession.photos) ? selectedSession.photos.length : 0;
    const remainingPhotoCount = Math.max(MAX_ATTENDANCE_PHOTOS - uploadedPhotoCount, 0);

    if (photos.length > remainingPhotoCount) {
      setMessage("");
      setError(
        remainingPhotoCount > 0
          ? `Ngày này đã có ${uploadedPhotoCount} ảnh. Bạn chỉ có thể tải thêm ${remainingPhotoCount} ảnh (tối đa ${MAX_ATTENDANCE_PHOTOS} ảnh).`
          : `Ngày này đã đủ ${MAX_ATTENDANCE_PHOTOS} ảnh. Không thể tải thêm ảnh.`,
      );
      return;
    }

    setBusy(true);
    setError("");
    try {
      const updatedSession = await uploadGuideAttendancePhotos(
        selectedTour.id,
        selectedSession.id,
        photos,
      );
      setAttendanceSessions((current) => current.map((session) => (
        session.id === updatedSession.id ? updatedSession : session
      )));
      setMessage(`Đã tải lên ${photos.length} ảnh cho ${selectedSession.name}.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Không thể tải ảnh điểm danh."));
    } finally {
      setBusy(false);
    }
  }
  function choosePhotos(event) {
    const photos = Array.from(event.target.files || []);
    event.target.value = "";
    void uploadPhotos(photos);
  }
  function dropPhotos(event) {
    event.preventDefault();
    setIsDraggingPhotos(false);
    if (!canUploadPhotos || busy) return;
    const photos = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
    void uploadPhotos(photos);
  }
  async function deletePhoto(photo) {
    if (busy || !selectedSession || !canOperateSession) return;
    setBusy(true);
    setError("");
    try {
      const updatedSession = await deleteGuideAttendancePhoto(
        selectedTour.id,
        selectedSession.id,
        photo.id,
      );
      setAttendanceSessions((current) => current.map((session) => (
        session.id === updatedSession.id ? updatedSession : session
      )));
      setMessage("Đã xóa ảnh điểm danh.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Không thể xóa ảnh điểm danh."));
    } finally {
      setBusy(false);
    }
  }
  function openNote(customer) {
    setNoteTarget(customer);
    setNoteText(getAttendance(customer)?.note || customer?.note || "");
  }
  async function saveNote(event) {
    event.preventDefault();
    if (!noteTarget) return;
    setBusy(true);
    setError("");
    try {
      const activeSession = await ensureSession();
      const updated = await updateGuideAttendanceNote(
        selectedTour.id,
        activeSession,
        noteTarget.id,
        noteText.trim(),
      );
      setCustomers((current) =>
        current.map((item) =>
          item.id === noteTarget.id
            ? { ...item, attendance: updated.attendance || updated }
            : item,
        ),
      );
      setNoteTarget(null);
      setNoteText("");
      setMessage("Đã lưu ghi chú khách hàng.");
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Không lưu được ghi chú."),
      );
    } finally {
      setBusy(false);
    }
  }
  const tourImage = getTourImage(selectedTour);
  const totalRows = customerMeta.total || customers.length;
  const canOperate =
    selectedTour?.can_take_attendance ??
    getTourState(selectedTour) === "ongoing";
  const selectedSession = attendanceSessions.find(
    (session) => String(session.id) === String(sessionId),
  );
  function selectAttendanceSession(session) {
    if (!session?.id) return;

    const total = Number(attendanceStats.total_customers || customerMeta.total || 0);
    const checked = Number(session.checked_in_count || 0)
      + Number(session.checked_out_count || 0);
    const absent = Number(session.absent_count || 0);

    setSessionId(session.id);
    setAttendanceStats({
      total_customers: total,
      checked_in: checked,
      not_checked_in: Math.max(total - checked - absent, 0),
      absent,
      checked_out: Number(session.checked_out_count || 0),
    });
    setPage(1);
    setPhotoAlbumOpen(false);
  }
  const canOperateSession =
    canOperate &&
    Boolean(selectedSession) &&
    selectedSession?.status !== "closed" &&
    selectedSession?.can_take_attendance === true;
  const isReadOnlySession = Boolean(selectedSession) && !canOperateSession;
  const uploadedPhotoCount = Array.isArray(selectedSession?.photos) ? selectedSession.photos.length : 0;
  const remainingPhotoCount = Math.max(MAX_ATTENDANCE_PHOTOS - uploadedPhotoCount, 0);
  const canUploadPhotos = canOperateSession && remainingPhotoCount > 0;
  const firstCustomer = customers.length ? (page - 1) * Number(customerMeta.per_page || 10) + 1 : 0;
  const totalPages = Math.max(1, Number(customerMeta.last_page || Math.ceil(totalRows / 10) || 1));

  return (
    <div className="guide-attendance-shot-page">
      {error || message ? (
        <div
          className={
            error ? "guide-profile-alert is-error" : "guide-profile-alert"
          }
        >
          {error || message}
        </div>
      ) : null}
      {selectedTour ? (
        <>
          <section className="guide-attendance-summary">
            <article className="guide-attendance-tour-card">
              <div className="guide-attendance-cover">
                {tourImage ? (
                  <img src={tourImage} alt={getTourTitle(selectedTour)} />
                ) : (
                  <span>{getInitials(getTourTitle(selectedTour))}</span>
                )}
              </div>
              <div className="guide-attendance-tour-copy">
                <div>
                  <h1>{getTourTitle(selectedTour)}</h1>
                  <span>
                    {canOperate ? "Đang diễn ra" : "Chưa thể điểm danh"}
                  </span>
                </div>
                <p>
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  {formatDate(selectedTour.departure_date)} -{" "}
                  {formatDate(
                    selectedTour.return_date || selectedTour.departure_date,
                  )}
                </p>
                <p>
                  <svg viewBox="0 0 24 24">
                    <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {formatNumber(stats.total)} khách
                </p>
              </div>
            </article>
          </section>
          <section className="guide-attendance-stats">
            <article className="tone-blue">
              <span>Tổng khách</span>
              <strong>{formatNumber(stats.total)}</strong>
              <small>100%</small>
            </article>
            <article className="tone-green">
              <span>Đã điểm danh</span>
              <strong>{formatNumber(stats.checked)}</strong>
              <small>
                {stats.total
                  ? Math.round((stats.checked / stats.total) * 100)
                  : 0}
                %
              </small>
            </article>
            <article className="tone-red">
              <span>Chưa điểm danh</span>
              <strong>{formatNumber(stats.unchecked)}</strong>
              <small>
                {stats.total
                  ? Math.round((stats.unchecked / stats.total) * 100)
                  : 0}
                %
              </small>
            </article>
          </section>
          <section className="guide-attendance-card">
            <div className="guide-attendance-media-panel">
              <div className="guide-attendance-media-heading">
                <div>
                  <span>Lịch điểm danh</span>
                  <h2>Chọn ngày của hành trình</h2>
                  <p>Mỗi ngày lưu danh sách điểm danh và hình ảnh riêng.</p>
                </div>
                <strong>{attendanceSessions.length} ngày</strong>
              </div>
              <div className="guide-attendance-day-list" role="tablist" aria-label="Chọn ngày điểm danh">
                {attendanceSessions.map((session, index) => {
                  const dateState = getSessionDateState(session.scheduled_date);
                  const isActive = String(session.id) === String(sessionId);
                  const stateLabel = dateState === "today" ? "Hôm nay" : dateState === "past" ? "Đã qua" : "Sắp tới";
                  const dayNumber = index + 1;

                  return (
                    <div
                      key={session.id}
                      role="tab"
                      aria-selected={isActive}
                      className={`guide-attendance-day-card is-${dateState} ${isActive ? "is-active" : ""}`}
                      onClick={() => selectAttendanceSession(session)}
                    >
                      <div className="guide-attendance-day-card-header">
                        <span>Ngày {dayNumber}</span>
                        <button
                          type="button"
                          className="guide-attendance-day-itinerary-btn"
                          title={`Xem lịch trình Ngày ${dayNumber}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setItineraryModalDayNumber(dayNumber);
                            setItineraryModalOpen(true);
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span>Lịch trình</span>
                        </button>
                      </div>
                      <strong>{formatDate(session.scheduled_date)}</strong>
                      <small>{stateLabel}</small>
                    </div>
                  );
                })}
              </div>
              {Array.isArray(selectedSession?.photos) && selectedSession.photos.length ? (
                <div className="guide-attendance-photo-section">
                  <button
                    type="button"
                    className={`guide-attendance-photo-stack ${photoAlbumOpen ? "is-open" : ""}`}
                    onClick={() => setPhotoAlbumOpen((open) => !open)}
                    aria-expanded={photoAlbumOpen}
                    aria-label={photoAlbumOpen ? "Thu gọn tập ảnh" : `Mở tập ${selectedSession.photos.length} ảnh điểm danh`}
                    title={photoAlbumOpen ? "Thu gọn tập ảnh" : "Xem tất cả ảnh"}
                  >
                    <span className="guide-attendance-photo-stack-cards">
                      {selectedSession.photos.slice(0, 3).map((photo, index) => (
                        <img key={photo.id} src={mediaUrl(photo.url)} alt="" style={{ "--stack-index": index }} />
                      ))}
                    </span>
                  </button>
                  {photoAlbumOpen ? (
                    <div className="guide-attendance-photo-gallery">
                      {selectedSession.photos.map((photo, index) => (
                        <article key={photo.id} className="guide-attendance-photo-item">
                          <a href={mediaUrl(photo.url)} target="_blank" rel="noreferrer" title={photo.original_name || `Ảnh ${index + 1}`}>
                            <img src={mediaUrl(photo.url)} alt={photo.original_name || "Ảnh điểm danh"} />
                            <span>Ảnh {index + 1}</span>
                          </a>
                          {canOperateSession ? (
                            <button type="button" disabled={busy} onClick={() => deletePhoto(photo)} aria-label={`Xóa ${photo.original_name || `ảnh ${index + 1}`}`} title="Xóa ảnh">
                              ×
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div
                className={`guide-attendance-photo-dropzone ${isDraggingPhotos ? "is-dragging" : ""} ${!canUploadPhotos ? "is-disabled" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (canUploadPhotos) setIsDraggingPhotos(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDraggingPhotos(false)}
                onDrop={dropPhotos}
              >
                <div className="guide-attendance-upload-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M5 15v4h14v-4"/></svg>
                </div>
                <div>
                  <strong>{busy ? "Đang tải ảnh lên..." : remainingPhotoCount > 0 ? "Thêm ảnh cho ngày điểm danh" : "Đã đủ 6 ảnh cho ngày này"}</strong>
                  <p>Kéo thả ảnh vào đây hoặc bấm nút để chọn ảnh từ thiết bị.</p>
                  <small>JPG, PNG hoặc WEBP · còn {remainingPhotoCount}/{MAX_ATTENDANCE_PHOTOS} ảnh · 5 MB/ảnh</small>
                </div>
                <button type="button" disabled={busy || !canUploadPhotos} onClick={() => photoInputRef.current?.click()}>
                  Chọn ảnh
                </button>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || !canUploadPhotos} onChange={choosePhotos} />
              </div>
            </div>

            {isReadOnlySession ? (
              <div className="guide-attendance-readonly-notice" role="status">
                Mốc này không diễn ra hôm nay nên chỉ có thể xem lịch sử điểm danh.
              </div>
            ) : null}
                <nav className="guide-attendance-tabs">
                  {filters.map((filter) => {
                    const count =
                      filter.key === "checked"
                        ? stats.checked
                        : filter.key === "unchecked"
                          ? stats.unchecked
                          : stats.total;
                    return (
                      <button
                        key={filter.key}
                        type="button"
                        className={activeFilter === filter.key ? "is-active" : ""}
                        onClick={() => {
                          setActiveFilter(filter.key);
                          setPage(1);
                        }}
                      >
                        {filter.label} ({count})
                      </button>
                    );
                  })}
                </nav>
                <div className="guide-attendance-toolbar">
                  <label>
                    <input
                      value={keyword}
                      onChange={(event) => {
                        setKeyword(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Tìm kiếm khách theo tên, SĐT..."
                    />
                  </label>
                  <select
                    value={customerType}
                    onChange={(event) => {
                      setCustomerType(event.target.value);
                      setPage(1);
                    }}
                    aria-label="Lọc loại khách"
                  >
                    <option value="all">Tất cả loại khách</option>
                    <option value="Người lớn">Người lớn</option>
                    <option value="Trẻ em">Trẻ em</option>
                  </select>
                </div>
                <div className="guide-attendance-table">
                  <div className="guide-attendance-table-head">
                    <span></span>
                    <span>STT</span>
                    <span>Họ và tên</span>
                    <span>Loại khách</span>
                    <span>Trạng thái</span>
                    <span>Thời gian</span>
                    <span>Thao tác</span>
                  </div>
                  {loading ? (
                    <div className="guide-shot-empty">Đang tải khách hàng...</div>
                  ) : null}
                  {!loading &&
                    visibleCustomers.map((customer, index) => (
                      <div className="guide-attendance-row" key={customer.id}>
                        <span>
                          <input
                            type="checkbox"
                            checked={isChecked(customer)}
                            disabled={busy || !canOperateSession}
                            onChange={() =>
                              isChecked(customer)
                                ? undoCustomer(customer)
                                : markCustomer(customer)
                            }
                          />
                        </span>
                        <span>{firstCustomer + index}</span>
                        <span className="guide-attendance-person">
                          <b>{getInitials(getCustomerName(customer))}</b>
                          <em>
                            <strong>{getCustomerName(customer)}</strong>
                            <small>{getCustomerPhone(customer)}</small>
                          </em>
                        </span>
                        <span>
                          <i
                            className={
                              getCustomerType(customer) === "Trẻ em"
                                ? "is-child"
                                : ""
                            }
                          >
                            {getCustomerType(customer)}
                          </i>
                        </span>
                        <span>
                          <mark
                            className={
                              isChecked(customer) ? "is-done" : "is-missing"
                            }
                          >
                            {isChecked(customer)
                              ? "Đã điểm danh"
                              : "Chưa điểm danh"}
                          </mark>
                        </span>
                        <span>{getCheckTime(customer)}</span>
                        <span className="guide-attendance-actions">
                          <button
                            type="button"
                            onClick={() => openCustomerDetail(customer)}
                            disabled={detailLoading}
                          >
                            Chi tiết
                          </button>
                        </span>
                      </div>
                    ))}
                </div>
                <footer className="guide-attendance-footer">
                  <span>
                    Trang {page}/{totalPages}
                  </span>
                  <div>
                    <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>‹</button>
                    {getPageNumbers(page, totalPages).map((pageNumber) => (
                      <button key={pageNumber} type="button" className={pageNumber === page ? "is-active" : ""} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
                    ))}
                    <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>›</button>
                  </div>
                  <span>
                    Hiển thị <b>{customers.length} khách / trang</b>
                  </span>
                </footer>
          </section>
        </>
      ) : (
        <div className="guide-shot-empty">
          {loading ? "Đang tải tour..." : "Chưa có tour để điểm danh."}
        </div>
      )}
      {noteTarget ? (
        <div
          className="guide-note-modal-backdrop"
          role="presentation"
          onClick={() => setNoteTarget(null)}
        >
          <form
            className="guide-note-modal"
            onSubmit={saveNote}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Ghi chú khách hàng</h2>
            <p>
              {getCustomerName(noteTarget)} - {getDestination(selectedTour)}
            </p>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              readOnly={isReadOnlySession}
              rows={5}
              placeholder="Nhập yêu cầu, lưu ý sức khỏe, ăn uống hoặc vấn đề cần chú ý..."
            />
            <div>
              <button type="button" onClick={() => setNoteTarget(null)}>
                Hủy
              </button>
              {!isReadOnlySession ? (
                <button type="submit" disabled={busy}>
                  Lưu ghi chú
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
      {customerDetail ? (
        <div
          className="guide-note-modal-backdrop"
          role="presentation"
          onClick={() => setCustomerDetail(null)}
        >
          <section
            className="guide-customer-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết khách hàng"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>Khách hàng</span>
                <h2>{customerDetail.personal_info?.full_name || getCustomerName(customerDetail.listItem)}</h2>
              </div>
              <button type="button" onClick={() => setCustomerDetail(null)} aria-label="Đóng">×</button>
            </header>
            <div className="guide-customer-detail-grid">
              <article><span>Số điện thoại</span><strong>{customerDetail.personal_info?.phone || "Chưa có"}</strong></article>
              <article><span>Loại khách</span><strong>{getVietnameseLabel(customerDetail.personal_info?.participant_type, participantTypeLabels)}</strong></article>
              <article><span>Ngày sinh</span><strong>{customerDetail.personal_info?.birth_date ? formatDate(customerDetail.personal_info.birth_date) : "Chưa có"}</strong></article>
              <article><span>Giới tính</span><strong>{getVietnameseLabel(customerDetail.personal_info?.gender, genderLabels)}</strong></article>
            </div>
            <div className="guide-customer-detail-note">
              <span>Ghi chú điểm danh</span>
              <p>{getAttendance(customerDetail.listItem)?.note || "Chưa có ghi chú"}</p>
              <button
                type="button"
                onClick={() => {
                  openNote(customerDetail.listItem);
                  setCustomerDetail(null);
                }}
              >
                {getAttendance(customerDetail.listItem)?.note ? "Sửa ghi chú" : "Thêm ghi chú"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {itineraryModalOpen ? (
        <GuideDayItineraryModal
          tour={selectedTour}
          initialDayNumber={itineraryModalDayNumber}
          sessions={attendanceSessions}
          stages={tourStages}
          stagesLoading={stagesLoading}
          stageError={stageError}
          stageFeedback={stageFeedback}
          stageAdvancing={stageAdvancing}
          onAdvanceStage={confirmTourStage}
          onClose={() => setItineraryModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
export default GuideAttendancePage;
