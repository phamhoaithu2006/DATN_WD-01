import BookingBadge from './BookingBadge'
import { InvoiceIcon } from './BookingIcons'
import {
  bookingDeparture,
  customerName,
  customerPhone,
  formatDate,
  formatMoney,
} from './bookingFormatters'

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

function BookingDetailModal({ booking, busy, onClose, onInvoice, onPaymentChange, onStatusChange }) {
  const name = customerName(booking)
  const phone = customerPhone(booking)
  const departure = bookingDeparture(booking)
  const participants = Array.isArray(booking.participants) ? booking.participants : []
  const contact = booking.contact || {}
  const payment = booking.payment || null
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
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'departed', label: 'Đã khởi hành' },
    { value: 'completed', label: 'Hoàn thành' },
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
                  disabled={busy}
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
                      disabled={busy || isCancelledByTour || payment.status === 'success' || payment.status === 'refunded'}
                      onClick={() => onPaymentChange(booking, 'confirm')}
                    >
                      Xác nhận
                    </button>
                    <button
                      type="button"
                      disabled={busy || isCancelledByTour || payment.status === 'failed' || payment.status === 'success' || payment.status === 'refunded'}
                      onClick={() => onPaymentChange(booking, 'fail')}
                    >
                      Thất bại
                    </button>
                    <button
                      type="button"
                      disabled={busy || payment.status !== 'success'}
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
