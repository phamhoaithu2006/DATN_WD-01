import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../customer/Icon'
import { InvoiceIcon } from './BookingIcons'
import {
  bookingDeparture,
  customerName,
  customerPhone,
  formatDate,
  formatMoney,
} from './bookingFormatters'
import { isBookingReadOnly } from './bookingPermissions'
import { mediaUrl } from '../../../utils/mediaUrl'
import '../../../styles/itinerary-activity.css'

function cancellationReasonLabel(booking) {
  const reason = String(booking.cancellation_reason || '').toLowerCase()

  if (reason.includes('insufficient_participants')) {
    return 'Không đủ tối thiểu 10 khách.'
  }

  if (reason.includes('weather_disaster')) {
    return 'Mưa bão hoặc thời tiết xấu.'
  }

  return booking.cancel_reason || 'Chưa xác định.'
}

const STATUS_LABELS = {
  awaiting_payment: 'Chờ thanh toán',
  confirmed: 'Sắp diễn ra',
  upcoming: 'Sắp diễn ra',
  departed: 'Đang diễn ra',
  completed: 'Đã kết thúc',
  cancelled: 'Đã hủy',
  cancelled_by_tour: 'Đã hủy bởi tour',
  retained: 'Đang bảo lưu',
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refund_pending: 'Chờ hoàn tiền',
  refunded: 'Đã hoàn tiền',
}

const REQUEST_TYPE_LABELS = {
  refund: 'Hoàn tiền / hủy booking',
  retain: 'Bảo lưu booking',
  transfer: 'Đổi lịch khởi hành',
}

const REQUEST_STATUS_LABELS = {
  pending: 'Chờ xử lý',
  approved: 'Đã duyệt',
  refund_pending: 'Chưa hoàn tiền',
  refunded: 'Đã hoàn tiền',
  rejected: 'Đã từ chối',
}

const CONTACT_FIELD_LABELS = {
  contact_name: 'Tên liên hệ',
  contact_email: 'Email liên hệ',
  contact_phone: 'SĐT liên hệ',
  address: 'Địa chỉ',
  special_request: 'Yêu cầu đặc biệt',
}

const PARTICIPANT_FIELD_LABELS = {
  full_name: 'Họ tên',
  phone: 'SĐT',
  gender: 'Giới tính',
  identity_number: 'CCCD/Hộ chiếu',
  birth_date: 'Ngày sinh',
}

const TRIP_PROGRESS_STEPS = ['Sắp diễn ra', 'Đang diễn ra', 'Đã hoàn thành']

function formatDateTime(value) {
  if (!value) return 'Chưa cập nhật'

  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật'

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDiffValue(key, value) {
  if (!value) return 'trống'
  if (key === 'birth_date') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('vi-VN')
    }
  }
  return String(value)
}

function summarizeInformationChange(history) {
  const before = history.before || {}
  const after = history.after || {}
  const lines = []

  const beforeContact = before.contact || {}
  const afterContact = after.contact || {}
  Object.entries(CONTACT_FIELD_LABELS).forEach(([key, label]) => {
    const oldValue = beforeContact[key] ?? ''
    const newValue = afterContact[key] ?? ''
    if (String(oldValue) !== String(newValue)) {
      lines.push(`${label}: "${formatDiffValue(key, oldValue)}" → "${formatDiffValue(key, newValue)}"`)
    }
  })

  const beforeParticipants = Array.isArray(before.participants) ? before.participants : []
  const afterParticipants = Array.isArray(after.participants) ? after.participants : []
  afterParticipants.forEach((afterP, index) => {
    const beforeP = beforeParticipants.find((p) => p.id === afterP.id) || beforeParticipants[index] || {}
    Object.entries(PARTICIPANT_FIELD_LABELS).forEach(([key, label]) => {
      const oldValue = beforeP[key] ?? ''
      const newValue = afterP[key] ?? ''
      if (String(oldValue) !== String(newValue)) {
        lines.push(`Hành khách ${index + 1} - ${label}: "${formatDiffValue(key, oldValue)}" → "${formatDiffValue(key, newValue)}"`)
      }
    })
  })

  return lines
}

function addDays(value, offset) {
  const raw = String(value || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!raw) return null

  const [year, month, day] = raw.split('-').map(Number)
  const date = new Date(year, month - 1, day + Number(offset || 0))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getLocalDateState(value) {
  const raw = String(value || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!raw) return 'unknown'

  const [year, month, day] = raw.split('-').map(Number)
  const target = new Date(year, month - 1, day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (target > today) return 'future'
  if (target < today) return 'past'
  return 'today'
}

function parseItinerary(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function cleanText(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim()
}

function getParticipantTypeLabel(type) {
  return {
    adult: 'Người lớn',
    child: 'Trẻ em',
    infant: 'Em bé',
  }[type] || type || 'Hành khách'
}

function getDurationLabel(tour, departure) {
  const days = Number(tour.duration_days || 0)
  const nights = Number(tour.duration_nights || 0)
  if (days > 0) {
    return `${days} ngày${nights > 0 ? ` ${nights} đêm` : ''}`
  }

  const start = new Date(String(departure.departure_date || '').replace(' ', 'T'))
  const end = new Date(String(departure.return_date || '').replace(' ', 'T'))
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
    const durationDays = Math.round((end - start) / 86400000) + 1
    return `${durationDays} ngày${durationDays > 1 ? ` ${durationDays - 1} đêm` : ''}`
  }

  return 'Chưa cập nhật'
}

function getTripProgress(booking, departure) {
  if (booking.status === 'completed') return 2
  if (booking.status === 'departed' || booking.display_status === 'departed') return 1

  const now = Date.now()
  const departureTime = departure.departure_date
    ? new Date(String(departure.departure_date).replace(' ', 'T')).getTime()
    : 0
  const returnTime = departure.return_date
    ? new Date(String(departure.return_date).replace(' ', 'T')).getTime()
    : 0

  if (returnTime > 0 && returnTime <= now) return 2
  if (departureTime > 0 && departureTime <= now) return 1
  return 0
}

function getActivityDayNumber(activity, index) {
  return Number(activity?.day_number || activity?.itinerary?.day_number || index + 1)
}

function getActivityState(status, scheduledDate) {
  if (status === 'completed') return { label: 'Đã hoàn thành', className: 'is-confirmed' }
  if (status === 'in_progress') return { label: 'Đang diễn ra', className: 'is-in-progress' }
  if (status === 'pending') return { label: 'Chưa bắt đầu', className: 'is-pending' }
  if (getLocalDateState(scheduledDate) === 'future') return { label: 'Chưa đến ngày', className: 'is-upcoming' }
  return { label: 'Chưa cập nhật', className: 'is-unknown' }
}

function DetailItem({ label, value, emphasize = false }) {
  return (
    <div className="booking-trip-detail-item">
      <dt>{label}</dt>
      <dd className={emphasize ? 'is-emphasized' : ''}>{value || 'Chưa cập nhật'}</dd>
    </div>
  )
}

function BookingDetailModal({ booking, busy, onClose, onDeleteRefundProof, onInvoice, onPaymentChange, onStatusChange }) {
  const navigate = useNavigate()
  const [expandedParticipant, setExpandedParticipant] = useState(null)
  const [itineraryOpen, setItineraryOpen] = useState(false)
  const [selectedItineraryDay, setSelectedItineraryDay] = useState(1)
  const [cancellationOpen, setCancellationOpen] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancellationError, setCancellationError] = useState('')

  if (!booking) return null

  const tour = booking.tour || {}
  const departure = bookingDeparture(booking) || {}
  const name = customerName(booking)
  const phone = customerPhone(booking)
  const participants = Array.isArray(booking.participants) ? booking.participants : []
  const contact = booking.contact || {}
  const payment = booking.payment || null
  const statusHistories = Array.isArray(booking.status_histories) ? booking.status_histories : []
  const informationChangeHistories = Array.isArray(booking.information_change_histories)
    ? booking.information_change_histories
    : []
  const disruptionRequests = Array.isArray(booking.disruption_requests) ? booking.disruption_requests : []
  const auditLogs = Array.isArray(booking.audit_logs) ? booking.audit_logs : []
  const cancellationHistories = statusHistories.filter((history) => ['cancelled', 'cancelled_by_tour'].includes(history.new_status))
  const displayStatus = booking.display_status || booking.status
  const capabilities = booking.capabilities || {}
  const isReadOnly = isBookingReadOnly(booking)
  const isCancelled = ['cancelled', 'cancelled_by_tour'].includes(booking.status)
    || ['cancelled', 'canceled'].includes(String(departure.status || '').toLowerCase())
  const refundStatus = ['refund_pending', 'refunded'].includes(booking.payment_status)
    ? booking.payment_status
    : null
  const approvedCustomerCancellation = disruptionRequests
    .filter((request) => request.status === 'approved' && ['refund', 'retain'].includes(request.type))
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0]
  const isCancelledAtCustomerRequest = Boolean(approvedCustomerCancellation)
  const isCancelledByAdmin = auditLogs.some((event) => event.action === 'admin_cancelled')
    || booking.status === 'cancelled_by_tour'
    || ['cancelled', 'canceled'].includes(String(departure.status || '').toLowerCase())
  const cancellationActor = isCancelledAtCustomerRequest
    ? 'Yêu cầu của khách hàng'
    : isCancelledByAdmin
      ? 'Quản trị viên'
      : 'Khách hàng'
  const recordedCancellationReason = approvedCustomerCancellation?.reason
    || cancellationReasonLabel(booking)
    || cancellationHistories[0]?.note
  const cancellationTime = booking.cancelled_at
    || approvedCustomerCancellation?.processed_at
    || cancellationHistories[0]?.created_at
  const departureDate = departure.departure_date ? formatDate(departure.departure_date) : 'Chưa cập nhật'
  const returnDate = departure.return_date ? formatDate(departure.return_date) : 'Chưa cập nhật'
  const departureLocation = departure.departure_location || departure.meeting_point || 'Chưa cập nhật'
  const destinationName = tour.province?.name || tour.destination?.name || tour.destination_name || 'Chưa cập nhật'
  const categoryName = tour.category?.name || 'Tour du lịch'
  const duration = getDurationLabel(tour, departure)
  const tourImage = mediaUrl(tour.thumbnail?.image_url || tour.thumbnail_url || tour.image || '')
  const tripProgress = getTripProgress(booking, departure)
  const itinerarySource = departure.stages?.length
    ? departure.stages
    : Array.isArray(tour.itineraries) && tour.itineraries.length
      ? tour.itineraries
      : parseItinerary(tour.itinerary)
  const itineraryDayCount = Math.max(
    Number(tour.duration_days) || 1,
    ...itinerarySource.map((item, index) => getActivityDayNumber(item, index)),
  )
  const selectedDayActivities = itinerarySource
    .filter((item, index) => getActivityDayNumber(item, index) === selectedItineraryDay)
    .sort((a, b) => Number(a?.sort_order || a?.itinerary?.sort_order || 0) - Number(b?.sort_order || b?.itinerary?.sort_order || 0))
  const isEligible = booking.eligibility
    ? booking.eligibility.is_paid
      && booking.eligibility.has_capacity
      && booking.eligibility.tour_active
      && booking.eligibility.departure_active
    : false
  const canSetAwaitingPayment = capabilities.can_set_awaiting_payment
    ?? (booking.status === 'confirmed' && displayStatus === 'confirmed' && !isEligible)
  const canConfirm = capabilities.can_confirm
    ?? (booking.status === 'awaiting_payment' && isEligible)
  const canRefund = capabilities.can_refund
    ?? (booking.status === 'confirmed' && displayStatus === 'confirmed')
  const canAdminCancel = !isCancelled
    && !['departed', 'completed'].includes(booking.status)
    && !['departed', 'completed'].includes(displayStatus)
  const statusValue = booking.status || ''
  const detailStatusOptions = [
    { value: 'awaiting_payment', label: 'Chờ thanh toán', disabled: booking.status !== 'awaiting_payment' && !canSetAwaitingPayment },
    { value: 'confirmed', label: 'Đã xác nhận', disabled: booking.status !== 'confirmed' && !canConfirm },
  ]
  if (!detailStatusOptions.some((item) => item.value === statusValue)) {
    detailStatusOptions.push({
      value: statusValue,
      label: STATUS_LABELS[statusValue] || statusValue,
      disabled: true,
    })
  }

  return (
    <div className="booking-modal-backdrop booking-trip-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className="booking-modal booking-detail-modal booking-trip-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-booking-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="booking-trip-header">
          <div>
            <span className="booking-trip-kicker">Chi tiết chuyến đi</span>
            <h2 id="admin-booking-detail-title">{tour.title || 'Tour ViVuGo'}</h2>
            <p>Mã booking: <strong>{booking.booking_code || `#${booking.id}`}</strong></p>
          </div>
          <div className="booking-trip-header-actions">
            <button type="button" className="booking-trip-invoice-button" title="Xuất hóa đơn" aria-label="Xuất hóa đơn" onClick={() => onInvoice(booking)}>
              <InvoiceIcon />
            </button>
            <button type="button" className="booking-trip-close-button" aria-label="Đóng" onClick={onClose}>
              <Icon name="close" size={19} />
            </button>
          </div>
        </header>

        <div className="booking-trip-body">
          <section className="booking-trip-tour-summary">
            {tourImage ? (
              <img src={tourImage} alt={tour.title || 'Ảnh tour'} />
            ) : (
              <div className="booking-trip-tour-placeholder">
                <Icon name="compass" size={30} />
              </div>
            )}
            <div className="booking-trip-tour-summary-content">
              <span>{categoryName} · {destinationName}</span>
              <h3>Thông tin tour</h3>
              <p>{tour.summary || tour.description || 'Thông tin tour đang được cập nhật.'}</p>
              <div className="booking-trip-tour-meta">
                <span><Icon name="mapPin" size={14} /> {destinationName}</span>
                <span><Icon name="clock" size={14} /> {duration}</span>
              </div>
            </div>
            <button
              type="button"
              className="booking-trip-tour-detail-button"
              disabled={!tour.id}
              onClick={() => {
                onClose()
                navigate(`/admin/tours/${tour.id}`)
              }}
            >
              <Icon name="eye" size={15} />
              Chi tiết
            </button>
          </section>

          {isCancelled ? (
            <section className={`booking-trip-cancelled${refundStatus ? ` is-${refundStatus}` : ''}`} aria-label="Trạng thái tour">
              <div>
                <Icon name="xCircle" size={17} />
                {isCancelledAtCustomerRequest
                  ? 'Đã hủy theo yêu cầu của khách hàng'
                  : isCancelledByAdmin
                    ? 'Đã hủy bởi quản trị viên'
                    : STATUS_LABELS[booking.status] || 'Đã hủy'}
              </div>
            </section>
          ) : (
            <section className="booking-trip-progress" aria-label="Tiến độ chuyến đi">
              {TRIP_PROGRESS_STEPS.map((label, index) => (
                <div className="booking-trip-progress-part" key={label}>
                  <div
                    className={`booking-trip-progress-step${index <= tripProgress ? ' is-reached' : ''}${index === tripProgress ? ' is-current' : ''}`}
                    aria-current={index === tripProgress ? 'step' : undefined}
                  >
                    <span>{index + 1}</span>
                    <strong>{label}</strong>
                  </div>
                  {index < TRIP_PROGRESS_STEPS.length - 1 ? (
                    <i className={index < tripProgress ? 'is-complete' : ''} aria-hidden="true" />
                  ) : null}
                </div>
              ))}
            </section>
          )}

          <div className="booking-trip-info-grid">
            <section className="booking-trip-card">
              <div className="booking-trip-card-title">
                <Icon name="calendar" size={17} />
                <h3>Thông tin lịch</h3>
              </div>
              <dl className="booking-trip-detail-list">
                <DetailItem label="Ngày đi" value={departureDate} />
                <DetailItem label="Ngày về" value={returnDate} />
                <DetailItem label="Điểm tập trung" value={departureLocation} />
                <DetailItem label="Giá / khách" value={formatMoney(booking.unit_price)} />
                <DetailItem label="Thời gian đặt" value={formatDateTime(booking.created_at)} />
                <DetailItem label="Tổng thanh toán" value={formatMoney(booking.total_amount)} emphasize />
              </dl>
            </section>

            <section className={`booking-trip-card${isCancelled ? ' is-cancelled' : ''}${refundStatus ? ` is-${refundStatus}` : ''}`}>
              <div className="booking-trip-card-title">
                <Icon name={isCancelled ? 'alertCircle' : 'checkCircle'} size={17} />
                <h3>Trạng thái</h3>
              </div>
              <div className="booking-trip-status-panel">
                <span>{refundStatus ? 'Trạng thái thanh toán' : 'Trạng thái hiện tại'}</span>
                <strong>{refundStatus ? STATUS_LABELS[refundStatus] || refundStatus : isCancelled ? 'Tour đã hủy' : STATUS_LABELS[displayStatus] || displayStatus || 'Chưa cập nhật'}</strong>
              </div>
              {isCancelled ? (
                <div className="booking-trip-cancellation-info">
                  <div>
                    <span>Người đã hủy tour</span>
                    <strong>{cancellationActor}</strong>
                  </div>
                  <div>
                    <span>Thời gian hủy</span>
                    <strong>{formatDateTime(cancellationTime)}</strong>
                  </div>
                  <div>
                    <span>Lý do</span>
                    <p>{recordedCancellationReason}</p>
                  </div>
                </div>
              ) : (
                <p className="booking-trip-hint">Trạng thái booking và lịch khởi hành được đồng bộ theo dữ liệu hiện tại.</p>
              )}
            </section>
          </div>

          <section className={`booking-trip-card vg-itinerary-card${itineraryOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="vg-itinerary-toggle"
              onClick={() => setItineraryOpen((current) => !current)}
              aria-expanded={itineraryOpen}
              aria-controls="admin-booking-itinerary-content"
            >
              <span className="vg-itinerary-toggle-icon"><Icon name="calendar" size={17} /></span>
              <span>
                <strong>Lịch trình tour</strong>
                <small>Theo dõi hoạt động và trạng thái mới nhất do HDV cập nhật</small>
              </span>
              <span className="vg-itinerary-toggle-summary">{itineraryDayCount} ngày</span>
              <Icon name="chevronDown" size={18} className="vg-itinerary-chevron" />
            </button>

            {itineraryOpen ? (
              <div className="vg-itinerary-content vg-itinerary-admin-content" id="admin-booking-itinerary-content">
                <div className="vg-itinerary-days" role="tablist" aria-label="Chọn ngày lịch trình">
                  {Array.from({ length: itineraryDayCount }).map((_, index) => {
                    const dayNumber = index + 1
                    return (
                      <button
                        key={dayNumber}
                        type="button"
                        role="tab"
                        aria-selected={selectedItineraryDay === dayNumber}
                        className={selectedItineraryDay === dayNumber ? 'is-active' : ''}
                        onClick={() => setSelectedItineraryDay(dayNumber)}
                      >
                        <span>Ngày {dayNumber}</span>
                        <strong>{formatDate(addDays(departure.departure_date, index))}</strong>
                      </button>
                    )
                  })}
                </div>

                {selectedDayActivities.length ? (
                  <div className="vg-itinerary-list">
                    {selectedDayActivities.map((activity, index) => {
                      const detail = activity.itinerary || activity
                      const destination = activity.destination_place
                        || activity.destinationPlace
                        || detail.destination_place
                        || detail.destinationPlace
                      const scheduledDate = addDays(departure.departure_date, selectedItineraryDay - 1)
                      const activityState = getActivityState(activity.status, scheduledDate)
                      const startTime = activity.start_time || detail.start_time
                      const endTime = activity.end_time || detail.end_time

                      return (
                        <article className={`vg-itinerary-activity ${activityState.className}`} key={activity.id || detail.id || index}>
                          <span className="vg-itinerary-number">{index + 1}</span>
                          <div className="vg-itinerary-activity-main">
                            <div className="vg-itinerary-activity-head">
                              <span className="vg-itinerary-time"><Icon name="clock" size={13} /> {String(startTime || '--:--').slice(0, 5)}{endTime ? ` – ${String(endTime).slice(0, 5)}` : ''}</span>
                              <strong>{activity.title || detail.title || `Hoạt động ${index + 1}`}</strong>
                              <span className="vg-itinerary-visually-hidden">{activityState.label}</span>
                            </div>
                            {destination?.name ? <p className="vg-itinerary-destination"><Icon name="mapPin" size={14} /> <strong>{destination.name}</strong>{destination.address ? ` · ${destination.address}` : ''}</p> : null}
                            {detail.description ? <p className="vg-itinerary-description">{cleanText(detail.description)}</p> : null}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className="vg-itinerary-empty">Lịch trình ngày {selectedItineraryDay} đang được cập nhật.</div>
                )}
              </div>
            ) : null}
          </section>

          <section className="booking-trip-card booking-trip-passenger-card">
            <div className="booking-trip-card-title">
              <Icon name="users" size={17} />
              <h3>Thành viên</h3>
              <span>{participants.length} thành viên</span>
            </div>
            <p className="booking-trip-hint">Danh sách thành viên trong booking {booking.booking_code || ''}. Bấm vào từng thành viên để xem đầy đủ thông tin.</p>
            {participants.length ? (
              <div className="booking-trip-passenger-list">
                {participants.map((participant, index) => {
                  const participantKey = participant.id || index
                  const isExpanded = expandedParticipant === participantKey
                  const participantPanelId = `admin-booking-participant-${participantKey}`
                  const genderLabel = {
                    male: 'Nam',
                    female: 'Nữ',
                    other: 'Khác',
                  }[participant.gender] || 'Chưa cập nhật'

                  return (
                    <article className={`booking-trip-passenger${isExpanded ? ' is-expanded' : ''}`} key={participantKey}>
                      <button
                        type="button"
                        className="booking-trip-passenger-toggle"
                        aria-expanded={isExpanded}
                        aria-controls={participantPanelId}
                        onClick={() => setExpandedParticipant(isExpanded ? null : participantKey)}
                      >
                        <span className="booking-trip-passenger-number">{index + 1}</span>
                        <span>
                          <strong>Thành viên {index + 1}</strong>
                          <small>{participant.full_name || 'Chưa cập nhật họ tên'}</small>
                        </span>
                        <span className="booking-trip-passenger-meta">{getParticipantTypeLabel(participant.participant_type)}</span>
                      </button>

                      {isExpanded ? (
                        <dl className="booking-trip-passenger-details" id={participantPanelId}>
                          <DetailItem label="Họ và tên" value={participant.full_name} />
                          <DetailItem label="Loại thành viên" value={getParticipantTypeLabel(participant.participant_type)} />
                          <DetailItem label="Giới tính" value={genderLabel} />
                          <DetailItem label="Ngày sinh" value={participant.birth_date ? formatDate(participant.birth_date) : 'Chưa cập nhật'} />
                          <DetailItem label="Số điện thoại" value={participant.phone} />
                          <DetailItem label="CCCD / Hộ chiếu" value={participant.identity_number} />
                          <DetailItem label="Giá vé" value={formatMoney(participant.unit_price)} emphasize />
                        </dl>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="booking-trip-empty">Booking này chưa có dữ liệu hành khách.</div>
            )}
          </section>

          <details className="booking-admin-collapsible">
            <summary>
              <span className="booking-admin-collapsible-title"><Icon name="settings" size={17} /><strong>Thao tác quản trị</strong></span>
              <span>Trạng thái · thanh toán</span>
            </summary>
            <div className="booking-admin-collapsible-body">
              <div className="booking-admin-control-grid">
                <label>
                  Trạng thái booking
                  <select value={statusValue} disabled={busy || isReadOnly} onChange={(event) => onStatusChange(booking, event.target.value)}>
                    {detailStatusOptions.map((item) => (
                      <option key={item.value} value={item.value} disabled={item.disabled}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <div className="booking-payment-actions">
                  <span>Thanh toán</span>
                  {payment ? (
                    <div>
                      <button type="button" disabled={busy || isReadOnly || payment.status === 'success' || payment.status === 'refunded'} onClick={() => onPaymentChange(booking, 'confirm')}>Xác nhận</button>
                      <button type="button" disabled={busy || isReadOnly || payment.status === 'failed' || payment.status === 'success' || payment.status === 'refunded'} onClick={() => onPaymentChange(booking, 'fail')}>Thất bại</button>
                      <button type="button" disabled={busy || !canRefund || !['success', 'refunded'].includes(payment.status)} onClick={() => onPaymentChange(booking, 'refund')}>
                        {payment.status === 'refunded' ? 'Thay ảnh hoàn tiền' : 'Hoàn tiền'}
                      </button>
                    </div>
                  ) : (
                    <small>Chưa có bản ghi thanh toán</small>
                  )}
                </div>
              </div>
              <dl className="booking-admin-data-grid">
                <DetailItem label="Đơn giá" value={formatMoney(booking.unit_price)} />
                <DetailItem label="Ngày đặt" value={formatDateTime(booking.created_at)} />
                <DetailItem label="Phương thức" value={payment?.payment_method === 'cod' ? 'Thanh toán thủ công' : payment?.payment_method || '--'} />
                <DetailItem label="Số tiền thanh toán" value={payment ? formatMoney(payment.amount) : '--'} />
                <DetailItem label="Mã giao dịch" value={payment?.transaction_code || '--'} />
                <DetailItem label="Thời gian thanh toán" value={formatDateTime(payment?.paid_at)} />
                {booking.status === 'cancelled_by_tour' ? (
                  <>
                    <DetailItem label="Lý do hủy" value={cancellationReasonLabel(booking)} />
                    <DetailItem label="Phương án khách chọn" value={booking.resolution_status === 'pending_selection' ? 'Đang chờ khách lựa chọn' : booking.resolution_status || 'Chưa có'} />
                  </>
                ) : null}
              </dl>
              {payment?.refund_proof_url ? (
                <div className="booking-admin-refund-proof">
                  <span>Ảnh chứng minh hoàn tiền</span>
                  <div>
                    <a href={mediaUrl(payment.refund_proof_url)} target="_blank" rel="noreferrer">
                      <img src={mediaUrl(payment.refund_proof_url)} alt="Chứng minh đã hoàn tiền cho khách" />
                    </a>
                    <button type="button" disabled={busy || !canRefund} onClick={() => onDeleteRefundProof(booking)}>Xóa ảnh</button>
                  </div>
                </div>
              ) : null}
            </div>
          </details>

          <details className="booking-admin-collapsible">
            <summary>
              <span className="booking-admin-collapsible-title"><Icon name="user" size={17} /><strong>Thông tin liên hệ</strong></span>
              <span>{name}</span>
            </summary>
            <div className="booking-admin-collapsible-body">
              <dl className="booking-admin-data-grid">
                <DetailItem label="Họ tên" value={contact.contact_name || name} />
                <DetailItem label="Số điện thoại" value={contact.contact_phone || phone} />
                <DetailItem label="Email" value={contact.contact_email || booking.user?.email} />
                <DetailItem label="Địa chỉ" value={contact.address} />
                <DetailItem label="Yêu cầu đặc biệt" value={contact.special_request} />
              </dl>
            </div>
          </details>

          <details className="booking-admin-collapsible">
            <summary>
              <span className="booking-admin-collapsible-title"><Icon name="clock" size={17} /><strong>Lịch sử thay đổi trạng thái</strong></span>
              <span>{statusHistories.length} bản ghi</span>
            </summary>
            <div className="booking-admin-collapsible-body">
              {statusHistories.length ? (
                <ol className="booking-history-list">
                  {statusHistories.map((history) => (
                    <li key={history.id}>
                      <span className="booking-history-dot" aria-hidden="true" />
                      <div>
                        <strong>{history.old_status ? `${STATUS_LABELS[history.old_status] || history.old_status} → ` : ''}{STATUS_LABELS[history.new_status] || history.new_status}</strong>
                        <small>{formatDateTime(history.created_at)} · {history.changed_by?.full_name || 'Hệ thống'}</small>
                        {history.note ? <p>{history.note}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <div className="booking-trip-empty">Chưa có lịch sử thay đổi trạng thái.</div>}
            </div>
          </details>

          <details className="booking-admin-collapsible">
            <summary>
              <span className="booking-admin-collapsible-title"><Icon name="edit" size={17} /><strong>Lịch sử sửa thông tin</strong></span>
              <span>{informationChangeHistories.length} bản ghi</span>
            </summary>
            <div className="booking-admin-collapsible-body">
              {informationChangeHistories.length ? (
                <ol className="booking-history-list">
                  {informationChangeHistories.map((history) => {
                    const changes = summarizeInformationChange(history)
                    return (
                      <li key={history.id}>
                        <span className="booking-history-dot" aria-hidden="true" />
                        <div>
                          <strong>Khách hàng sửa thông tin</strong>
                          <small>{formatDateTime(history.created_at)} · {history.changed_by?.full_name || 'Khách hàng'}</small>
                          {changes.length ? <ul className="booking-information-change-list">{changes.map((line, index) => <li key={index}>{line}</li>)}</ul> : <p>Không phát hiện thay đổi nội dung cụ thể.</p>}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              ) : <div className="booking-trip-empty">Chưa có lịch sử sửa thông tin.</div>}
            </div>
          </details>

          <details className="booking-admin-collapsible">
            <summary>
              <span className="booking-admin-collapsible-title"><Icon name="alertCircle" size={17} /><strong>Lịch sử hủy và xử lý booking</strong></span>
              <span>{disruptionRequests.length + cancellationHistories.length} bản ghi</span>
            </summary>
            <div className="booking-admin-collapsible-body">
              {disruptionRequests.length || cancellationHistories.length ? (
                <div className="booking-disruption-list">
                  {disruptionRequests.map((request) => (
                    <article key={request.id}>
                      <div>
                        <strong>{REQUEST_TYPE_LABELS[request.type] || request.type}</strong>
                        <span className={`booking-request-inline-status ${request.status}`}>
                          {REQUEST_STATUS_LABELS[request.type === 'refund' && request.status === 'approved'
                            ? (refundStatus || request.status)
                            : request.status] || request.status}
                        </span>
                      </div>
                      <small>Gửi lúc {formatDateTime(request.created_at)}</small>
                      <p>{request.reason || 'Không có lý do.'}</p>
                      {request.admin_note ? <p><b>Phản hồi:</b> {request.admin_note}</p> : null}
                    </article>
                  ))}
                  {cancellationHistories.map((history) => (
                    <article key={`cancellation-history-${history.id}`}>
                      <div>
                        <strong>Hủy booking</strong>
                        <span className="booking-request-inline-status approved">Đã ghi nhận</span>
                      </div>
                      <small>{formatDateTime(history.created_at)} · {history.changed_by?.full_name || 'Khách hàng'}</small>
                      <p>{String(history.note || 'Booking đã được hủy.').replace(/^\[[^\]]+\]\s*/, '')}</p>
                    </article>
                  ))}
                </div>
              ) : <div className="booking-trip-empty">Booking này chưa có yêu cầu hủy hoặc thay đổi.</div>}
            </div>
          </details>

          {booking.note || contact.special_request ? (
            <section className="booking-trip-note">
              <span>Ghi chú</span>
              <p>{booking.note || contact.special_request}</p>
            </section>
          ) : null}
        </div>

        <footer className="booking-trip-footer">
          {canAdminCancel ? (
            <button
              type="button"
              className="booking-trip-cancel-button"
              disabled={busy}
              onClick={() => {
                setCancellationOpen(true)
                setCancellationError('')
              }}
            >
              <Icon name="xCircle" size={17} />
              Hủy booking
            </button>
          ) : null}
          <button type="button" onClick={onClose}>Đóng</button>
        </footer>

        {cancellationOpen ? (
          <div className="booking-cancel-confirm-backdrop" role="presentation" onMouseDown={() => !busy && setCancellationOpen(false)}>
            <section className="booking-cancel-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="booking-cancel-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="booking-cancel-confirm-icon"><Icon name="alertCircle" size={23} /></div>
              <div>
                <span>Xác nhận thao tác</span>
                <h3 id="booking-cancel-confirm-title">Hủy booking {booking.booking_code}</h3>
                <p>Khách hàng sẽ nhận thông báo trên hệ thống và email. Thao tác này được lưu vào timeline booking.</p>
              </div>
              <label htmlFor="booking-cancel-reason">Lý do hủy <b>*</b></label>
              <textarea
                id="booking-cancel-reason"
                rows={4}
                maxLength={1000}
                autoFocus
                value={cancellationReason}
                placeholder="Nhập lý do rõ ràng để thông báo cho khách hàng..."
                onChange={(event) => {
                  setCancellationReason(event.target.value)
                  if (event.target.value.trim()) setCancellationError('')
                }}
              />
              <div className="booking-cancel-confirm-meta">
                <small className={cancellationError ? 'is-error' : ''}>{cancellationError || 'Tối đa 1.000 ký tự'}</small>
                <small>{cancellationReason.length}/1000</small>
              </div>
              <div className="booking-cancel-confirm-actions">
                <button type="button" disabled={busy} onClick={() => setCancellationOpen(false)}>Quay lại</button>
                <button
                  type="button"
                  className="is-danger"
                  disabled={busy}
                  onClick={async () => {
                    const reason = cancellationReason.trim()
                    if (!reason) {
                      setCancellationError('Vui lòng nhập lý do hủy booking.')
                      return
                    }
                    const cancelled = await onStatusChange(booking, 'cancelled', { reason })
                    if (cancelled) setCancellationOpen(false)
                  }}
                >
                  {busy ? 'Đang hủy...' : 'Xác nhận hủy booking'}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </article>
    </div>
  )
}

export default BookingDetailModal
