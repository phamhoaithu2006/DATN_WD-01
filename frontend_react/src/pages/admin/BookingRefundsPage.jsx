import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import adminBookingRefundApi from '../../services/adminBookingRefundApi'
import { pickSingleFile } from '../../utils/filePicker'
import { mediaUrl } from '../../utils/mediaUrl'
import '../../styles/booking-refund.css'

const TAB_OPTIONS = [
  { value: 'refund_pending', label: 'Chờ hoàn tiền' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
]

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatDate(value, withTime = false) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('vi-VN', withTime
    ? { dateStyle: 'short', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

function getErrorMessage(error) {
  const errors = error?.response?.data?.errors
  const firstError = errors && Object.values(errors).flat()?.[0]

  return firstError || error?.response?.data?.message || error?.message || 'Đã xảy ra lỗi, vui lòng thử lại.'
}

function customerName(booking) {
  return booking?.contact?.contact_name || booking?.user?.full_name || 'Khách hàng'
}

function customerPhone(booking) {
  return booking?.contact?.contact_phone || booking?.user?.phone || 'Chưa có số điện thoại'
}

function StatusBadge({ status }) {
  return (
    <span className={`booking-refund-status booking-refund-status--${status}`}>
      <i aria-hidden="true" />
      {status === 'refunded' ? 'Đã hoàn tiền' : 'Chờ hoàn tiền'}
    </span>
  )
}

function SummaryCard({ label, value, tone }) {
  return (
    <div className={`booking-refund-summary-card is-${tone}`}>
      <span>{label}</span>
      <strong>{Number(value || 0).toLocaleString('vi-VN')}</strong>
    </div>
  )
}

function BookingRefundsPage() {
  const [activeTab, setActiveTab] = useState('refund_pending')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [bookings, setBookings] = useState([])
  const [summary, setSummary] = useState({})
  const [timeline, setTimeline] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [proofFile, setProofFile] = useState(null)
  const [proofPreviewUrl, setProofPreviewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const params = useMemo(() => ({
    page,
    per_page: 12,
    status: activeTab,
    search: search.trim() || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  }), [activeTab, fromDate, page, search, toDate])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminBookingRefundApi.list(params)
      setBookings(Array.isArray(response?.data) ? response.data : [])
      setMeta(response?.meta || { current_page: 1, last_page: 1, total: 0 })
      setSummary(response?.summary || {})
      setTimeline(Array.isArray(response?.timeline) ? response.timeline : [])
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
      setBookings([])
      setTimeline([])
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 220)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!proofFile) {
      setProofPreviewUrl('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(proofFile)
    setProofPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [proofFile])

  const resetSelection = () => {
    setSelectedBooking(null)
    setProofFile(null)
  }

  const openBooking = async (booking) => {
    setDetailLoading(true)
    setProofFile(null)
    try {
      const response = await adminBookingRefundApi.show(booking.id)
      setSelectedBooking(response?.data || booking)
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setDetailLoading(false)
    }
  }

  const chooseProof = async () => {
    const file = await pickSingleFile({ accept: 'image/jpeg,image/png,image/webp' })
    if (file) setProofFile(file)
  }

  const submitRefund = async () => {
    if (!selectedBooking || !proofFile) {
      setNotice({ type: 'error', text: 'Vui lòng chọn ảnh chứng minh đã hoàn tiền.' })
      return
    }

    setBusy(true)
    try {
      const response = await adminBookingRefundApi.refund(selectedBooking.id, proofFile)
      setSelectedBooking(response?.data || selectedBooking)
      setProofFile(null)
      setNotice({ type: 'success', text: response?.message || 'Đã xác nhận hoàn tiền cho booking.' })
      window.dispatchEvent(new CustomEvent('admin-booking-refund:changed'))
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const changeTab = (tab) => {
    setActiveTab(tab)
    setPage(1)
    resetSelection()
  }

  const clearFilters = () => {
    setSearch('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  return (
    <section className="booking-refund-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Booking', 'Hoàn tiền booking']}
        title="Hoàn tiền booking"
        description="Theo dõi các booking đã hủy, tải ảnh đối soát và xác nhận hoàn tiền cho khách."
        showNotificationBell
      />

      {notice ? (
        <div className={`booking-refund-notice is-${notice.type}`} role="status">
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo">×</button>
        </div>
      ) : null}

      <div className="booking-refund-summary" aria-label="Tổng quan hoàn tiền">
        <SummaryCard label="Tổng booking cần xử lý" value={summary.total_count} tone="total" />
        <SummaryCard label="Chờ hoàn tiền" value={summary.refund_pending_count} tone="pending" />
        <SummaryCard label="Đã hoàn tiền" value={summary.refunded_count} tone="refunded" />
      </div>

      <section className="booking-refund-panel">
        <div className="booking-refund-tabs" role="tablist" aria-label="Trạng thái hoàn tiền">
          {TAB_OPTIONS.map((tab) => {
            const count = tab.value === 'refund_pending'
              ? summary.refund_pending_count
              : summary.refunded_count

            return (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                className={activeTab === tab.value ? 'is-active' : ''}
                key={tab.value}
                onClick={() => changeTab(tab.value)}
              >
                {tab.label}
                <span>{Number(count || 0).toLocaleString('vi-VN')}</span>
              </button>
            )
          })}
        </div>

        <div className="booking-refund-filters">
          <label className="booking-refund-search">
            <span>Tìm kiếm</span>
            <div>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                placeholder="Mã booking, tên khách, SĐT, email hoặc tên tour…"
              />
            </div>
          </label>
          <label>
            <span>Từ ngày</span>
            <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1) }} />
          </label>
          <label>
            <span>Đến ngày</span>
            <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1) }} />
          </label>
          <button type="button" className="booking-refund-clear-button" onClick={clearFilters}>Đặt lại</button>
        </div>

        <div className="booking-refund-workspace">
          <div className="booking-refund-table-wrap">
            <table className="booking-refund-table">
              <thead>
                <tr>
                  <th>Booking / khách hàng</th>
                  <th>Tour</th>
                  <th>Giá trị</th>
                  <th>Trạng thái</th>
                  <th>Ngày hủy</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="booking-refund-empty">Đang tải danh sách booking…</td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan="6" className="booking-refund-empty">Không có booking phù hợp.</td></tr>
                ) : bookings.map((booking) => (
                  <tr className={selectedBooking?.id === booking.id ? 'is-selected' : ''} key={booking.id}>
                    <td>
                      <button type="button" className="booking-refund-code" onClick={() => void openBooking(booking)}>
                        {booking.booking_code || `#${booking.id}`}
                      </button>
                      <span className="booking-refund-customer">{customerName(booking)}</span>
                      <small>{customerPhone(booking)}</small>
                    </td>
                    <td>
                      <strong className="booking-refund-tour" title={booking.tour?.title || ''}>{booking.tour?.title || 'Chưa có tên tour'}</strong>
                      <small>{booking.number_of_people || 0} khách</small>
                    </td>
                    <td className="booking-refund-money">{formatCurrency(booking.total_amount)}</td>
                    <td><StatusBadge status={booking.payment_status} /></td>
                    <td>{formatDate(booking.cancelled_at || booking.updated_at)}</td>
                    <td><button type="button" className="booking-refund-view-button" onClick={() => void openBooking(booking)}>Xem</button></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="booking-refund-pagination">
              <span>Hiển thị <strong>{bookings.length}</strong> / <strong>{Number(meta.total || 0)}</strong> booking</span>
              <div>
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Trước</button>
                <strong>{page} / {Number(meta.last_page || 1)}</strong>
                <button type="button" disabled={page >= Number(meta.last_page || 1) || loading} onClick={() => setPage((current) => current + 1)}>Sau →</button>
              </div>
            </div>
          </div>

          <aside className="booking-refund-detail" aria-live="polite">
            {detailLoading ? <div className="booking-refund-detail-empty">Đang tải chi tiết…</div> : null}
            {!detailLoading && !selectedBooking ? (
              <div className="booking-refund-detail-empty">
                <span aria-hidden="true">↗</span>
                <strong>Chọn một booking</strong>
                <p>Xem thông tin hủy, trạng thái thanh toán và tải ảnh đối soát tại đây.</p>
              </div>
            ) : null}
            {!detailLoading && selectedBooking ? (
              <>
                <div className="booking-refund-detail-header">
                  <div>
                    <span>Chi tiết hoàn tiền</span>
                    <h2>{selectedBooking.booking_code || `#${selectedBooking.id}`}</h2>
                  </div>
                  <button type="button" onClick={resetSelection} aria-label="Đóng chi tiết">×</button>
                </div>
                <div className="booking-refund-detail-status">
                  <StatusBadge status={selectedBooking.payment_status} />
                  <strong>{formatCurrency(selectedBooking.total_amount)}</strong>
                </div>
                <dl className="booking-refund-detail-grid">
                  <div><dt>Khách hàng</dt><dd>{customerName(selectedBooking)}</dd></div>
                  <div><dt>Số điện thoại</dt><dd>{customerPhone(selectedBooking)}</dd></div>
                  <div><dt>Email</dt><dd>{selectedBooking.contact?.contact_email || selectedBooking.user?.email || '—'}</dd></div>
                  <div><dt>Tour</dt><dd>{selectedBooking.tour?.title || '—'}</dd></div>
                  <div><dt>Ngày hủy</dt><dd>{formatDate(selectedBooking.cancelled_at, true)}</dd></div>
                  <div><dt>Thanh toán</dt><dd>{selectedBooking.payment?.status === 'refunded' ? 'Đã hoàn tiền' : selectedBooking.payment?.status === 'success' ? 'Đã thanh toán' : selectedBooking.payment?.status || '—'}</dd></div>
                </dl>
                <div className="booking-refund-reason">
                  <span>Lý do hủy</span>
                  <p>{selectedBooking.cancel_reason || selectedBooking.cancellation_reason || 'Không có lý do chi tiết.'}</p>
                </div>
                {selectedBooking.payment?.refund_proof_url ? (
                  <a className="booking-refund-existing-proof" href={mediaUrl(selectedBooking.payment.refund_proof_url)} target="_blank" rel="noreferrer">
                    <img src={mediaUrl(selectedBooking.payment.refund_proof_url)} alt="Ảnh chứng minh đã hoàn tiền" />
                    <span>Ảnh chứng minh hiện tại · Mở ảnh</span>
                  </a>
                ) : null}
                <div className="booking-refund-proof-box">
                  <div>
                    <strong>{selectedBooking.payment_status === 'refunded' ? 'Thay ảnh chứng minh' : 'Ảnh chứng minh hoàn tiền'}</strong>
                    <small>JPG, PNG hoặc WebP · tối đa 5MB</small>
                  </div>
                  <button type="button" onClick={() => void chooseProof()} disabled={busy}>
                    {proofFile ? 'Chọn ảnh khác' : 'Chọn ảnh'}
                  </button>
                  {proofFile ? <span className="booking-refund-file-name">{proofFile.name}</span> : null}
                  {proofPreviewUrl ? <img className="booking-refund-proof-preview" src={proofPreviewUrl} alt="Ảnh chứng minh hoàn tiền đã chọn" /> : null}
                </div>
                <button type="button" className="booking-refund-submit" onClick={() => void submitRefund()} disabled={busy || !proofFile}>
                  {busy ? 'Đang lưu…' : selectedBooking.payment_status === 'refunded' ? 'Lưu ảnh thay thế' : 'Xác nhận đã hoàn tiền'}
                </button>
              </>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="booking-refund-timeline-card">
        <div className="booking-refund-timeline-heading">
          <div>
            <span>Nhật ký đối soát</span>
            <h2>Timeline hoàn tiền và xóa booking</h2>
          </div>
          <strong>{timeline.length} hoạt động gần nhất</strong>
        </div>
        {timeline.length ? (
          <ol className="booking-refund-timeline">
            {timeline.map((event) => (
              <li key={event.id}>
                <span className={`booking-refund-timeline-dot is-${event.action}`} aria-hidden="true" />
                <div>
                  <div className="booking-refund-timeline-title"><strong>{event.title}</strong><em>{event.booking_code}</em></div>
                  <p>{event.detail}</p>
                  <small>{formatDate(event.created_at, true)} · {event.actor}</small>
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="booking-refund-timeline-empty">Chưa có hoạt động hoàn tiền hoặc xóa booking nào.</p>}
      </section>
    </section>
  )
}

export default BookingRefundsPage
