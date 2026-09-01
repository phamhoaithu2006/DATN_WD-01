import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import adminBookingDisruptionApi from '../../services/adminBookingDisruptionApi'
import { tourDepartureApi } from '../../services/tourDepartureApi'
import { mediaUrl } from '../../utils/mediaUrl'
import '../../styles/booking-cancellation-requests.css'

const TYPE_LABELS = {
  refund: 'Hoàn tiền',
  retain: 'Bảo lưu',
  transfer: 'Đổi lịch khởi hành',
}

const STATUS_LABELS = {
  pending: 'Chờ xử lý',
  approved: 'Đã duyệt',
  refund_pending: 'Chưa hoàn tiền',
  refunded: 'Đã hoàn tiền',
  rejected: 'Đã từ chối',
}

function getDisplayStatus(request) {
  if (request?.display_status) return request.display_status

  if (request?.type === 'refund' && request?.status === 'approved') {
    if (request.booking?.payment_status === 'refund_pending') return 'refund_pending'
    if (request.booking?.payment_status === 'refunded') return 'refunded'
  }

  return request?.status || 'pending'
}

function unwrapItems(response) {
  const payload = response?.data ?? response
  const data = payload?.data ?? payload

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
}

function getErrorMessage(error) {
  const errors = error?.response?.data?.errors
  const firstError = errors && Object.values(errors).flat()?.[0]

  return firstError || error?.response?.data?.message || error?.message || 'Đã xảy ra lỗi, vui lòng thử lại.'
}

function formatDate(value, withTime = false) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('vi-VN', withTime
    ? { dateStyle: 'short', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

function formatDeparture(departure) {
  if (!departure?.departure_date) return 'Chưa chọn lịch mới'

  const departureDate = formatDate(departure.departure_date)
  const returnDate = departure.return_date ? ` – ${formatDate(departure.return_date)}` : ''

  return `${departureDate}${returnDate}`
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function statusClass(status) {
  return `booking-request-status booking-request-status--${status}`
}

function StatCard({ label, value, tone = 'total', active = false, onClick }) {
  const icons = {
    total: (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    pending: (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    approved: (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    rejected: (
      <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  return (
    <button
      type="button"
      className={`booking-request-stat booking-request-stat--${tone}${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <div className="booking-request-stat-icon-bg">
        {icons[tone] || icons.total}
      </div>
      <div className="booking-request-stat-content">
        <span className="booking-request-stat-title">
          {tone === 'pending' ? <span className="pulse-dot" /> : null}
          {label}
        </span>
        <strong>{Number(value || 0).toLocaleString('vi-VN')}</strong>
      </div>
    </button>
  )
}

function TypeBadge({ type }) {
  const icons = {
    refund: (
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    retain: (
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
    transfer: (
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  }

  return (
    <span className={`booking-request-type booking-request-type--${type || 'refund'}`}>
      {icons[type] || null}
      {TYPE_LABELS[type] || type}
    </span>
  )
}

function StatusBadge({ status }) {
  const icons = {
    pending: (
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    approved: (
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
    refund_pending: (
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    refunded: (
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
    rejected: (
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  }

  return (
    <span className={statusClass(status)}>
      {icons[status] || null}
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function RequestDetail({
  request,
  refundProofFile = null,
  refundProofPreviewUrl = '',
  onRefundProofChange = null,
  refundBusy = false,
}) {
  if (!request) return null

  const booking = request.booking
  const currentDeparture = booking?.tour_departure
  const contact = booking?.contact
  const payment = booking?.payment
  const displayStatus = getDisplayStatus(request)
  const canUploadRefundProof = request.type === 'refund'
    && request.status === 'approved'
    && displayStatus === 'refund_pending'
    && typeof onRefundProofChange === 'function'
  const participants = Array.isArray(booking?.participants) ? booking.participants : []
  const genderLabel = { male: 'Nam', female: 'Nữ', other: 'Khác' }
  const participantTypeLabel = { adult: 'Người lớn', child: 'Trẻ em', infant: 'Em bé' }

  return (
    <div className="booking-request-detail">
      <div className="booking-request-detail-grid">
        <div>
          <span>Mã booking</span>
          <strong>{booking?.booking_code || '—'}</strong>
        </div>
        <div>
          <span>Khách hàng</span>
          <strong>{booking?.user?.full_name || '—'}</strong>
        </div>
        <div>
          <span>Tour</span>
          <strong>{booking?.tour?.title || '—'}</strong>
        </div>
        <div>
          <span>Giá trị booking</span>
          <strong>{formatCurrency(booking?.total_amount)}</strong>
        </div>
        <div>
          <span>Lịch hiện tại</span>
          <strong>{formatDeparture(currentDeparture)}</strong>
        </div>
        <div>
          <span>Số khách</span>
          <strong>{booking?.number_of_people || 0} khách</strong>
        </div>
      </div>

      {request.type === 'refund' ? (
        <div className="booking-request-detail-block booking-request-refund-block">
          <div className="booking-request-refund-content">
            <span>Trạng thái hoàn tiền</span>
            <strong className={`booking-request-refund-state booking-request-refund-state--${displayStatus}`}>
              {STATUS_LABELS[displayStatus] || displayStatus}
            </strong>
            {canUploadRefundProof ? (
              <div className="booking-request-refund-upload">
                <label className="booking-request-proof-picker">
                  <span>{refundProofFile ? refundProofFile.name : 'Chọn ảnh chứng minh'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => onRefundProofChange(event.target.files?.[0] || null)}
                    disabled={refundBusy}
                  />
                </label>
                <small>Ảnh JPG, PNG hoặc WebP, tối đa 5MB.</small>
              </div>
            ) : null}
          </div>
          {refundProofPreviewUrl ? (
            <div className="booking-request-refund-preview">
              <img src={refundProofPreviewUrl} alt="Ảnh chứng minh hoàn tiền đã chọn" />
            </div>
          ) : null}
          {payment?.refund_proof_url ? (
            <a className="booking-request-refund-proof" href={mediaUrl(payment.refund_proof_url)} target="_blank" rel="noreferrer">
              <img src={mediaUrl(payment.refund_proof_url)} alt="Ảnh chứng minh đã hoàn tiền" />
              <span>Xem ảnh chứng minh hoàn tiền</span>
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="booking-request-detail-block">
        <span>Thông tin người đặt và liên hệ</span>
        <div className="booking-request-person-grid">
          <div><small>Người đặt</small><strong>{booking?.user?.full_name || '—'}</strong></div>
          <div><small>Email tài khoản</small><strong>{booking?.user?.email || '—'}</strong></div>
          <div><small>Số điện thoại tài khoản</small><strong>{booking?.user?.phone || '—'}</strong></div>
          <div><small>Người liên hệ</small><strong>{contact?.contact_name || '—'}</strong></div>
          <div><small>Email liên hệ</small><strong>{contact?.contact_email || '—'}</strong></div>
          <div><small>Số điện thoại liên hệ</small><strong>{contact?.contact_phone || '—'}</strong></div>
        </div>
      </div>

      <div className="booking-request-detail-block">
        <span>Danh sách hành khách ({participants.length})</span>
        {participants.length ? (
          <div className="booking-request-participant-list">
            {participants.map((participant, index) => (
              <div className="booking-request-participant" key={participant.id || index}>
                <b>{index + 1}</b>
                <div>
                  <strong>{participant.full_name || `Hành khách ${index + 1}`}</strong>
                  <small>
                    {participantTypeLabel[participant.participant_type] || 'Hành khách'}
                    {' · '}{genderLabel[participant.gender] || 'Chưa rõ giới tính'}
                    {' · '}{participant.birth_date ? formatDate(participant.birth_date) : 'Chưa có ngày sinh'}
                  </small>
                  <small>
                    SĐT: {participant.phone || '—'} · CCCD/Hộ chiếu: {participant.identity_number || '—'}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : <p>Booking chưa có thông tin hành khách.</p>}
      </div>

      <div className="booking-request-detail-block">
        <span>Lý do khách gửi</span>
        <p>{request.reason || 'Không có nội dung mô tả.'}</p>
      </div>

      {request.requested_departure ? (
        <div className="booking-request-detail-block">
          <span>Lịch khách đề xuất</span>
          <p>{formatDeparture(request.requested_departure)}</p>
        </div>
      ) : null}

      {request.admin_note ? (
        <div className="booking-request-detail-block booking-request-detail-block--note">
          <span>Ghi chú xử lý</span>
          <p>{request.admin_note}</p>
        </div>
      ) : null}
    </div>
  )
}

function DecisionModal({
  request,
  mode,
  note,
  targetDepartureId,
  targetDepartures,
  loadingTargets,
  busy,
  onNoteChange,
  onTargetChange,
  onClose,
  onSubmit,
}) {
  if (!request || !mode) return null

  const isApprove = mode === 'approve'
  const isTransfer = isApprove && request.type === 'transfer'
  const hasTransferTarget = !isTransfer || targetDepartureId

  return (
    <div className="booking-request-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="booking-request-modal" role="dialog" aria-modal="true" aria-labelledby="booking-request-modal-title">
        <div className="booking-request-modal__header">
          <div>
            <span className="booking-request-eyebrow">{isApprove ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'}</span>
            <h2 id="booking-request-modal-title">{request.booking?.booking_code || 'Booking'}</h2>
          </div>
          <button type="button" className="booking-request-icon-button" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <RequestDetail request={request} />

        {isTransfer ? (
          <label className="booking-request-field">
            <span>Lịch khởi hành mới <b>*</b></span>
            <select value={targetDepartureId} onChange={(event) => onTargetChange(event.target.value)} disabled={loadingTargets || busy}>
              <option value="">{loadingTargets ? 'Đang tải lịch phù hợp…' : 'Chọn lịch khởi hành mới'}</option>
              {targetDepartures.map((departure) => {
                const availableSlots = Math.max(0, Number(departure.total_slots || 0) - Number(departure.booked_slots || 0))
                return (
                  <option value={departure.id} key={departure.id}>
                    {formatDeparture(departure)} · còn {availableSlots} chỗ
                  </option>
                )
              })}
            </select>
            {!loadingTargets && targetDepartures.length === 0 ? (
              <small>Không còn lịch cùng tour đủ chỗ và chưa khởi hành.</small>
            ) : null}
          </label>
        ) : null}

        <label className="booking-request-field">
          <span>{isApprove ? 'Ghi chú cho khách/đối soát' : 'Lý do từ chối'} {!isApprove ? <b>*</b> : null}</span>
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder={isApprove ? 'Có thể để trống' : 'Nhập lý do cụ thể để khách nắm được hướng xử lý'}
            rows={4}
            disabled={busy}
          />
        </label>

        <div className="booking-request-modal__actions">
          <button type="button" className="booking-request-button booking-request-button--secondary" onClick={onClose} disabled={busy}>
            Để sau
          </button>
          <button
            type="button"
            className={`booking-request-button ${isApprove ? 'booking-request-button--primary' : 'booking-request-button--danger'}`}
            onClick={onSubmit}
            disabled={busy || !hasTransferTarget || (!isApprove && note.trim().length < 3)}
          >
            {busy ? 'Đang xử lý…' : isApprove ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BookingCancellationRequestsPage({ embedded = false }) {
  const [requests, setRequests] = useState([])
  const [summary, setSummary] = useState({})
  const [timeline, setTimeline] = useState([])
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineDetailLoading, setTimelineDetailLoading] = useState(null)
  const [expandedTimelineEvent, setExpandedTimelineEvent] = useState(null)
  const [timelineDetailRequest, setTimelineDetailRequest] = useState(null)
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [filters, setFilters] = useState({ search: '', status: 'pending', type: '' })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [decision, setDecision] = useState(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [targetDepartureId, setTargetDepartureId] = useState('')
  const [targetDepartures, setTargetDepartures] = useState([])
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refundProofFile, setRefundProofFile] = useState(null)
  const [refundProofPreviewUrl, setRefundProofPreviewUrl] = useState('')

  const params = useMemo(() => ({
    page,
    per_page: 12,
    search: filters.search.trim() || undefined,
    status: filters.status || undefined,
    type: filters.type || undefined,
  }), [filters, page])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminBookingDisruptionApi.list(params)
      setRequests(Array.isArray(response?.data) ? response.data : [])
      setMeta(response?.meta || { current_page: 1, last_page: 1, total: 0 })
      setSummary(response?.summary || {})
      setTimeline(Array.isArray(response?.timeline) ? response.timeline : [])
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
      setRequests([])
      setTimeline([])
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!refundProofFile) {
      setRefundProofPreviewUrl('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(refundProofFile)
    setRefundProofPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [refundProofFile])

  const updateFilter = (key, value) => {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const openTimelineDetail = async (event) => {
    if (expandedTimelineEvent === event.id) {
      setExpandedTimelineEvent(null)
      setTimelineDetailRequest(null)
      return
    }

    setExpandedTimelineEvent(event.id)
    setTimelineDetailRequest(null)
    setTimelineDetailLoading(event.id)
    try {
      let request

      if (event.disruption_request_id) {
        const response = await adminBookingDisruptionApi.show(event.disruption_request_id)
        request = response?.data
      } else {
        const response = await adminBookingDisruptionApi.list({
          search: event.booking_code,
          per_page: 100,
        })
        const matchingRequests = (Array.isArray(response?.data) ? response.data : [])
          .filter((item) => item.booking?.booking_code === event.booking_code)
        const eventTime = new Date(event.created_at).getTime()

        request = matchingRequests.sort((a, b) => (
          Math.abs(new Date(a.created_at).getTime() - eventTime)
          - Math.abs(new Date(b.created_at).getTime() - eventTime)
        ))[0]
      }

      if (!request) throw new Error('Không tìm thấy chi tiết yêu cầu hủy này.')

      setTimelineDetailRequest(request)
    } catch (error) {
      setExpandedTimelineEvent(null)
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setTimelineDetailLoading(null)
    }
  }

  const openDecision = async (request, mode) => {
    setSelectedRequest(request)
    setDecision(mode)
    setDecisionNote('')
    setTargetDepartureId('')
    setTargetDepartures([])

    if (mode !== 'approve' || request.type !== 'transfer') return

    const tourId = request.booking?.tour?.id
    if (!tourId) return

    setLoadingTargets(true)
    try {
      const response = await tourDepartureApi.getByTour(tourId)
      const people = Number(request.booking?.number_of_people || 0)
      const currentId = Number(request.booking?.tour_departure?.id || 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const candidates = unwrapItems(response)
        .filter((departure) => {
          const departureDate = new Date(`${departure.departure_date}T00:00:00`)
          const availableSlots = Number(departure.total_slots || 0) - Number(departure.booked_slots || 0)
          return Number(departure.id) !== currentId
            && departure.status === 'open'
            && departureDate > today
            && availableSlots >= people
        })
        .sort((a, b) => String(a.departure_date).localeCompare(String(b.departure_date)))
      setTargetDepartures(candidates)
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setLoadingTargets(false)
    }
  }

  const closeDecision = (force = false) => {
    if (busy && !force) return
    setDecision(null)
    setSelectedRequest(null)
    setRefundProofFile(null)
  }

  const submitRefund = async () => {
    if (!selectedRequest || selectedRequest.type !== 'refund' || selectedRequest.status !== 'approved') return
    if (!selectedRequest.booking?.payment?.id) {
      setNotice({ type: 'error', text: 'Booking này chưa có bản ghi thanh toán để xác nhận hoàn tiền.' })
      return
    }
    if (!refundProofFile) {
      setNotice({ type: 'error', text: 'Vui lòng chọn ảnh chứng minh đã hoàn tiền.' })
      return
    }

    setBusy(true)
    try {
      const response = await adminBookingDisruptionApi.refund(selectedRequest.id, refundProofFile)
      const detailResponse = await adminBookingDisruptionApi.show(selectedRequest.id)
      setSelectedRequest(detailResponse?.data || selectedRequest)
      setRefundProofFile(null)
      setNotice({ type: 'success', text: response?.message || 'Đã xác nhận hoàn tiền cho khách.' })
      window.dispatchEvent(new CustomEvent('admin-booking-disruption:changed'))
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const submitDecision = async () => {
    if (!selectedRequest || !decision) return
    if (decision === 'reject' && decisionNote.trim().length < 3) {
      setNotice({ type: 'error', text: 'Vui lòng nhập lý do từ chối.' })
      return
    }

    setBusy(true)
    try {
      const payload = {
        admin_note: decisionNote.trim() || undefined,
        ...(decision === 'approve' && selectedRequest.type === 'transfer'
          ? { target_tour_departure_id: Number(targetDepartureId) }
          : {}),
      }
      const response = decision === 'approve'
        ? await adminBookingDisruptionApi.approve(selectedRequest.id, payload)
        : await adminBookingDisruptionApi.reject(selectedRequest.id, payload)

      setNotice({ type: 'success', text: response?.message || 'Đã cập nhật yêu cầu booking.' })
      closeDecision(true)
      window.dispatchEvent(new CustomEvent('admin-booking-disruption:changed'))
      await load()
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`booking-cancellation-page${embedded ? ' booking-cancellation-page--embedded' : ''}`}>
      {!embedded ? <AdminPageHeader
        breadcrumb={['ViVuGo', 'Booking', 'Yêu cầu hủy booking']}
        title="Quản lý yêu cầu hủy booking"
        description="Tiếp nhận, kiểm tra và xử lý các yêu cầu hoàn tiền, bảo lưu hoặc đổi lịch khởi hành của khách."
        showNotificationBell
      /> : null}

      {notice ? (
        <div className={`booking-request-notice booking-request-notice--${notice.type}`} role="status">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={notice.type === 'success' ? "M5 13l4 4L19 7" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
          </svg>
          {notice.text}
        </div>
      ) : null}

      <section className="booking-request-stats" aria-label="Thống kê yêu cầu booking">
        <StatCard
          label="Tổng yêu cầu"
          value={summary.total_count}
          tone="total"
          active={filters.status === ''}
          onClick={() => updateFilter('status', '')}
        />
        <StatCard
          label="Chờ xử lý"
          value={summary.pending_count}
          tone="pending"
          active={filters.status === 'pending'}
          onClick={() => updateFilter('status', 'pending')}
        />
        <StatCard
          label="Đã duyệt"
          value={summary.approved_count}
          tone="approved"
          active={filters.status === 'approved'}
          onClick={() => updateFilter('status', 'approved')}
        />
        <StatCard
          label="Đã từ chối"
          value={summary.rejected_count}
          tone="rejected"
          active={filters.status === 'rejected'}
          onClick={() => updateFilter('status', 'rejected')}
        />
      </section>

      <section className="booking-request-panel">
        <div className="booking-request-filters">
          <label>
            <span>Tìm kiếm</span>
            <div className="booking-request-input-wrap">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Mã booking, tên khách, tour…" />
            </div>
          </label>
          <label>
            <span>Trạng thái</span>
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Loại yêu cầu</span>
            <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
              <option value="">Tất cả loại</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <button type="button" className="booking-request-button booking-request-button--secondary booking-request-filter-clear" onClick={() => {
            setFilters({ search: '', status: 'pending', type: '' })
            setPage(1)
          }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Đặt lại
          </button>
          <button type="button" className="booking-request-button booking-request-button--timeline" onClick={() => setTimelineOpen(true)}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Timeline
            <span>{timeline.length}</span>
          </button>
        </div>

        <div className="booking-request-table-wrap">
          <table className="booking-request-table">
            <thead>
              <tr>
                <th>Booking / khách hàng</th>
                <th>Loại yêu cầu</th>
                <th>Lịch khởi hành</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th className="booking-request-table__actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="booking-request-empty">Đang tải danh sách yêu cầu…</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan="6" className="booking-request-empty">Không tìm thấy yêu cầu phù hợp.</td></tr>
              ) : requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <button type="button" className="booking-request-code-chip" onClick={() => setSelectedRequest(request)}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {request.booking?.booking_code || '—'}
                    </button>
                    <span className="booking-request-customer-name">
                      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {request.booking?.user?.full_name || 'Khách hàng'}
                    </span>
                    <span className="booking-request-tour-title" title={request.booking?.tour?.title || ''}>
                      {request.booking?.tour?.title || 'Không rõ tour'}
                    </span>
                  </td>
                  <td>
                    <TypeBadge type={request.type} />
                  </td>
                  <td>
                    <div className="booking-request-departure-info">
                      <span className="booking-request-departure-date">
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDeparture(request.booking?.tour_departure)}
                      </span>
                      {request.requested_departure ? (
                        <span className="booking-request-requested-dep">
                          → Đề xuất: {formatDeparture(request.requested_departure)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{formatDate(request.created_at, true)}</td>
                  <td>
                    <StatusBadge status={getDisplayStatus(request)} />
                  </td>
                  <td className="booking-request-table__actions">
                    <button type="button" className="booking-request-action booking-request-action--view" onClick={() => setSelectedRequest(request)}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Xem
                    </button>
                    {request.status === 'pending' ? (
                      <>
                        <button type="button" className="booking-request-action booking-request-action--approve" onClick={() => void openDecision(request, 'approve')}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Duyệt
                        </button>
                        <button type="button" className="booking-request-action booking-request-action--reject" onClick={() => void openDecision(request, 'reject')}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Từ chối
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="booking-request-pagination">
          <span>Hiển thị <strong>{requests.length}</strong> / <strong>{Number(meta.total || 0)}</strong> yêu cầu</span>
          <div>
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              ← Trước
            </button>
            <strong>{page} / {Number(meta.last_page || 1)}</strong>
            <button type="button" disabled={page >= Number(meta.last_page || 1) || loading} onClick={() => setPage((current) => current + 1)}>
              Sau →
            </button>
          </div>
        </div>
      </section>

      {timelineOpen ? (
        <div className="booking-request-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setTimelineOpen(false)
        }}>
          <section className="booking-request-timeline-card" role="dialog" aria-modal="true" aria-labelledby="booking-request-timeline-title">
            <div className="booking-request-timeline-header">
              <div>
                <span>Lịch sử thao tác</span>
                <h3 id="booking-request-timeline-title">Timeline yêu cầu hủy tour</h3>
              </div>
              <div className="booking-request-timeline-header-actions">
                <strong>{timeline.length} hoạt động gần nhất</strong>
                <button type="button" className="booking-request-icon-button" onClick={() => setTimelineOpen(false)} aria-label="Đóng">✕</button>
              </div>
            </div>

            {timeline.length ? (
              <div className="booking-request-timeline">
                {timeline.map((event, index) => (
                  <article className={`booking-request-timeline-item is-${event.action}`} key={event.id}>
                    {index < timeline.length - 1 ? <i aria-hidden="true" /> : null}
                    <span className="booking-request-timeline-dot" aria-hidden="true" />
                    <div className="booking-request-timeline-entry">
                      <button
                        type="button"
                        className="booking-request-timeline-content"
                        onClick={() => void openTimelineDetail(event)}
                        disabled={timelineDetailLoading === event.id}
                        aria-expanded={expandedTimelineEvent === event.id}
                        aria-label={`Xem chi tiết ${event.title} của booking ${event.booking_code}`}
                      >
                        <time>{formatDate(event.created_at, true)}</time>
                        <div className="booking-request-timeline-title">
                          <strong>{event.title}</strong>
                          <em>{event.booking_code}</em>
                        </div>
                        <p>{event.detail}</p>
                        <small>{event.actor}</small>
                        <span className="booking-request-timeline-view">
                          {timelineDetailLoading === event.id
                            ? 'Đang tải…'
                            : expandedTimelineEvent === event.id ? 'Thu gọn ↑' : 'Xem chi tiết ↓'}
                        </span>
                      </button>

                      {expandedTimelineEvent === event.id && timelineDetailRequest ? (
                        <div className="booking-request-timeline-detail">
                          <RequestDetail request={timelineDetailRequest} />
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="booking-request-timeline-empty">Chưa có thao tác hủy tour nào được ghi nhận.</p>
            )}
            <div className="booking-request-modal__actions">
              <button type="button" className="booking-request-button booking-request-button--primary" onClick={() => setTimelineOpen(false)}>Đóng</button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedRequest && !decision ? (
        <div className="booking-request-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedRequest(null)
            setRefundProofFile(null)
          }
        }}>
          <div className="booking-request-modal" role="dialog" aria-modal="true" aria-labelledby="booking-request-detail-title">
            <div className="booking-request-modal__header">
              <div>
                <span className="booking-request-eyebrow">Chi tiết yêu cầu</span>
                <h2 id="booking-request-detail-title">{TYPE_LABELS[selectedRequest.type] || 'Yêu cầu booking'}</h2>
              </div>
              <button type="button" className="booking-request-icon-button" onClick={() => { setSelectedRequest(null); setRefundProofFile(null) }} aria-label="Đóng">
                ✕
              </button>
            </div>
            <RequestDetail
              request={selectedRequest}
              refundProofFile={refundProofFile}
              refundProofPreviewUrl={refundProofPreviewUrl}
              onRefundProofChange={setRefundProofFile}
              refundBusy={busy}
            />
            <div className="booking-request-modal__actions">
              <button type="button" className="booking-request-button booking-request-button--secondary" onClick={() => { setSelectedRequest(null); setRefundProofFile(null) }}>
                Đóng
              </button>
              {selectedRequest.type === 'refund'
                && selectedRequest.status === 'approved'
                && getDisplayStatus(selectedRequest) === 'refund_pending' ? (
                  <button
                    type="button"
                    className="booking-request-button booking-request-button--primary"
                    onClick={() => void submitRefund()}
                    disabled={busy || !refundProofFile}
                  >
                    {busy ? 'Đang lưu…' : 'Đã hoàn tiền'}
                  </button>
                ) : null}
              {selectedRequest.status === 'pending' ? (
                <>
                  <button type="button" className="booking-request-button booking-request-button--danger" onClick={() => void openDecision(selectedRequest, 'reject')}>
                    Từ chối
                  </button>
                  <button type="button" className="booking-request-button booking-request-button--primary" onClick={() => void openDecision(selectedRequest, 'approve')}>
                    Duyệt yêu cầu
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <DecisionModal
        request={selectedRequest}
        mode={decision}
        note={decisionNote}
        targetDepartureId={targetDepartureId}
        targetDepartures={targetDepartures}
        loadingTargets={loadingTargets}
        busy={busy}
        onNoteChange={setDecisionNote}
        onTargetChange={setTargetDepartureId}
        onClose={closeDecision}
        onSubmit={() => void submitDecision()}
      />
    </div>
  )
}

export default BookingCancellationRequestsPage
