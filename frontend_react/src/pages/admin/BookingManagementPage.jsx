import { useCallback, useEffect, useMemo, useState } from 'react'
import BookingDetailModal from '../../components/admin/bookings/BookingDetailModal'
import BookingFilters from '../../components/admin/bookings/BookingFilters'
import BookingPagination from '../../components/admin/bookings/BookingPagination'
import BookingStats from '../../components/admin/bookings/BookingStats'
import BookingTable from '../../components/admin/bookings/BookingTable'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import {
  getBookingList,
  getMeta,
  getStats,
  messageFrom,
} from '../../components/admin/bookings/bookingFormatters'
import {
  cancelBooking,
  deleteBooking,
  getBooking,
  getBookings,
  getBookingStatistics,
  updateBooking,
} from '../../services/bookingApi'
import '../../styles/booking-management.css'

function BookingManagementPage() {
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
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [detail, setDetail] = useState(null)
  const [notice, setNotice] = useState(null)

  const params = useMemo(
    () => ({
      page,
      per_page: 10,
      search: search.trim() || undefined,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      from_date: date || undefined,
      to_date: date || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
    }),
    [date, page, paymentStatus, search, sortBy, sortDir, status],
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
    }, 10000)

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

  const refreshDetail = async (bookingId) => {
    if (!detail || Number(detail.id) !== Number(bookingId)) return

    const payload = await getBooking(bookingId)
    setDetail(payload.data || payload)
  }

  const updateStatus = async (booking, nextStatus) => {
    setBusy(`${booking.id}-${nextStatus}`)
    try {
      const response =
        nextStatus === 'cancelled'
          ? await cancelBooking(booking.id)
          : await updateBooking(booking.id, { status: nextStatus })

      setNotice({ type: 'success', text: response.message || 'Cập nhật booking thành công.' })
      await load()
      await refreshDetail(booking.id)
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) })
    } finally {
      setBusy(null)
    }
  }

  const updatePayment = async (booking, nextPaymentStatus) => {
    setBusy(`${booking.id}-${nextPaymentStatus}`)
    try {
      const response = await updateBooking(booking.id, { payment_status: nextPaymentStatus })

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

  const removeBooking = async (booking) => {
    if (!window.confirm(`Xóa vĩnh viễn booking ${booking.booking_code}?`)) return

    setBusy(`delete-${booking.id}`)
    try {
      const response = await deleteBooking(booking.id)

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
    { key: 'pending', label: 'Chờ xác nhận', value: statistics.pending || 0, className: 'pending' },
    { key: 'confirmed', label: 'Đã xác nhận', value: statistics.confirmed || 0, className: 'confirmed' },
    { key: 'completed', label: 'Hoàn thành', value: statistics.completed || 0, className: 'completed' },
  ]

  return (
    <section className="booking-management-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Booking']}
        title="Quản Lý Booking"
        description="Theo dõi và quản lý tất cả đặt tour"
        actions={
          <BookingStats
            activeStatus={status}
            cards={cards}
            onStatusChange={changeFilter(setStatus)}
          />
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
      />

      <BookingTable
        bookings={bookings}
        busy={busy}
        loading={loading}
        onCancel={(booking) => updateStatus(booking, 'cancelled')}
        onComplete={(booking) => updateStatus(booking, 'completed')}
        onConfirm={(booking) => updateStatus(booking, 'confirmed')}
        onDelete={removeBooking}
        onView={openDetail}
      />

      <BookingPagination
        loading={loading}
        meta={meta}
        page={page}
        onPageChange={changePage}
      />

      {detail ? (
        <BookingDetailModal
          booking={detail}
          busy={!!busy}
          onClose={() => setDetail(null)}
          onPaymentChange={updatePayment}
          onStatusChange={updateStatus}
        />
      ) : null}
    </section>
  )
}

export default BookingManagementPage
