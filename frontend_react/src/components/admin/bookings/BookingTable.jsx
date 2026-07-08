import BookingBadge from './BookingBadge'
import { CheckIcon, CloseIcon, EyeIcon, TrashIcon } from './BookingIcons'
import {
  customerName,
  customerPhone,
  formatDate,
  formatMoney,
  initialsFor,
} from './bookingFormatters'

const avatarClasses = ['blue', 'violet', 'green', 'amber', 'red', 'pink']

const participantCountFor = (booking) => {
  if (Number.isFinite(Number(booking.participants_count))) {
    return Number(booking.participants_count)
  }

  return Array.isArray(booking.participants) ? booking.participants.length : 0
}

const participantPreviewFor = (booking) => {
  const participants = Array.isArray(booking.participants) ? booking.participants : []
  const names = participants
    .map((participant) => participant.full_name)
    .filter(Boolean)
    .slice(0, 2)

  if (!names.length) {
    return 'Chưa có dữ liệu hành khách'
  }

  const remaining = participantCountFor(booking) - names.length

  return remaining > 0 ? `${names.join(', ')} +${remaining}` : names.join(', ')
}

function BookingActions({ booking, busy, onCancel, onComplete, onConfirm, onDelete, onView }) {
  return (
    <div className="booking-row-actions">
      <button type="button" title="Xem chi tiết" onClick={() => onView(booking)} disabled={!!busy}>
        <EyeIcon />
      </button>
      {booking.status === 'pending' ? (
        <button className="success" type="button" title="Xác nhận" onClick={() => onConfirm(booking)} disabled={!!busy}>
          <CheckIcon />
        </button>
      ) : null}
      {booking.status === 'confirmed' ? (
        <button className="success" type="button" title="Hoàn thành" onClick={() => onComplete(booking)} disabled={!!busy}>
          <CheckIcon />
        </button>
      ) : null}
      {booking.status !== 'cancelled' && booking.status !== 'completed' ? (
        <button className="danger" type="button" title="Hủy booking" onClick={() => onCancel(booking)} disabled={!!busy}>
          <CloseIcon />
        </button>
      ) : null}
      {booking.status === 'cancelled' ? (
        <button className="danger" type="button" title="Xóa vĩnh viễn" onClick={() => onDelete(booking)} disabled={!!busy}>
          <TrashIcon />
        </button>
      ) : null}
    </div>
  )
}

function BookingTable({
  bookings,
  busy,
  loading,
  onCancel,
  onComplete,
  onConfirm,
  onDelete,
  onView,
}) {
  return (
    <div className="booking-table-card">
      <table>
        <thead>
          <tr>
            <th>Khách Hàng</th>
            <th>Tour</th>
            <th>Thành viên</th>
            <th>Ngày Đặt</th>
            <th>Tổng Tiền</th>
            <th>Thanh Toán</th>
            <th>Trạng Thái</th>
            <th>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="booking-empty" colSpan="8">Đang tải danh sách booking...</td>
            </tr>
          ) : bookings.length ? (
            bookings.map((booking, index) => {
              const name = customerName(booking)
              const avatarClass = avatarClasses[index % avatarClasses.length]
              const participantCount = participantCountFor(booking)

              return (
                <tr key={booking.id}>
                  <td>
                    <div className="booking-customer">
                      <span className={`booking-avatar ${avatarClass}`}>{initialsFor(name)}</span>
                      <div>
                        <strong>{name}</strong>
                        <small>{customerPhone(booking)}</small>
                      </div>
                    </div>
                  </td>
                  <td className="booking-tour-name">{booking.tour?.title || '--'}</td>
                  <td>
                    <div className="booking-participants-cell">
                      <strong>{participantCount || booking.number_of_people || 0} khách</strong>
                      <small>{participantPreviewFor(booking)}</small>
                    </div>
                  </td>
                  <td>{formatDate(booking.created_at)}</td>
                  <td className="booking-money">{formatMoney(booking.total_amount)}</td>
                  <td className="booking-payment-cell">
                    <BookingBadge type="payment" value={booking.payment_status} />
                  </td>
                  <td className="booking-status-cell">
                    <BookingBadge type="status" value={booking.status} />
                  </td>
                  <td>
                    <BookingActions
                      booking={booking}
                      busy={busy}
                      onCancel={onCancel}
                      onComplete={onComplete}
                      onConfirm={onConfirm}
                      onDelete={onDelete}
                      onView={onView}
                    />
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td className="booking-empty" colSpan="8">Không có booking phù hợp.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default BookingTable
