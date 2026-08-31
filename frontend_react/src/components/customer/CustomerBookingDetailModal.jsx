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

  if (!booking) return null;

  const tour = booking.tour || {};
  const departure = booking.tour_departure || {};
  const participants = Array.isArray(booking.participants) ? booking.participants : [];
  const histories = Array.isArray(booking.status_histories) ? booking.status_histories : [];
  const cancellationHistory = histories.find((history) => (
    ["cancelled", "cancelled_by_tour"].includes(history.new_status)
  ));
  const isCancelled = ["cancelled", "cancelled_by_tour"].includes(booking.status)
    || departure.status === "cancelled";
  const isCancelledByTour = booking.status === "cancelled_by_tour"
    || departure.status === "cancelled";
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
              <div><Icon name="xCircle" size={17} /> Tour đã hủy</div>
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

            <section className={isCancelled ? "vg-customer-detail-card is-cancelled" : "vg-customer-detail-card"}>
              <div className="vg-customer-detail-card-title">
                <Icon name={isCancelled ? "alertCircle" : "checkCircle"} size={17} />
                <h3>Trạng thái tour</h3>
              </div>
              <div className="vg-customer-status-panel">
                <span className="vg-customer-status-label">Trạng thái hiện tại</span>
                <strong>{isCancelled ? "Tour đã hủy" : getStatusLabel(booking.status)}</strong>
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
