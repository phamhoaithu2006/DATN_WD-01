import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cancelBooking,
  deleteBooking,
  getBooking,
  getBookings,
  getBookingStatistics,
  updateBooking,
} from '../../services/bookingApi'
import '../../styles/booking-management.css'

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const paymentOptions = [
  { value: '', label: 'Tất cả thanh toán' },
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'refunded', label: 'Hoàn tiền' },
]

const statusMeta = {
  pending: { label: 'Chờ xác nhận', className: 'waiting' },
  confirmed: { label: 'Đã xác nhận', className: 'confirmed' },
  completed: { label: 'Hoàn thành', className: 'completed' },
  cancelled: { label: 'Đã hủy', className: 'cancelled' },
}

const paymentMeta = {
  unpaid: { label: 'Chưa thanh toán', className: 'unpaid' },
  paid: { label: 'Đã thanh toán', className: 'paid' },
  failed: { label: 'Thất bại', className: 'failed' },
  refunded: { label: 'Hoàn tiền', className: 'refunded' },
}

const moneyFormatter = new Intl.NumberFormat('vi-VN')

const messageFrom = (error) =>
  Object.values(error.response?.data?.errors || {}).flat()[0] ||
  error.response?.data?.message ||
  'Không thể xử lý yêu cầu.'

const getBookingList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.bookings)) return payload.bookings
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

const getStats = (payload) => payload?.data || payload || {}

const getMeta = (payload) => payload?.meta || payload?.data?.meta || {}

const formatMoney = (value) => `${moneyFormatter.format(Number(value || 0))}đ`

const formatDate = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('vi-VN')
}

const customerName = (booking) =>
  booking.contact?.contact_name ||
  booking.user?.full_name ||
  booking.customer_name ||
  'Khách hàng'

const customerPhone = (booking) =>
  booking.contact?.contact_phone ||
  booking.user?.phone ||
  booking.customer_phone ||
  booking.user?.email ||
  ''

const initialsFor = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M9 6V4h6v2" />
      <path d="m18 6-1 14H7L6 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  )
}

function Badge({ type, value }) {
  const meta = type === 'payment' ? paymentMeta[value] : statusMeta[value]
  return <span className={`booking-badge ${meta?.className || 'neutral'}`}>{meta?.label || value || '--'}</span>
}

function BookingDetailModal({ booking, onClose, onStatusChange, onPaymentChange, busy }) {
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
            <small>{booking.tourDeparture ? `${formatDate(booking.tourDeparture.departure_date)} - ${formatDate(booking.tourDeparture.return_date)}` : 'Chưa có lịch khởi hành'}</small>
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
    { key: 'pending', label: 'Chờ XN', value: statistics.pending || 0, className: 'pending' },
    { key: 'confirmed', label: 'Đã XN', value: statistics.confirmed || 0, className: 'confirmed' },
    { key: 'completed', label: 'Hoàn Thành', value: statistics.completed || 0, className: 'completed' },
  ]

  return (
    <section className="booking-management-page">
      <header className="booking-heading">
        <div>
          <h1>Quản Lý Booking</h1>
          <p>Theo dõi và quản lý tất cả đặt tour</p>
        </div>
        <div className="booking-stat-cards">
          {cards.map((card) => (
            <button
              className={`booking-stat-card ${card.className} ${status === card.key ? 'active' : ''}`}
              key={card.key}
              type="button"
              onClick={() => {
                setPage(1)
                setStatus(card.key === 'total' ? '' : card.key)
              }}
            >
              <strong>{card.value}</strong>
              <span>{card.label}</span>
            </button>
          ))}
        </div>
      </header>

      {notice ? (
        <div className={`booking-notice ${notice.type}`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)}>×</button>
        </div>
      ) : null}

      <div className="booking-toolbar">
        <label className="booking-search">
          <SearchIcon />
          <input
            value={search}
            placeholder="Tìm theo mã booking, khách hàng, tour..."
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
          />
        </label>
        <select
          value={status}
          onChange={(event) => {
            setPage(1)
            setStatus(event.target.value)
          }}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(event) => {
            setPage(1)
            setDate(event.target.value)
          }}
        />
        <button className="booking-filter-button" type="button" onClick={() => setAdvancedOpen((open) => !open)}>
          <FilterIcon />
          Lọc Nâng Cao
        </button>
      </div>

      {advancedOpen ? (
        <div className="booking-advanced-filter">
          <label>
            Thanh toán
            <select
              value={paymentStatus}
              onChange={(event) => {
                setPage(1)
                setPaymentStatus(event.target.value)
              }}
            >
              {paymentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Sắp xếp
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="created_at">Ngày đặt</option>
              <option value="total_amount">Tổng tiền</option>
              <option value="booking_code">Mã booking</option>
            </select>
          </label>
          <label>
            Thứ tự
            <select value={sortDir} onChange={(event) => setSortDir(event.target.value)}>
              <option value="desc">Mới nhất</option>
              <option value="asc">Cũ nhất</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setStatus('')
              setPaymentStatus('')
              setDate('')
              setSortBy('created_at')
              setSortDir('desc')
              setPage(1)
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : null}

      <div className="booking-table-card">
        <table>
          <thead>
            <tr>
              <th>Mã Booking</th>
              <th>Khách Hàng</th>
              <th>Tour</th>
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
                const avatarClass = ['blue', 'violet', 'green', 'amber', 'red', 'pink'][index % 6]

                return (
                  <tr key={booking.id}>
                    <td>
                      <button className="booking-code" type="button" onClick={() => openDetail(booking)}>
                        {booking.booking_code}
                      </button>
                    </td>
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
                    <td>{formatDate(booking.created_at)}</td>
                    <td className="booking-money">{formatMoney(booking.total_amount)}</td>
                    <td><Badge type="payment" value={booking.payment_status} /></td>
                    <td><Badge type="status" value={booking.status} /></td>
                    <td>
                      <div className="booking-row-actions">
                        <button type="button" title="Xem chi tiết" onClick={() => openDetail(booking)} disabled={!!busy}>
                          <EyeIcon />
                        </button>
                        {booking.status === 'pending' ? (
                          <button className="success" type="button" title="Xác nhận" onClick={() => updateStatus(booking, 'confirmed')} disabled={!!busy}>
                            <CheckIcon />
                          </button>
                        ) : null}
                        {booking.status === 'confirmed' ? (
                          <button className="success" type="button" title="Hoàn thành" onClick={() => updateStatus(booking, 'completed')} disabled={!!busy}>
                            <CheckIcon />
                          </button>
                        ) : null}
                        {booking.status !== 'cancelled' && booking.status !== 'completed' ? (
                          <button className="danger" type="button" title="Hủy booking" onClick={() => updateStatus(booking, 'cancelled')} disabled={!!busy}>
                            <CloseIcon />
                          </button>
                        ) : null}
                        {booking.status === 'cancelled' ? (
                          <button className="danger" type="button" title="Xóa vĩnh viễn" onClick={() => removeBooking(booking)} disabled={!!busy}>
                            <TrashIcon />
                          </button>
                        ) : null}
                      </div>
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

      <footer className="booking-pagination">
        <span>
          Trang {meta.current_page || page} / {meta.last_page || 1}
        </span>
        <div>
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
            Trước
          </button>
          <button
            type="button"
            disabled={page >= (meta.last_page || 1) || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Sau
          </button>
        </div>
      </footer>

      {detail ? (
        <BookingDetailModal
          booking={detail}
          busy={!!busy}
          onClose={() => setDetail(null)}
          onStatusChange={updateStatus}
          onPaymentChange={updatePayment}
        />
      ) : null}
    </section>
  )
}

export default BookingManagementPage
