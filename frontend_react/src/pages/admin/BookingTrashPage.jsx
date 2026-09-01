import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import BookingBadge from '../../components/admin/bookings/BookingBadge'
import BookingDetailModal from '../../components/admin/bookings/BookingDetailModal'
import {
  customerName,
  customerPhone,
  formatDate,
  formatMoney,
  initialsFor,
  messageFrom,
} from '../../components/admin/bookings/bookingFormatters'
import { confirmAction } from '../../components/common/AppConfirmDialog.jsx'
import {
  deleteBooking,
  getTrashedBooking,
  getTrashedBookings,
  restoreBooking,
} from '../../services/bookingApi'
import '../../styles/booking-management.css'

const avatarClasses = ['blue', 'violet', 'green', 'amber', 'red', 'pink']

function BookingTrashPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await getTrashedBookings({ per_page: 100 })
      setBookings(Array.isArray(payload.data) ? payload.data : [])
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const view = async (booking) => {
    setBusy(booking.id)
    try {
      const payload = await getTrashedBooking(booking.id)
      setDetail(payload.data || payload)
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
    } finally {
      setBusy(null)
    }
  }

  const run = async (booking, action) => {
    const hardDelete = action === 'delete'
    const confirmed = await confirmAction(
      hardDelete
        ? 'Xóa vĩnh viễn booking này? Hành động này sẽ xóa hoàn toàn khỏi cơ sở dữ liệu và không thể khôi phục.'
        : 'Khôi phục booking này về danh sách quản lý booking?',
      {
        title: hardDelete ? 'Xóa vĩnh viễn booking' : 'Khôi phục booking',
        confirmLabel: hardDelete ? 'Xóa vĩnh viễn' : 'Khôi phục',
        tone: hardDelete ? 'danger' : 'primary',
      }
    )

    if (!confirmed) return

    setBusy(booking.id)
    try {
      const response = hardDelete
        ? await deleteBooking(booking.id)
        : await restoreBooking(booking.id)
      setNotice({
        type: 'success',
        text: response.message || (hardDelete ? 'Đã xóa vĩnh viễn booking.' : 'Đã khôi phục booking.'),
      })
      setDetail(null)
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
    } finally {
      setBusy(null)
    }
  }

  const filteredBookings = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return bookings

    return bookings.filter((b) => {
      const code = String(b.booking_code || '').toLowerCase()
      const name = String(customerName(b)).toLowerCase()
      const phone = String(customerPhone(b)).toLowerCase()
      const tour = String(b.tour?.title || '').toLowerCase()

      return (
        code.includes(keyword) ||
        name.includes(keyword) ||
        phone.includes(keyword) ||
        tour.includes(keyword)
      )
    })
  }, [bookings, search])

  return (
    <section className="booking-management-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Booking', 'Quản Lý Booking', 'Thùng rác']}
        title="Booking đã xóa mềm"
        description="Xem chi tiết, hoàn tác hoặc xóa vĩnh viễn booking đã bị xóa vào thùng rác."
        actions={
          <button
            type="button"
            className="booking-trash-page-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
            onClick={() => navigate('/admin/bookings')}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Quay lại danh sách
          </button>
        }
      />

      {notice ? (
        <div className={`booking-notice ${notice.type}`} role="status">
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
            ×
          </button>
        </div>
      ) : null}

      <div className="booking-trash-toolbar">
        <div className="booking-trash-search-wrapper">
          <svg
            className="booking-trash-search-icon"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            type="text"
            className="booking-trash-search-input"
            placeholder="Tìm theo mã booking, khách hàng, tour..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="booking-trash-count-badge">
          Tổng cộng: <b>{bookings.length}</b> booking trong thùng rác
        </div>
      </div>

      <div className="booking-table-card">
        <table>
          <thead>
            <tr>
              <th>Mã booking</th>
              <th>Khách hàng</th>
              <th>Tour</th>
              <th>Tổng tiền</th>
              <th>Thanh toán</th>
              <th>Ngày xóa</th>
              <th style={{ textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="booking-empty" colSpan="7">
                  Đang tải danh sách booking trong thùng rác...
                </td>
              </tr>
            ) : filteredBookings.length ? (
              filteredBookings.map((booking, index) => {
                const name = customerName(booking)
                const phone = customerPhone(booking)
                const avatarClass = avatarClasses[index % avatarClasses.length]
                const isItemBusy = busy === booking.id

                return (
                  <tr key={booking.id}>
                    <td>
                      <span className="booking-code-text" style={{ fontWeight: 800, color: '#0ea5e9', fontFamily: 'monospace' }}>
                        {booking.booking_code}
                      </span>
                    </td>
                    <td>
                      <div className="booking-customer">
                        <span className={`booking-avatar ${avatarClass}`}>
                          {initialsFor(name)}
                        </span>
                        <div>
                          <strong>{name}</strong>
                          <small>{phone || 'Chưa có SĐT'}</small>
                        </div>
                      </div>
                    </td>
                    <td className="booking-tour-name" style={{ maxWidth: 260 }}>
                      <span title={booking.tour?.title || '--'}>
                        {booking.tour?.title || '--'}
                      </span>
                    </td>
                    <td className="booking-money">
                      {formatMoney(booking.total_amount)}
                    </td>
                    <td className="booking-payment-cell">
                      <BookingBadge type="payment" value={booking.payment_status} />
                    </td>
                    <td>{formatDate(booking.deleted_at)}</td>
                    <td>
                      <div className="booking-trash-actions" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="booking-trash-btn booking-trash-btn-view"
                          title="Xem chi tiết booking"
                          disabled={isItemBusy}
                          onClick={() => view(booking)}
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                          Chi tiết
                        </button>

                        <button
                          type="button"
                          className="booking-trash-btn booking-trash-btn-restore"
                          title="Khôi phục booking"
                          disabled={isItemBusy}
                          onClick={() => run(booking, 'restore')}
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                          </svg>
                          Hoàn tác
                        </button>

                        <button
                          type="button"
                          className="booking-trash-btn booking-trash-btn-delete"
                          title="Xóa vĩnh viễn booking"
                          disabled={isItemBusy}
                          onClick={() => run(booking, 'delete')}
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M4 6h16" />
                            <path d="M9 6V4h6v2" />
                            <path d="m18 6-1 14H7L6 6" />
                            <path d="M10 11v5" />
                            <path d="M14 11v5" />
                          </svg>
                          Xóa cứng
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="7">
                  <div className="booking-trash-empty-state">
                    <svg
                      className="booking-trash-empty-icon"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                    >
                      <path d="M4 6h16" />
                      <path d="M9 6V4h6v2" />
                      <path d="m18 6-1 14H7L6 6" />
                    </svg>
                    <div className="booking-trash-empty-title">
                      {search ? 'Không tìm thấy kết quả phù hợp' : 'Thùng rác chưa có booking'}
                    </div>
                    <div className="booking-trash-empty-desc">
                      {search
                        ? `Không có booking nào khớp với từ khóa "${search}". Hãy thử tìm kiếm bằng từ khóa khác.`
                        : 'Hiện tại không có booking nào bị xóa mềm trong hệ thống.'}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail ? (
        <BookingDetailModal
          booking={detail}
          busy={!!busy}
          onClose={() => setDetail(null)}
          onDeleteRefundProof={() => {}}
          onInvoice={() => {}}
          onPaymentChange={() => {}}
          onStatusChange={() => {}}
        />
      ) : null}
    </section>
  )
}

export default BookingTrashPage

