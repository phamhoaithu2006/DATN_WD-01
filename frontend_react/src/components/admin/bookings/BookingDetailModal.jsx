import { paymentOptions, statusOptions } from './bookingConstants'
import {
  customerName,
  customerPhone,
  formatDate,
  formatMoney,
} from './bookingFormatters'

function BookingDetailModal({ booking, busy, onClose, onPaymentChange, onStatusChange }) {
  const name = customerName(booking)

  return (
    <div className="booking-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <article className="booking-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Chi tiết booking</p>
            <h2>{booking.booking_code}</h2>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div className="booking-detail-grid">
          <section>
            <span>Khách hàng</span>
            <strong>{name}</strong>
            <small>{customerPhone(booking)}</small>
          </section>
          <section>
            <span>Tour</span>
            <strong>{booking.tour?.title || '--'}</strong>
            <small>
              {booking.tourDeparture
                ? `${formatDate(booking.tourDeparture.departure_date)} - ${formatDate(booking.tourDeparture.return_date)}`
                : 'Chưa có lịch khởi hành'}
            </small>
          </section>
          <section>
            <span>Số khách</span>
            <strong>{booking.number_of_people || 0}</strong>
            <small>Đơn giá {formatMoney(booking.unit_price)}</small>
          </section>
          <section>
            <span>Tổng tiền</span>
            <strong>{formatMoney(booking.total_amount)}</strong>
            <small>Giảm giá {formatMoney(booking.discount_amount)}</small>
          </section>
        </div>

        <div className="booking-detail-actions">
          <label>
            Trạng thái
            <select
              value={booking.status || ''}
              disabled={busy}
              onChange={(event) => onStatusChange(booking, event.target.value)}
            >
              {statusOptions.filter((item) => item.value).map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            Thanh toán
            <select
              value={booking.payment_status || ''}
              disabled={busy}
              onChange={(event) => onPaymentChange(booking, event.target.value)}
            >
              {paymentOptions.filter((item) => item.value).map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>

        {booking.note ? (
          <div className="booking-note">
            <span>Ghi chú</span>
            <p>{booking.note}</p>
          </div>
        ) : null}
      </article>
    </div>
  )
}

export default BookingDetailModal