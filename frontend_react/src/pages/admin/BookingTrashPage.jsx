import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import BookingBadge from '../../components/admin/bookings/BookingBadge'
import BookingDetailModal from '../../components/admin/bookings/BookingDetailModal'
import { formatDate, messageFrom } from '../../components/admin/bookings/bookingFormatters'
import { confirmAction } from '../../components/common/AppConfirmDialog.jsx'
import { deleteBooking, getTrashedBooking, getTrashedBookings, restoreBooking } from '../../services/bookingApi'
import '../../styles/booking-management.css'

function BookingTrashPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [detail, setDetail] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    try {
      const payload = await getTrashedBookings({ per_page: 100 })
      setBookings(Array.isArray(payload.data) ? payload.data : [])
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const view = async (booking) => {
    setBusy(booking.id)
    try {
      const payload = await getTrashedBooking(booking.id)
      setDetail(payload.data || payload)
    } catch (error) { setNotice({ type: 'error', text: messageFrom(error) }) }
    finally { setBusy(null) }
  }

  const run = async (booking, action) => {
    const hardDelete = action === 'delete'
    if (!await confirmAction(hardDelete ? 'Xóa vĩnh viễn booking này? Hành động không thể hoàn tác.' : 'Hoàn tác booking về trạng thái Chờ xác nhận?', {
      title: hardDelete ? 'Xóa vĩnh viễn' : 'Hoàn tác booking', confirmLabel: hardDelete ? 'Xóa' : 'Hoàn tác', tone: hardDelete ? 'danger' : 'primary',
    })) return
    setBusy(booking.id)
    try {
      const response = hardDelete ? await deleteBooking(booking.id) : await restoreBooking(booking.id)
      setNotice({ type: 'success', text: response.message })
      setDetail(null)
      await load()
    } catch (error) { setNotice({ type: 'error', text: messageFrom(error) }) }
    finally { setBusy(null) }
  }

  return (
    <section className="booking-management-page">
      <AdminPageHeader breadcrumb={['ViVuGo', 'Quản Lý Booking', 'Thùng rác']} title="Booking đã xóa mềm" description="Xem chi tiết, hoàn tác hoặc xóa vĩnh viễn booking." actions={<button type="button" className="booking-trash-page-button" onClick={() => navigate('/admin/bookings')}>Quay lại danh sách</button>} />
      {notice ? <div className={`booking-notice ${notice.type}`}><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)}>×</button></div> : null}
      <div className="booking-table-card"><table><thead><tr><th>Mã booking</th><th>Khách hàng</th><th>Tour</th><th>Thanh toán</th><th>Ngày xóa</th><th>Hành động</th></tr></thead><tbody>
        {bookings.length ? bookings.map((booking) => <tr key={booking.id}><td>{booking.booking_code}</td><td>{booking.contact?.contact_name || booking.user?.full_name || '--'}</td><td>{booking.tour?.title || '--'}</td><td><BookingBadge type="payment" value={booking.payment_status} /></td><td>{formatDate(booking.deleted_at)}</td><td><div className="booking-row-actions booking-trash-actions"><button type="button" disabled={busy === booking.id} onClick={() => view(booking)}>Chi tiết</button><button type="button" disabled={busy === booking.id} onClick={() => run(booking, 'restore')}>Hoàn tác</button><button className="danger" type="button" disabled={busy === booking.id} onClick={() => run(booking, 'delete')}>Xóa cứng</button></div></td></tr>) : <tr><td className="booking-empty" colSpan="6">Thùng rác chưa có booking.</td></tr>}
      </tbody></table></div>
      {detail ? <BookingDetailModal booking={detail} busy={!!busy} onClose={() => setDetail(null)} onDeleteRefundProof={() => {}} onInvoice={() => {}} onPaymentChange={() => {}} onStatusChange={() => {}} /> : null}
    </section>
  )
}

export default BookingTrashPage
