import Icon from "./Icon";
import { mediaUrl } from "../../utils/mediaUrl";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const STATUS_LABELS = {
  pending: "Chờ thanh toán",
  confirmed: "Đã xác nhận",
  departed: "Đã khởi hành",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy đơn",
  cancelled_by_tour: "Tour bị hủy",
  refund_pending: "Chờ hoàn tiền",
  refunded: "Đã hoàn tiền",
};

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Chưa cập nhật";
}

function getParticipantTypeLabel(type) {
  return {
    adult: "Người lớn",
    child: "Trẻ em",
    infant: "Em bé",
  }[type] || type || "Hành khách";
}

function formatTime(value) {
  if (!value) return "--:--";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function addDays(value, offset) {
  const text = String(value || "");
  const raw = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!raw) return null;
  let [year, month, day] = raw.split("-").map(Number);
  if (text.includes("T")) {
    const timestamp = new Date(text);
    if (!Number.isNaN(timestamp.getTime())) {
      year = timestamp.getFullYear();
      month = timestamp.getMonth() + 1;
      day = timestamp.getDate();
    }
  }
  const date = new Date(year, month - 1, day + Number(offset || 0));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getLocalDateState(value) {
  const normalized = addDays(value, 0);
  const raw = String(normalized || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!raw) return "unknown";
  const [year, month, day] = raw.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (target.getTime() > today.getTime()) return "future";
  if (target.getTime() < today.getTime()) return "past";
  return "today";
}

function getCustomerActivityState(status, scheduledDate) {
  const dayState = getLocalDateState(scheduledDate);
  if (dayState === "future") {
    return { label: "Chưa đến ngày", className: "is-upcoming" };
  }
  if (status === "completed") {
    return { label: "Đã xác nhận", className: "is-confirmed" };
  }
  if (status === "skipped") {
    return { label: "Đã bỏ qua", className: "is-unconfirmed" };
  }
  return { label: "Chưa xác nhận", className: "is-unconfirmed" };
}

function DetailItem({ label, value, emphasize = false }) {
  return (
    <div className="vg-customer-detail-item">
      <dt>{label}</dt>
      <dd className={emphasize ? "is-emphasized" : ""}>{value || "Chưa cập nhật"}</dd>
    </div>
  );
}

function CustomerBookingDetailModal({
  booking,
  onClose,
  formatCurrency,
  formatDate,
}) {
  const navigate = useNavigate();
  const [expandedParticipant, setExpandedParticipant] = useState(null);
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [selectedItineraryDay, setSelectedItineraryDay] = useState(1);

  if (!booking) return null;

  const tour = booking.tour || {};
  const departure = booking.tour_departure || {};
  const participants = Array.isArray(booking.participants) ? booking.participants : [];
  const attendanceSessions = Array.isArray(departure.attendance_sessions)
    ? [...departure.attendance_sessions].sort((a, b) => String(a?.scheduled_date || "").localeCompare(String(b?.scheduled_date || "")))
    : [];
  const histories = Array.isArray(booking.status_histories) ? booking.status_histories : [];
  const cancellationHistory = histories.find((history) => (
    ["cancelled", "cancelled_by_tour"].includes(history.new_status)
  ));
  const isCancelled = ["cancelled", "cancelled_by_tour"].includes(booking.status)
    || departure.status === "cancelled";
  const isCancelledByTour = booking.status === "cancelled_by_tour"
    || departure.status === "cancelled";
  const refundStatus = ["refund_pending", "refunded"].includes(booking.payment_status)
    ? booking.payment_status
    : null;
  const approvedCustomerCancellation = (booking.disruption_requests || [])
    .filter((request) => request.status === "approved" && ["refund", "retain"].includes(request.type))
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0];
  const cancellationActor = isCancelledByTour ? "Quản trị viên" : "Khách hàng";
  const cancellationReason = isCancelledByTour
    ? (booking.tour_cancellation_message || booking.cancel_reason || departure.cancellation_reason)
    : (approvedCustomerCancellation?.reason || booking.cancel_reason || cancellationHistory?.note);
  const tourImage = mediaUrl(
    tour.thumbnail?.image_url
      || tour.thumbnail_url
      || tour.image
      || "",
  );
  const destinationName = tour.destination?.name
    || tour.province?.name
    || tour.destination_name
    || "Chưa cập nhật";
  const categoryName = tour.category?.name || tour.category_name || "Tour du lịch";
  const duration = tour.duration_days
    ? String(tour.duration_days) + " ngày" + (tour.duration_nights ? " " + tour.duration_nights + " đêm" : "")
    : (tour.duration || "Chưa cập nhật");
  const departureDate = departure.departure_date
    ? formatDate(departure.departure_date)
    : "Chưa cập nhật";
  const returnDate = departure.return_date
    ? formatDate(departure.return_date)
    : "Chưa cập nhật";
  const departureLocation = departure.departure_location
    || departure.meeting_point
    || "Sẽ được thông báo trước ngày đi";
  const unitPrice = Number(booking.unit_price || 0);
  const now = Date.now();
  const departureTime = departure.departure_date
    ? new Date(departure.departure_date).getTime()
    : 0;
  const returnTime = departure.return_date
    ? new Date(departure.return_date).getTime()
    : 0;
  const tripProgress = booking.status === "completed" || (returnTime > 0 && returnTime <= now)
    ? 2
    : departureTime > 0 && departureTime <= now
      ? 1
      : 0;
  const tripProgressSteps = ["Sắp diễn ra", "Đang diễn ra", "Đã hoàn thành"];
  const stages = Array.isArray(departure.stages) ? departure.stages : [];
  const tourItineraries = Array.isArray(tour.itineraries) ? tour.itineraries : [];
  const itinerarySource = stages.length ? stages : tourItineraries;
  const itineraryDayCount = itinerarySource.reduce(
    (max, item) => Math.max(max, Number(item?.day_number || item?.itinerary?.day_number || 1)),
    Number(tour.duration_days || 1),
  );
  const selectedDayActivities = itinerarySource
    .filter((item, index) => Number(item?.day_number || item?.itinerary?.day_number || index + 1) === selectedItineraryDay)
    .sort((a, b) => Number(a?.sort_order || a?.itinerary?.sort_order || 0) - Number(b?.sort_order || b?.itinerary?.sort_order || 0));

  return (
    <div className="vg-customer-detail-overlay" onClick={onClose}>
      <section
        className="vg-customer-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-booking-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="vg-customer-detail-header">
          <div>
            <span className="vg-customer-detail-kicker">Chi tiết chuyến đi</span>
            <h2 id="customer-booking-detail-title">{tour.title || "Tour ViVuGo"}</h2>
            <p>Mã booking: <strong>{booking.booking_code || "Chưa cập nhật"}</strong></p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={19} />
          </button>
        </header>

        <div className="vg-customer-detail-body">
          <section className="vg-customer-tour-summary">
            {tourImage ? (
              <img src={tourImage} alt={tour.title || "Ảnh tour"} />
            ) : (
              <div className="vg-customer-tour-summary-placeholder">
                <Icon name="compass" size={28} />
              </div>
            )}
            <div className="vg-customer-tour-summary-content">
              <span>{categoryName} · {destinationName}</span>
              <h3>Thông tin tour</h3>
              <p>{tour.summary || tour.description || "Thông tin tour đang được cập nhật."}</p>
              <div className="vg-customer-tour-summary-meta">
                <span><Icon name="mapPin" size={14} /> {destinationName}</span>
                <span><Icon name="clock" size={14} /> {duration}</span>
              </div>
            </div>
            <button
              type="button"
              className="vg-customer-tour-detail-link"
              disabled={!tour.slug && !tour.id}
              onClick={() => {
                onClose();
                navigate(`/tours/${tour.slug || tour.id}`);
              }}
            >
              <Icon name="eye" size={15} />
              Chi tiết
            </button>
          </section>

          {isCancelled ? (
            <section className="vg-customer-trip-cancelled" aria-label="Trạng thái tour">
              <div><Icon name="xCircle" size={17} /> Đã hủy</div>
            </section>
          ) : (
            <section className="vg-customer-trip-progress" aria-label="Tiến độ chuyến đi">
              {tripProgressSteps.map((label, index) => (
              <div className="vg-customer-trip-progress-part" key={label}>
                <div
                  className={`vg-customer-trip-progress-step${index <= tripProgress ? " is-reached" : ""}${index === tripProgress ? " is-current" : ""}`}
                  aria-current={index === tripProgress ? "step" : undefined}
                >
                  <span>{index + 1}</span>
                  <strong>{label}</strong>
                </div>
                {index < tripProgressSteps.length - 1 ? (
                  <i className={index < tripProgress ? "is-complete" : ""} aria-hidden="true" />
                ) : null}
              </div>
              ))}
            </section>
          )}

          <div className="vg-customer-detail-grid">
            <section className="vg-customer-detail-card">
              <div className="vg-customer-detail-card-title">
                <Icon name="calendar" size={17} />
                <h3>Thông tin lịch</h3>
              </div>
              <dl className="vg-customer-detail-list">
                <DetailItem label="Ngày đi" value={departureDate} />
                <DetailItem label="Ngày về" value={returnDate} />
                <DetailItem label="Điểm tập trung" value={departureLocation} />
                <DetailItem
                  label="Giá / khách"
                  value={unitPrice ? formatCurrency(unitPrice) : "Chưa cập nhật"}
                />
                <DetailItem label="Thời gian đặt" value={formatDateTime(booking.created_at)} />
                <DetailItem
                  label="Tổng thanh toán"
                  value={formatCurrency(Number(booking.total_amount || 0))}
                  emphasize
                />
              </dl>
            </section>

            <section className={`${isCancelled ? "vg-customer-detail-card is-cancelled" : "vg-customer-detail-card"}${refundStatus ? ` is-${refundStatus}` : ""}`}>
              <div className="vg-customer-detail-card-title">
                <Icon name={isCancelled ? "alertCircle" : "checkCircle"} size={17} />
                <h3>{refundStatus ? "Trạng thái hoàn tiền" : "Trạng thái tour"}</h3>
              </div>
              <div className="vg-customer-status-panel">
                <span className="vg-customer-status-label">{refundStatus ? "Trạng thái hoàn tiền" : "Trạng thái hiện tại"}</span>
                <strong>{refundStatus ? getStatusLabel(refundStatus) : isCancelled ? "Tour đã hủy" : getStatusLabel(booking.status)}</strong>
              </div>
              {isCancelled ? (
                <div className="vg-customer-cancellation-info">
                  <div>
                    <span>Người đã hủy tour</span>
                    <strong>{cancellationActor}</strong>
                  </div>
                  <div>
                    <span>Thời gian hủy</span>
                    <strong>{formatDateTime(booking.cancelled_at || cancellationHistory?.created_at)}</strong>
                  </div>
                  <div>
                    <span>Lý do</span>
                    <p>{cancellationReason || "Chưa có lý do cụ thể."}</p>
                  </div>
                </div>
              ) : (
                <p className="vg-customer-detail-hint">
                  Booking của bạn đang được ViVuGo theo dõi. Mọi thay đổi trạng thái sẽ được lưu lại tại đây.
                </p>
              )}
            </section>
          </div>

          <section className={`vg-customer-detail-card vg-customer-itinerary-card${itineraryOpen ? " is-open" : ""}`}>
            <button
              type="button"
              className="vg-customer-itinerary-toggle"
              onClick={() => setItineraryOpen((current) => !current)}
              aria-expanded={itineraryOpen}
            >
              <span className="vg-customer-itinerary-toggle-icon"><Icon name="calendar" size={17} /></span>
              <span>
                <strong>Lịch trình tour</strong>
                <small>Theo dõi hoạt động và trạng thái mới nhất do HDV cập nhật</small>
              </span>
              <span className="vg-customer-itinerary-toggle-summary">{itineraryDayCount} ngày</span>
              <Icon name="chevronDown" size={18} className="vg-customer-itinerary-chevron" />
            </button>

            {itineraryOpen ? (
              <div className="vg-customer-itinerary-content">
                <div className="vg-customer-itinerary-days" role="tablist" aria-label="Chọn ngày lịch trình">
                  {Array.from({ length: itineraryDayCount }).map((_, index) => {
                    const dayNumber = index + 1;
                    return (
                      <button
                        key={dayNumber}
                        type="button"
                        role="tab"
                        aria-selected={selectedItineraryDay === dayNumber}
                        className={selectedItineraryDay === dayNumber ? "is-active" : ""}
                        onClick={() => setSelectedItineraryDay(dayNumber)}
                      >
                        <span>Ngày {dayNumber}</span>
                        <strong>{formatDate(addDays(departure.departure_date, index))}</strong>
                      </button>
                    );
                  })}
                </div>

                {selectedDayActivities.length ? (
                  <div className="vg-customer-itinerary-list">
                    {selectedDayActivities.map((activity, index) => {
                      const detail = activity.itinerary || activity;
                      const destination = detail.destination_place || detail.destinationPlace;
                      const scheduledDate = addDays(departure.departure_date, selectedItineraryDay - 1);
                      const activityState = getCustomerActivityState(activity.status, scheduledDate);
                      return (
                        <article className={`vg-customer-itinerary-activity ${activityState.className}`} key={activity.id || detail.id || index}>
                          <span className="vg-customer-itinerary-number">{index + 1}</span>
                          <div className="vg-customer-itinerary-activity-main">
                            <div className="vg-customer-itinerary-activity-head">
                              <span className="vg-customer-itinerary-time"><Icon name="clock" size={13} /> {String(activity.start_time || detail.start_time || "--:--").slice(0, 5)}{activity.end_time || detail.end_time ? ` – ${String(activity.end_time || detail.end_time).slice(0, 5)}` : ""}</span>
                              <strong>{activity.title || detail.title || `Hoạt động ${index + 1}`}</strong>
                              <span className="vg-customer-visually-hidden">{activityState.label}</span>
                            </div>
                            {destination?.name ? <p className="vg-customer-itinerary-destination"><Icon name="mapPin" size={14} /> <strong>{destination.name}</strong>{destination.address ? ` · ${destination.address}` : ""}</p> : null}
                            {detail.description ? <p className="vg-customer-itinerary-description">{String(detail.description).replace(/<[^>]*>/g, "")}</p> : null}
                            {(activity.started_at || activity.completed_at) ? (
                              <div className="vg-customer-itinerary-updated">
                                {activity.started_at ? <span>Bắt đầu: {formatDateTime(activity.started_at)}</span> : null}
                                {activity.completed_at ? <span>Hoàn thành: {formatDateTime(activity.completed_at)}</span> : null}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : <div className="vg-customer-itinerary-empty">Lịch trình ngày {selectedItineraryDay} đang được cập nhật.</div>}
              </div>
            ) : null}
          </section>

          <section className="vg-customer-detail-card vg-customer-passenger-card">
            <div className="vg-customer-detail-card-title">
              <Icon name="users" size={17} />
              <h3>Thành viên</h3>
              <span>{participants.length} thành viên</span>
            </div>
            <p className="vg-customer-detail-hint">
              Danh sách thành viên trong booking {booking.booking_code || ""}. Bấm vào từng thành viên để xem đầy đủ thông tin.
            </p>
            {participants.length ? (
              <div className="vg-customer-passenger-list">
                {participants.map((participant, index) => {
                  const participantKey = participant.id || index;
                  const isExpanded = expandedParticipant === participantKey;
                  const genderLabel = {
                    male: "Nam",
                    female: "Nữ",
                    other: "Khác",
                  }[participant.gender] || "Chưa cập nhật";

                  return (
                  <article
                    key={participantKey}
                    className={`vg-customer-passenger${isExpanded ? " is-expanded" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedParticipant(isExpanded ? null : participantKey)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpandedParticipant(isExpanded ? null : participantKey);
                      }
                    }}
                  >
                    <div className="vg-customer-passenger-summary">
                      <span className="vg-customer-passenger-number">{index + 1}</span>
                      <div>
                        <strong>Thành viên {index + 1}</strong>
                        <p>{participant.full_name || "Chưa cập nhật họ tên"}</p>
                      </div>
                      <div className="vg-customer-passenger-meta">
                        <span>{getParticipantTypeLabel(participant.participant_type)}</span>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="vg-customer-passenger-expanded-content">
                        <dl className="vg-customer-passenger-detail">
                          <DetailItem label="Họ và tên" value={participant.full_name} />
                          <DetailItem label="Loại thành viên" value={getParticipantTypeLabel(participant.participant_type)} />
                          <DetailItem label="Giới tính" value={genderLabel} />
                          <DetailItem label="Ngày sinh" value={participant.birth_date ? formatDate(participant.birth_date) : "Chưa cập nhật"} />
                          <DetailItem label="Số điện thoại" value={participant.phone} />
                          <DetailItem label="CCCD / Hộ chiếu" value={participant.identity_number} />
                          {participant.unit_price ? (
                            <DetailItem label="Giá vé" value={formatCurrency(Number(participant.unit_price))} emphasize />
                          ) : null}
                        </dl>

                        <div className="vg-customer-attendance-history">
                          <div className="vg-customer-attendance-title">
                            <span><Icon name="clock" size={15} /></span>
                            <div><strong>Điểm danh hằng ngày</strong><small>Thời gian được HDV cập nhật trong chuyến đi</small></div>
                          </div>
                          <div className="vg-customer-attendance-days">
                              {Array.from({ length: itineraryDayCount }).map((_, sessionIndex) => {
                                const session = attendanceSessions[sessionIndex];
                                const attendance = session
                                  ? (participant.attendances || []).find((item) => String(item.attendance_session_id) === String(session.id))
                                  : null;
                                const isCheckedIn = ["checked_in", "checked_out"].includes(attendance?.status) && Boolean(attendance?.checked_in_at);
                                const scheduledDate = session?.scheduled_date || addDays(departure.departure_date, sessionIndex);
                                const isUpcoming = getLocalDateState(scheduledDate) === "future";
                                return (
                                  <div className={`vg-customer-attendance-day ${isUpcoming ? "is-upcoming" : isCheckedIn ? "is-checked" : "is-missed"}`} key={session?.id || sessionIndex}>
                                    <div className="vg-customer-attendance-day-heading">
                                      <strong>Ngày {sessionIndex + 1}</strong>
                                      <span>{formatDate(scheduledDate)}</span>
                                    </div>
                                    <div className="vg-customer-attendance-mark" aria-label={isUpcoming ? "Chưa đến ngày" : isCheckedIn ? "Đã điểm danh" : "Chưa điểm danh"}>
                                      {!isUpcoming ? <span>{isCheckedIn ? "✓" : "×"}</span> : null}
                                      <strong>{isUpcoming ? "Chưa đến ngày" : isCheckedIn ? "Đã điểm danh" : "Chưa điểm danh"}</strong>
                                    </div>
                                    <div className="vg-customer-attendance-time">
                                      <span>Thời gian điểm danh</span>
                                      <strong>{isUpcoming ? "--:--" : isCheckedIn ? formatTime(attendance.checked_in_at) : "Chưa có"}</strong>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                  );
                })}
              </div>
            ) : (
              <div className="vg-customer-passenger-empty">
                Chưa có danh sách hành khách chi tiết cho booking này.
              </div>
            )}
          </section>

        </div>

        <footer className="vg-customer-detail-footer">
          <button type="button" onClick={onClose}>Đóng</button>
        </footer>
      </section>
    </div>
  );
}

export default CustomerBookingDetailModal;
