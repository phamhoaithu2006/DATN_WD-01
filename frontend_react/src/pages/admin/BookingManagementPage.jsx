import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BookingDetailModal from '../../components/admin/bookings/BookingDetailModal'
import BookingFilters from '../../components/admin/bookings/BookingFilters'
import BookingPagination from '../../components/admin/bookings/BookingPagination'
import BookingStats from '../../components/admin/bookings/BookingStats'
import BookingTable from '../../components/admin/bookings/BookingTable'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { confirmAction, promptAction } from '../../components/common/AppConfirmDialog.jsx'
import {
  getBookingList,
  getMeta,
  getStats,
  messageFrom,
} from '../../components/admin/bookings/bookingFormatters'
import {
  cancelBooking,
  moveBookingToTrash,
  getBooking,
  getBookings,
  getBookingStatistics,
  getBookingTimeline,
  updateBooking,
} from '../../services/bookingApi'
import { confirmPayment, deleteRefundProof, failPayment, refundPayment } from '../../services/paymentApi'
import { pickSingleFile } from '../../utils/filePicker'
import '../../styles/booking-management.css'

function BookingManagementPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [statistics, setStatistics] = useState({})
  const [meta, setMeta] = useState({})
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [date, setDate] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [detail, setDetail] = useState(null)
  const [notice, setNotice] = useState(null)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineEvents, setTimelineEvents] = useState([])

  const params = useMemo(
    () => ({
      page,
      per_page: perPage,
      search: search.trim() || undefined,
      display_status: status === 'cancelled_all' ? 'cancelled' : (status || undefined),
      payment_status: paymentStatus || undefined,
      from_date: date || undefined,
      to_date: date || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
    }),
    [date, page, paymentStatus, perPage, search, sortBy, sortDir, status],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bookingPayload, statPayload] = await Promise.all([
        getBookings(params),
        getBookingStatistics(),
      ])

      setBookings(getBookingList(bookingPayload))
      setMeta(getMeta(bookingPayload))
      setStatistics(getStats(statPayload))
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!notice) return undefined

    const timer = setTimeout(() => {
      setNotice(null)
    }, 5000)

    return () => clearTimeout(timer)
  }, [notice])

  const changePage = (nextPage) => {
    setPage(nextPage)
  }

  const changeFilter = (setter) => (value) => {
    setPage(1)
    setter(value)
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setPaymentStatus('')
    setDate('')
    setSortBy('created_at')
    setSortDir('desc')
    setPage(1)
  }

  const openTimeline = async () => {
    setTimelineOpen(true)
    setTimelineLoading(true)
    try {
      const response = await getBookingTimeline()
      setTimelineEvents(Array.isArray(response?.data) ? response.data : [])
    } catch (error) {
      setTimelineEvents([])
      setNotice({ type: 'error', text: messageFrom(error) })
    } finally {
      setTimelineLoading(false)
    }
  }

  const timelineActionLabel = (action) => ({
    booking_viewed: 'Xem chi tiết',
    booking_created: 'Tạo booking',
    booking_information_updated: 'Cập nhật thông tin',
    booking_status_updated: 'Cập nhật trạng thái',
    admin_cancelled: 'Admin hủy booking',
    customer_cancelled: 'Khách hủy booking',
    admin_disruption_approved: 'Duyệt yêu cầu hủy',
    payment_failed: 'Thanh toán thất bại',
    payment_refund_pending: 'Chờ hoàn tiền',
    refund_completed: 'Đã hoàn tiền',
    moved_to_trash: 'Chuyển vào thùng rác',
    restored: 'Khôi phục booking',
    hard_deleted: 'Xóa vĩnh viễn',
  }[action] || String(action || '').replaceAll('_', ' '))

  const refreshDetail = async (bookingId) => {
    if (!detail || Number(detail.id) !== Number(bookingId)) return

    const payload = await getBooking(bookingId)
    setDetail(payload.data || payload)
  }

  const updateStatus = async (booking, nextStatus, options = {}) => {
    setBusy(`${booking.id}-${nextStatus}`)
    try {
      const response =
        nextStatus === 'cancelled'
          ? await cancelBooking(booking.id, options.reason)
          : await updateBooking(booking.id, { status: nextStatus })

      setNotice({ type: 'success', text: response.message || 'Cập nhật booking thành công.' })
      await load()
      await refreshDetail(booking.id)
      if (nextStatus === 'cancelled') {
        window.dispatchEvent(new CustomEvent('admin-booking-refund:changed'))
      }
      return true
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
      return false
    } finally {
      setBusy(null)
    }
  }

  const updatePayment = async (booking, action) => {
    const paymentId = booking.payment?.id

    if (!paymentId) {
      setNotice({ type: 'error', text: 'Booking này chưa có bản ghi thanh toán.' })
      return
    }

    setBusy(`${booking.id}-${action}`)
    try {
      const transactionCode = action === 'confirm'
        ? (await promptAction('Mã này có thể để trống.', { title: 'Xác nhận thanh toán thủ công', confirmLabel: 'Xác nhận', placeholder: 'Mã giao dịch' }))?.trim()
        : undefined

      if (action === 'confirm' && transactionCode === undefined) {
        setBusy(null)
        return
      }

      let response

      if (action === 'confirm') {
        response = await confirmPayment(paymentId, transactionCode ? { transaction_code: transactionCode } : {})
      } else if (action === 'fail') {
        response = await failPayment(paymentId)
      } else {
        const proofFile = await pickSingleFile({ accept: 'image/jpeg,image/png,image/webp' })
        if (!proofFile) return
        response = await refundPayment(paymentId, proofFile)
      }

      setNotice({ type: 'success', text: response.message || 'Cập nhật thanh toán thành công.' })
      await load()
      await refreshDetail(booking.id)
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
    } finally {
      setBusy(null)
    }
  }

  const openDetail = async (booking) => {
    setBusy(`view-${booking.id}`)
    try {
      const payload = await getBooking(booking.id)
      setDetail(payload.data || payload)
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
    } finally {
      setBusy(null)
    }
  }

  const removeRefundProof = async (booking) => {
    if (!booking.payment?.id || !await confirmAction('Xóa ảnh chứng minh hoàn tiền này?', { title: 'Xóa ảnh', confirmLabel: 'Xóa', tone: 'danger' })) return
    setBusy(`${booking.id}-delete-proof`)
    try {
      const response = await deleteRefundProof(booking.payment.id)
      setNotice({ type: 'success', text: response.message || 'Đã xóa ảnh.' })
      await refreshDetail(booking.id)
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
    } finally {
      setBusy(null)
    }
  }

  const printInvoice = (booking) => {
    const escapeHtml = (value) => String(value ?? '--')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
    const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number(value || 0))
    const formatInvoiceDate = (value) => value
      ? new Intl.DateTimeFormat('vi-VN').format(new Date(value))
      : '--'
    const customer = booking.contact?.contact_name || booking.user?.full_name || '--'
    const phone = booking.contact?.contact_phone || booking.user?.phone || '--'
    const invoice = window.open('', '_blank', 'width=860,height=720')

    if (!invoice) {
      setNotice({ type: 'error', text: 'Trình duyệt đang chặn cửa sổ xuất hóa đơn.' })
      return
    }

    const paymentStatus = {
      paid: 'Đã thanh toán',
      unpaid: 'Chưa thanh toán',
      failed: 'Thanh toán thất bại',
      refund_pending: 'Chờ hoàn tiền',
      refunded: 'Đã hoàn tiền',
    }[booking.payment_status] || '--'
    const bookingStatus = {
      awaiting_payment: 'Chờ thanh toán',
      confirmed: 'Đã xác nhận',
      upcoming: 'Sắp diễn ra',
      departed: 'Đang diễn ra',
      completed: 'Đã kết thúc',
      cancelled: 'Đã hủy',
      cancelled_by_tour: 'Đã hủy',
    }[booking.status] || '--'
    const paymentMethod = booking.payment?.payment_method === 'cod'
      ? 'Thanh toán thủ công'
      : booking.payment?.payment_method?.toUpperCase() || '--'
    const participants = Array.isArray(booking.participants) ? booking.participants : []
    const participantRows = participants.length
      ? participants.map((participant, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(participant.full_name)}</td><td>${escapeHtml(formatInvoiceDate(participant.birth_date))}</td><td>${escapeHtml(participant.phone)}</td><td>${escapeHtml(participant.participant_type || '--')}</td><td>${escapeHtml(formatCurrency(participant.unit_price))}</td></tr>`).join('')
      : '<tr><td colspan="6" class="muted">Chưa có danh sách hành khách.</td></tr>'

    invoice.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Hóa đơn ${escapeHtml(booking.booking_code)}</title><style>body{font-family:Arial,sans-serif;color:#12213a;padding:38px;max-width:820px;margin:auto;font-size:14px}header{display:flex;justify-content:space-between;border-bottom:2px solid #0ea5e9;padding-bottom:18px}h1{margin:0;color:#0284c7;font-size:28px}h2{font-size:17px;margin:25px 0 8px}table{width:100%;border-collapse:collapse}td,th{padding:9px;border-bottom:1px solid #dbe5f2;text-align:left;vertical-align:top}th{background:#f1f7fc;font-size:13px}.total{font-size:18px;font-weight:700;text-align:right;margin:15px 0 0}.muted{color:#64748b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.note{padding:12px;background:#f8fafc;border-radius:6px;line-height:1.5}@media print{body{padding:0}}</style></head><body><header><div><h1>ViVuGo</h1><p class="muted">HÓA ĐƠN BOOKING</p></div><div><strong>Mã booking: ${escapeHtml(booking.booking_code || `#${booking.id}`)}</strong><br><span class="muted">Ngày xuất: ${escapeHtml(formatInvoiceDate(new Date()))}</span></div></header><div class="grid"><section><h2>Thông tin khách hàng</h2><table><tr><td>Họ tên</td><td>${escapeHtml(customer)}</td></tr><tr><td>Số điện thoại</td><td>${escapeHtml(phone)}</td></tr><tr><td>Email</td><td>${escapeHtml(booking.contact?.contact_email || booking.user?.email)}</td></tr><tr><td>Địa chỉ</td><td>${escapeHtml(booking.contact?.address)}</td></tr></table></section><section><h2>Trạng thái booking</h2><table><tr><td>Trạng thái</td><td>${escapeHtml(bookingStatus)}</td></tr><tr><td>Ngày đặt</td><td>${escapeHtml(formatInvoiceDate(booking.created_at))}</td></tr><tr><td>Thanh toán</td><td>${escapeHtml(paymentStatus)}</td></tr><tr><td>Phương thức</td><td>${escapeHtml(paymentMethod)}</td></tr></table></section></div><h2>Chi tiết tour</h2><table><tr><td>Tour</td><td>${escapeHtml(booking.tour?.title)}</td></tr><tr><td>Thời gian</td><td>Khởi hành: ${escapeHtml(formatInvoiceDate(booking.tourDeparture?.departure_date))} &nbsp; | &nbsp; Kết thúc: ${escapeHtml(formatInvoiceDate(booking.tourDeparture?.return_date))}</td></tr><tr><td>Số lượng khách</td><td>${escapeHtml(booking.number_of_people)} khách</td></tr></table><h2>Danh sách hành khách</h2><table><thead><tr><th>#</th><th>Họ tên</th><th>Ngày sinh</th><th>Điện thoại</th><th>Loại khách</th><th>Đơn giá</th></tr></thead><tbody>${participantRows}</tbody></table><h2>Thanh toán</h2><table><tr><td>Tạm tính</td><td>${escapeHtml(formatCurrency(Number(booking.total_amount || 0) + Number(booking.discount_amount || 0)))}</td></tr><tr><td>Giảm giá</td><td>${escapeHtml(formatCurrency(booking.discount_amount))}</td></tr><tr><td>Mã giao dịch</td><td>${escapeHtml(booking.payment?.transaction_code)}</td></tr><tr><td>Thời gian thanh toán</td><td>${escapeHtml(formatInvoiceDate(booking.payment?.paid_at))}</td></tr></table><p class="total">Tổng thanh toán: ${escapeHtml(formatCurrency(booking.total_amount))}</p>${booking.note || booking.contact?.special_request ? `<h2>Ghi chú</h2><p class="note">${escapeHtml(booking.note || booking.contact?.special_request)}</p>` : ''}</body></html>`)
    invoice.document.write(`<div id="invoice-actions" style="display:flex;gap:12px;justify-content:flex-end;margin:32px 0 12px;padding-top:18px;border-top:1px solid #dbe5f2"><button id="print-invoice" type="button" style="background:#0284c7;border:0;border-radius:6px;color:#fff;cursor:pointer;font-size:14px;font-weight:700;padding:10px 16px">In / Lưu PDF</button><button id="download-invoice" type="button" style="background:#fff;border:1px solid #0284c7;border-radius:6px;color:#0284c7;cursor:pointer;font-size:14px;font-weight:700;padding:10px 16px">Tải hóa đơn</button></div><script>document.getElementById('print-invoice').addEventListener('click',function(){window.print()});document.getElementById('download-invoice').addEventListener('click',function(){var actions=document.getElementById('invoice-actions');actions.style.display='none';var file=new Blob(['<!doctype html>'+document.documentElement.outerHTML],{type:'text/html;charset=utf-8'});actions.style.display='flex';var link=document.createElement('a');link.href=URL.createObjectURL(file);link.download='hoa-don-${escapeHtml(booking.booking_code || booking.id)}.html';link.click();URL.revokeObjectURL(link.href)});</script>`)
    invoice.document.close()
    invoice.focus()
    return

    // eslint-disable-next-line no-unreachable
    invoice.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Hóa đơn ${escapeHtml(booking.booking_code)}</title><style>body{font-family:Arial,sans-serif;color:#12213a;padding:42px;max-width:760px;margin:auto}header{display:flex;justify-content:space-between;border-bottom:2px solid #0ea5e9;padding-bottom:20px}h1{margin:0;color:#0284c7}h2{font-size:18px;margin-top:30px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:11px;border-bottom:1px solid #dbe5f2;text-align:left}th{background:#f8fafc}.total{font-size:20px;font-weight:700;text-align:right;margin-top:20px}.muted{color:#64748b}@media print{body{padding:0}}</style></head><body><header><div><h1>ViVuGo</h1><p class="muted">HÓA ĐƠN BOOKING</p></div><div><strong>Mã booking: ${escapeHtml(booking.booking_code || `#${booking.id}`)}</strong><br><span class="muted">Ngày xuất: ${escapeHtml(formatInvoiceDate(new Date()))}</span></div></header><h2>Thông tin khách hàng</h2><table><tr><td>Họ tên</td><td>${escapeHtml(customer)}</td></tr><tr><td>Số điện thoại</td><td>${escapeHtml(phone)}</td></tr><tr><td>Email</td><td>${escapeHtml(booking.contact?.contact_email || booking.user?.email)}</td></tr></table><h2>Chi tiết tour</h2><table><thead><tr><th>Tour</th><th>Ngày khởi hành</th><th>Số khách</th><th>Thành tiền</th></tr></thead><tbody><tr><td>${escapeHtml(booking.tour?.title)}</td><td>${escapeHtml(formatInvoiceDate(booking.tourDeparture?.departure_date))}</td><td>${escapeHtml(booking.number_of_people)}</td><td>${escapeHtml(formatCurrency(booking.total_amount))}</td></tr></tbody></table><p class="total">Tổng thanh toán: ${escapeHtml(formatCurrency(booking.total_amount))}</p><p class="muted">Trạng thái thanh toán: ${escapeHtml(booking.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán')}</p></body></html>`)
    invoice.document.close()
    invoice.focus()
    invoice.print()
  }

  const removeBooking = async (booking) => {
    if (!await confirmAction('Chuyển booking này vào thùng rác?', { title: 'Xóa mềm booking', confirmLabel: 'Xóa mềm', tone: 'danger' })) return

    setBusy(`delete-${booking.id}`)
    try {
      const response = await moveBookingToTrash(booking.id)
      setNotice({ type: 'success', text: response.message || 'Đã xóa booking.' })
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
    } finally {
      setBusy(null)
    }
  }

  const cards = [
    { key: 'total', label: 'Tổng', value: statistics.total || meta.total || bookings.length, className: 'total' },
    { key: 'awaiting_payment', label: 'Chờ thanh toán', value: statistics.awaiting_payment || 0, className: 'pending' },
    { key: 'upcoming', label: 'Sắp diễn ra', value: statistics.upcoming || 0, className: 'upcoming' },
    { key: 'departed', label: 'Đang diễn ra', value: statistics.departed || 0, className: 'pending' },
    { key: 'completed', label: 'Đã kết thúc', value: statistics.completed || 0, className: 'completed' },
  ]

  return (
    <section className="booking-management-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Booking', 'Quản Lý Booking']}
        title="Quản Lý Booking"
        description="Theo dõi và quản lý tất cả đặt tour."
        actions={
          <div className="booking-header-actions">
            <button type="button" className="booking-trash-page-button" onClick={() => navigate('/admin/bookings/trash')}>Thùng rác</button>
            <BookingStats activeStatus={status} cards={[cards[0]]} onStatusChange={changeFilter(setStatus)} />
          </div>
        }
      />

      {notice ? (
        <div className={`booking-notice ${notice.type}`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)}>×</button>
        </div>
      ) : null}

      <BookingFilters
        advancedOpen={advancedOpen}
        date={date}
        paymentStatus={paymentStatus}
        search={search}
        sortBy={sortBy}
        sortDir={sortDir}
        status={status}
        onAdvancedToggle={() => setAdvancedOpen((open) => !open)}
        onClear={clearFilters}
        onDateChange={changeFilter(setDate)}
        onPaymentStatusChange={changeFilter(setPaymentStatus)}
        onSearchChange={changeFilter(setSearch)}
        onSortByChange={setSortBy}
        onSortDirChange={setSortDir}
        onStatusChange={changeFilter(setStatus)}
        onTimelineOpen={() => void openTimeline()}
      />

      <BookingTable
        bookings={bookings}
        busy={busy}
        loading={loading}
        onCancel={(booking) => updateStatus(booking, 'cancelled')}
        onConfirm={(booking) => updateStatus(booking, 'confirmed')}
        onDelete={removeBooking}
        onView={openDetail}
      />

      <BookingPagination
        loading={loading}
        meta={meta}
        page={page}
        perPage={perPage}
        onPageChange={changePage}
        onPerPageChange={(value) => {
          setPage(1)
          setPerPage(value)
        }}
      />

      {timelineOpen ? (
        <div className="booking-timeline-backdrop" role="presentation" onMouseDown={() => setTimelineOpen(false)}>
          <section className="booking-timeline-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-timeline-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>Nhật ký booking</span><h2 id="booking-timeline-title">Timeline hoạt động booking</h2></div>
              <button type="button" onClick={() => setTimelineOpen(false)} aria-label="Đóng timeline">×</button>
            </header>
            <div className="booking-timeline-content">
              {timelineLoading ? <p className="booking-timeline-empty">Đang tải timeline...</p> : null}
              {!timelineLoading && !timelineEvents.length ? <p className="booking-timeline-empty">Chưa có hoạt động booking nào.</p> : null}
              {!timelineLoading && timelineEvents.length ? (
                <ol className="booking-timeline-list">
                  {timelineEvents.map((event) => (
                    <li key={event.id}>
                      <i aria-hidden="true" />
                      <div>
                        <div className="booking-timeline-event-title"><strong>{event.booking_code || `#${event.booking_id}`}</strong><span>{timelineActionLabel(event.action)}</span></div>
                        {event.reason ? <p>{event.reason}</p> : null}
                        <small>{event.actor} · {event.created_at ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.created_at.replace(' ', 'T'))) : '--'}</small>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {detail ? (
        <BookingDetailModal
          booking={detail}
          busy={!!busy}
          onClose={() => setDetail(null)}
          onInvoice={printInvoice}
          onDeleteRefundProof={removeRefundProof}
          onPaymentChange={updatePayment}
          onStatusChange={updateStatus}
        />
      ) : null}
    </section>
  )
}

export default BookingManagementPage
