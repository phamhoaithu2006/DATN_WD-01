import BookingBadge from './BookingBadge'
import { InvoiceIcon } from './BookingIcons'
import {
  bookingDeparture,
  customerName,
  customerPhone,
  formatDate,
  formatMoney,
} from './bookingFormatters'
import { isBookingReadOnly } from './bookingPermissions'

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
  pending: 'Chờ xác nhận',
  confirmed: 'Sắp diễn ra',
  departed: 'Đang diễn ra',
  completed: 'Đã kết thúc',
  cancelled: 'Đã hủy',
  cancelled_by_tour: 'Đã hủy bởi tour',
  retained: 'Đang bảo lưu',
}

const REQUEST_TYPE_LABELS = {
  refund: 'Hoàn tiền / hủy booking',
  retain: 'Bảo lưu booking',
  transfer: 'Đổi lịch khởi hành',
}

const REQUEST_STATUS_LABELS = {
  pending: 'Chờ xử lý',
  approved: 'Đã duyệt',
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

// So sánh snapshot trước/sau của 1 lần khách sửa thông tin, chỉ liệt kê
// đúng những trường thực sự thay đổi (không hiện lại toàn bộ dữ liệu).
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

function BookingDetailModal({ booking, busy, onClose, onInvoice, onPaymentChange, onStatusChange }) {
  const name = customerName(booking)
  const phone = customerPhone(booking)
  const departure = bookingDeparture(booking)
  const participants = Array.isArray(booking.participants) ? booking.participants : []
  const contact = booking.contact || {}
  const payment = booking.payment || null
  const statusHistories = Array.isArray(booking.status_histories) ? booking.status_histories : []
  const informationChangeHistories = Array.isArray(booking.information_change_histories)
    ? booking.information_change_histories
    : []
  const disruptionRequests = Array.isArray(booking.disruption_requests) ? booking.disruption_requests : []
  const isReadOnly = isBookingReadOnly(booking)
  const departureText = departure
    ? `${formatDate(departure.departure_date)} - ${formatDate(departure.return_date)}`
    : 'Chưa có lịch khởi hành'
  const paymentMethodLabel = payment?.payment_method === 'cod'
    ? 'Thanh toán thủ công'
    : payment?.payment_method || '--'
  const cannotReturnToPending = booking.payment_status === 'paid'
    || booking.status === 'completed'
    || booking.status === 'cancelled_by_tour'
    || booking.tourDeparture?.status === 'completed'
  const isCancelledByTour = booking.status === 'cancelled_by_tour'
  const statusValue = isCancelledByTour ? 'confirmed' : (booking.status || '')
  const detailStatusOptions = [
    { value: 'pending', label: 'Chờ xác nhận' },
    { value: 'confirmed', label: 'Sắp diễn ra' },
    { value: 'departed', label: 'Đang diễn ra' },
    { value: 'completed', label: 'Đã kết thúc' },
    { value: 'cancelled', label: 'Đã hủy' },
  ]

  return (
    <div className="booking-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article className="booking-modal booking-detail-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="booking-detail-header">
          <div>
            <p>Chi tiết booking</p>
            <h2>{booking.booking_code || `#${booking.id}`}</h2>
            <span>{booking.tour?.title || 'Chưa có thông tin tour'}</span>
          </div>
          <div className="booking-detail-header-actions">
            <BookingBadge type="status" value={booking.status} />
            <BookingBadge type="payment" value={booking.payment_status} />
            <button type="button" className="booking-invoice-button" title="Xuất hóa đơn" aria-label="Xuất hóa đơn" onClick={() => onInvoice(booking)}>
              <InvoiceIcon />
            </button>
            <button type="button" aria-label="Đóng" onClick={onClose}>×</button>
          </div>
        </header>

        <div className="booking-detail-summary">
          <section>
            <span>Khách hàng</span>
            <strong>{name}</strong>
            <small>{phone || contact.contact_email || '--'}</small>
          </section>
          <section>
            <span>Lịch khởi hành</span>
            <strong>{departureText}</strong>
            <small>{booking.number_of_people || 0} khách</small>
          </section>
          <section className="booking-detail-money">
            <span>Tổng tiền</span>
            <strong>{formatMoney(booking.total_amount)}</strong>
            <small>Giảm giá {formatMoney(booking.discount_amount)}</small>
          </section>
        </div>

        <div className="booking-detail-body">
          <section className="booking-detail-panel">
            <div className="booking-detail-panel-title">
              <span>Thông tin liên hệ</span>
            </div>
            <dl className="booking-detail-list">
              <div>
                <dt>Họ tên</dt>
                <dd>{contact.contact_name || name}</dd>
              </div>
              <div>
                <dt>Số điện thoại</dt>
                <dd>{contact.contact_phone || phone || '--'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{contact.contact_email || booking.user?.email || '--'}</dd>
              </div>
              <div>
                <dt>Địa chỉ</dt>
                <dd>{contact.address || '--'}</dd>
              </div>
            </dl>
          </section>

          <section className="booking-detail-panel">
            <div className="booking-detail-panel-title">
              <span>Thanh toán và xử lý</span>
            </div>
            <div className="booking-detail-controls">
              <label>
                Trạng thái
                <select
                  value={statusValue}
                  disabled={busy || isReadOnly}
                  onChange={(event) => onStatusChange(booking, event.target.value)}
                >
                  {detailStatusOptions.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                      disabled={item.value === 'pending' && (cannotReturnToPending || isCancelledByTour)}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="booking-payment-actions">
                <span>Thanh toán</span>
                {payment ? (
                  <div>
                    <button
                      type="button"
                      disabled={busy || isReadOnly || payment.status === 'success' || payment.status === 'refunded'}
                      onClick={() => onPaymentChange(booking, 'confirm')}
                    >
                      Xác nhận
                    </button>
                    <button
                      type="button"
                      disabled={busy || isReadOnly || payment.status === 'failed' || payment.status === 'success' || payment.status === 'refunded'}
                      onClick={() => onPaymentChange(booking, 'fail')}
                    >
                      Thất bại
                    </button>
                    <button
                      type="button"
                      disabled={busy || isReadOnly || payment.status !== 'success'}
                      onClick={() => onPaymentChange(booking, 'refund')}
                    >
                      Hoàn tiền
                    </button>
                  </div>
                ) : (
                  <small>Chưa có bản ghi thanh toán</small>
                )}
              </div>
            </div>
            <dl className="booking-detail-list compact">
              {booking.status === 'cancelled_by_tour' ? (
                <>
                  <div>
                    <dt>Lý do hủy</dt>
                    <dd>{cancellationReasonLabel(booking)}</dd>
                  </div>
                  <div>
                    <dt>Phương án khách chọn</dt>
                    <dd>{booking.resolution_status === 'pending_selection' ? 'Đang chờ khách lựa chọn' : booking.resolution_status || 'Chưa có'}</dd>
                  </div>
                </>
              ) : null}
              <div>
                <dt>Đơn giá</dt>
                <dd>{formatMoney(booking.unit_price)}</dd>
              </div>
              <div>
                <dt>Ngày đặt</dt>
                <dd>{formatDate(booking.created_at)}</dd>
              </div>
              <div>
                <dt>Phương thức</dt>
                <dd>{paymentMethodLabel}</dd>
              </div>
              <div>
                <dt>Số tiền thanh toán</dt>
                <dd>{payment ? formatMoney(payment.amount) : '--'}</dd>
              </div>
              <div>
                <dt>Mã giao dịch</dt>
                <dd>{payment?.transaction_code || '--'}</dd>
              </div>
              <div>
                <dt>Thời gian thanh toán</dt>
                <dd>{formatDate(payment?.paid_at)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="booking-detail-panel booking-participants-panel">
            <div className="booking-detail-panel-title">
              <span>Danh sách hành khách</span>
              <strong>{participants.length}</strong>
            </div>
            {participants.length ? (
              <div className="booking-participant-list">
              {participants.map((participant, index) => (
                <div className="booking-participant-item" key={participant.id || `${participant.full_name}-${index}`}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{participant.full_name || 'Hành khách'}</strong>
                    <small>
                      {formatDate(participant.birth_date)}
                      {participant.phone ? ` · ${participant.phone}` : ''}
                    </small>
                  </div>
                  <b>{formatMoney(participant.unit_price)}</b>
                </div>
              ))}
              </div>
            ) : (
              <div className="booking-participant-empty">
                Booking này chưa có dữ liệu hành khách.
              </div>
            )}
        </section>

        <section className="booking-detail-panel booking-history-panel">
          <div className="booking-detail-panel-title">
            <span>Lịch sử thay đổi trạng thái</span>
            <strong>{statusHistories.length}</strong>
          </div>
          {statusHistories.length ? (
            <ol className="booking-status-timeline">
              {statusHistories.map((history) => (
                <li key={history.id}>
                  <span className="booking-status-timeline__dot" aria-hidden="true" />
                  <div>
                    <strong>
                      {history.old_status ? `${STATUS_LABELS[history.old_status] || history.old_status} → ` : ''}
                      {STATUS_LABELS[history.new_status] || history.new_status}
                    </strong>
                    <small>{formatDate(history.created_at)} · {history.changed_by?.full_name || 'Hệ thống'}</small>
                    {history.note ? <p>{history.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="booking-participant-empty">Chưa có lịch sử thay đổi trạng thái.</div>
          )}
        </section>

        <section className="booking-detail-panel booking-history-panel">
          <div className="booking-detail-panel-title">
            <span>Lịch sử sửa thông tin liên hệ/hành khách</span>
            <strong>{informationChangeHistories.length}</strong>
          </div>
          {informationChangeHistories.length ? (
            <ol className="booking-status-timeline">
              {informationChangeHistories.map((history) => {
                const changes = summarizeInformationChange(history)

                return (
                  <li key={history.id}>
                    <span className="booking-status-timeline__dot" aria-hidden="true" />
                    <div>
                      <strong>Khách hàng sửa thông tin</strong>
                      <small>{formatDate(history.created_at)} · {history.changed_by?.full_name || 'Khách hàng'}</small>
                      {changes.length ? (
                        <ul className="booking-information-change-list">
                          {changes.map((line, index) => (
                            <li key={index}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Không phát hiện thay đổi nội dung cụ thể.</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="booking-participant-empty">Chưa có lịch sử sửa thông tin.</div>
          )}
        </section>

        <section className="booking-detail-panel booking-history-panel">
          <div className="booking-detail-panel-title">
            <span>Yêu cầu hủy và xử lý booking</span>
            <strong>{disruptionRequests.length}</strong>
          </div>
          {disruptionRequests.length ? (
            <div className="booking-disruption-list">
              {disruptionRequests.map((request) => (
                <article key={request.id}>
                  <div>
                    <strong>{REQUEST_TYPE_LABELS[request.type] || request.type}</strong>
                    <span className={`booking-request-inline-status ${request.status}`}>
                      {REQUEST_STATUS_LABELS[request.status] || request.status}
                    </span>
                  </div>
                  <small>Gửi lúc {formatDate(request.created_at)}</small>
                  <p>{request.reason || 'Không có lý do.'}</p>
                  {request.admin_note ? <p><b>Phản hồi:</b> {request.admin_note}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="booking-participant-empty">Booking này chưa có yêu cầu hủy hoặc thay đổi.</div>
          )}
        </section>

        {booking.note || contact.special_request ? (
          <section className="booking-note">
            <span>Ghi chú</span>
            <p>{booking.note || contact.special_request}</p>
          </section>
        ) : null}
      </article>
    </div>
  )
}

export default BookingDetailModal