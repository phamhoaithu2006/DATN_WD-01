import { useEffect, useMemo, useRef, useState } from 'react'
import { readSession } from '../../services/authStorage'
import { mediaUrl } from '../../utils/mediaUrl'
import { formatDateDdMmYyyy } from '../../utils/dateFormat'
import {
  getGuideTourCompleted,
  getGuideTourDetail,
  getGuideTourOngoing,
  getGuideTourUpcoming,
  getGuideTours,
  requestGuideReplacement,
} from '../../services/guideTourApi'

const TAB_CONFIG = {
  all: { label: 'Tất cả', tone: 'blue' },
  upcoming: { label: 'Sắp diễn ra', tone: 'green' },
  ongoing: { label: 'Đang dẫn tour', tone: 'amber' },
  completed: { label: 'Hoàn thành', tone: 'red' },
}

const RESPONSE_FETCHERS = {
  all: getGuideTours,
  upcoming: getGuideTourUpcoming,
  ongoing: getGuideTourOngoing,
  completed: getGuideTourCompleted,
}

const HERO_IMAGE_POOL = [
  'https://picsum.photos/seed/guide-tour-1/1600/480',
  'https://picsum.photos/seed/guide-tour-2/1600/480',
  'https://picsum.photos/seed/guide-tour-3/1600/480',
  'https://picsum.photos/seed/guide-tour-4/1600/480',
  'https://picsum.photos/seed/guide-tour-5/1600/480',
  'https://picsum.photos/seed/guide-tour-6/1600/480',
]

function formatDate(value) {
  return formatDateDdMmYyyy(value, 'Ch?a x?c ??nh')
}

function formatMoney(value) {
  const number = Number(value || 0)

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0)
}

function formatNumber(value) {
  const number = Number(value || 0)

  return new Intl.NumberFormat('vi-VN').format(Number.isFinite(number) ? number : 0)
}

function initials(name) {
  return String(name || 'HDV')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function normalizePaginator(payload) {
  const paginator = payload?.data || {}
  const items = Array.isArray(paginator.data) ? paginator.data : []

  return {
    items,
    meta: {
      current_page: paginator.current_page ?? 1,
      last_page: paginator.last_page ?? 1,
      per_page: paginator.per_page ?? items.length,
      total: paginator.total ?? items.length,
    },
  }
}

function getDestination(item) {
  return item?.tour?.destination?.name || item?.tour?.destination?.province_city || 'Chưa có điểm đến'
}

function toDateOnly(value) {
  if (!value) return null

  const raw = String(value).slice(0, 10)
  const [year, month, day] = raw.split('-').map(Number)

  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)

  return date
}

function getToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return today
}

function getTourState(item) {
  const apiStatus = String(item?.guide_status || '').toLowerCase()

  if (['ongoing', 'upcoming', 'completed', 'cancelled'].includes(apiStatus)) {
    return apiStatus
  }

  const today = getToday()
  const departureDate = toDateOnly(item?.departure_date)
  const returnDate = toDateOnly(item?.return_date) || departureDate
  const status = String(item?.status || '').toLowerCase()

  if (status === 'cancelled' || status === 'canceled') return 'cancelled'
  if (status === 'completed') return 'completed'
  if (departureDate && departureDate > today) return 'upcoming'
  if (departureDate && returnDate && departureDate <= today && returnDate >= today) {
    return 'ongoing'
  }

  return 'completed'
}

function getTourStateLabel(item) {
  const state = getTourState(item)
  if (state === 'upcoming') return 'Sắp diễn ra'
  if (state === 'ongoing') return 'Đang dẫn tour'
  if (state === 'completed') return 'Hoàn thành'
  if (state === 'cancelled') return 'Đã hủy'

  return 'Đã phân công'
}

function getTourStateTone(item) {
  const state = getTourState(item)
  if (state === 'upcoming') return 'green'
  if (state === 'ongoing') return 'amber'
  if (state === 'completed') return 'blue'
  if (state === 'cancelled') return 'red'

  return 'blue'
}

function getTourSortRank(item) {
  const state = getTourState(item)

  if (state === 'ongoing') return 1
  if (state === 'upcoming') return 2
  if (state === 'completed') return 3
  if (state === 'cancelled') return 4

  return 5
}

function getTourImage(item) {
  return mediaUrl(
    item?.tour?.thumbnail?.image_url ||
      item?.tour?.thumbnail_url ||
      item?.tour?.image_url ||
      item?.tour?.image ||
      '',
  )
}

function cleanFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => {
      const normalized = String(value || '').trim()
      return normalized !== '' && normalized !== 'sort'
    }),
  )
}

function compareDepartureDate(a, b) {
  const aTime = toDateOnly(a?.departure_date)?.getTime() || 0
  const bTime = toDateOnly(b?.departure_date)?.getTime() || 0
  return aTime - bTime
}

function getAssignmentKey(item) {
  return String(
    item?.assignment_id ||
      item?.assignment?.id ||
      item?.tour_guide_assignment_id ||
      item?.id ||
      '',
  )
}

function hasPendingReplacement(item) {
  return Boolean(
    item?.replacement_request_pending ||
      item?.pending_replacement_request ||
      item?.guide_replacement_request?.status === 'pending',
  )
}

function canRequestReplacement(item) {
  const state = getTourState(item)

  if (!['upcoming', 'ongoing'].includes(state)) {
    return {
      ok: false,
      reason: 'Tour đã qua hoặc đã hủy nên không thể yêu cầu đổi HDV.',
    }
  }

  if (hasPendingReplacement(item)) {
    return {
      ok: false,
      reason: 'Tour này đã có yêu cầu đổi HDV đang chờ duyệt.',
    }
  }

  const departureDate = toDateOnly(item?.departure_date)
  const minDate = getToday()
  minDate.setDate(minDate.getDate() + 5)

  if (departureDate && departureDate < minDate) {
    return {
      ok: false,
      reason: 'Yêu cầu đổi HDV cần gửi trước ngày khởi hành ít nhất 5 ngày.',
    }
  }

  return {
    ok: true,
    reason: '',
  }
}

function getRandomHeroImage() {
  const index = Math.floor(Math.random() * HERO_IMAGE_POOL.length)
  return HERO_IMAGE_POOL[index]
}

function TourStatCard({ label, value, icon, tone, hint, active, onClick }) {
  return (
    <button
      type="button"
      className={`guide-tour-stat-card tone-${tone} ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <span className="guide-tour-stat-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <div className="guide-tour-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </button>
  )
}

function TourRow({
  item,
  active,
  isNew,
  onDetail,
  onRequestChange,
}) {
  const image = getTourImage(item)
  const title = item?.tour?.title || 'Tour được phân công'
  const statusLabel = getTourStateLabel(item)
  const statusTone = getTourStateTone(item)
  const state = getTourState(item)
  const requestState = canRequestReplacement(item)

  return (
    <article
      className={[
        'guide-tour-row-card',
        `state-${state}`,
        active ? 'is-active' : '',
        isNew ? 'is-new' : '',
        hasPendingReplacement(item) ? 'has-replacement-request' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isNew ? <span className="guide-tour-new-badge">NEW</span> : null}
      {hasPendingReplacement(item) ? (
        <span className="guide-tour-request-badge">Đang chờ đổi HDV</span>
      ) : null}

      <button type="button" className="guide-tour-row-main" onClick={onDetail}>
        <div className="guide-tour-row-image-wrap">
          {image ? (
            <img src={image} alt={title} className="guide-tour-row-image" />
          ) : (
            <div className="guide-tour-row-fallback">{initials(title)}</div>
          )}
        </div>

        <div className="guide-tour-row-content">
          <div className="guide-tour-row-head">
            <div className="guide-tour-row-title-block">
              <h3>{title}</h3>
              <p>
                {formatDate(item?.departure_date)} · {formatDate(item?.return_date || item?.departure_date)}
              </p>
            </div>
            <span className={`guide-tour-pill tone-${statusTone}`}>{statusLabel}</span>
          </div>

          <div className="guide-tour-row-meta">
            <span>
              <strong>{getDestination(item)}</strong>
              <small>{item?.tour?.category?.name || 'Tour du lịch'}</small>
            </span>
            <span>
              <strong>{formatNumber(item?.booked_slots || 0)} khách</strong>
              <small>Số khách</small>
            </span>
            <span>
              <strong>{formatMoney(item?.price)}</strong>
              <small>Giá tour</small>
            </span>
          </div>
        </div>
      </button>

      <div className="guide-tour-row-actions">
        <button type="button" className="guide-tour-detail-btn" onClick={onDetail}>
          Chi tiết
        </button>


        <button
          type="button"
          className="guide-tour-change-btn"
          disabled={!requestState.ok}
          onClick={() => onRequestChange(item)}
          title={requestState.reason || 'Yêu cầu đổi HDV'}
        >
          Yêu cầu đổi HDV
        </button>

        {!requestState.ok ? (
          <small className="guide-tour-change-hint">{requestState.reason}</small>
        ) : null}
      </div>
    </article>
  )
}

function TourDetailModal({
  open,
  item,
  loading,
  isNew,
  onClose,
  onRequestChange,
}) {
  const image = getTourImage(item)
  const requestState = item ? canRequestReplacement(item) : { ok: false, reason: '' }

  if (!open) return null

  return (
    <div className="guide-tour-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="guide-tour-modal" role="dialog" aria-modal="true" aria-label="Chi tiết tour" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="guide-tour-modal-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>

        {isNew ? <span className="guide-tour-modal-new">NEW</span> : null}

        <div className="guide-tour-modal-request-inline">
          <button
            type="button"
            className="guide-tour-modal-request-float"
            disabled={!requestState.ok}
            onClick={() => onRequestChange(item)}
            title={requestState.reason || 'Yêu cầu đổi HDV'}
          >
            Yêu cầu đổi HDV
          </button>
          {!requestState.ok ? (
            <small className="guide-tour-modal-request-hint guide-tour-modal-request-hint-inline">
              {requestState.reason}
            </small>
          ) : null}
        </div>

        <div className="guide-tour-modal-hero">
          <div className="guide-tour-modal-image-wrap">
            {image ? (
              <img src={image} alt={item?.tour?.title || 'Ảnh tour'} />
            ) : (
              <div className="guide-tour-modal-fallback">{initials(item?.tour?.title)}</div>
            )}
          </div>

          <div className="guide-tour-modal-copy">
            <span className={`guide-tour-pill tone-${getTourStateTone(item)}`}>{getTourStateLabel(item)}</span>
            <h3>Tour: {item?.tour?.title || 'Chi tiết tour'}</h3>
            <p>Địa điểm: {getDestination(item)}</p>
          </div>
        </div>

        <div className="guide-tour-modal-grid">
          <div className="guide-tour-modal-card">
            <span>Khởi hành</span>
            <strong>{formatDate(item?.departure_date)}</strong>
          </div>
          <div className="guide-tour-modal-card">
            <span>Ngày về</span>
            <strong>{formatDate(item?.return_date || item?.departure_date)}</strong>
          </div>
          <div className="guide-tour-modal-card">
            <span>Số chỗ</span>
            <strong>
              {formatNumber(item?.booked_slots || 0)}/{formatNumber(item?.total_slots || 0)}
            </strong>
          </div>
          <div className="guide-tour-modal-card">
            <span>Giá tour</span>
            <strong>{formatMoney(item?.price)}</strong>
          </div>
        </div>

        <div className="guide-tour-modal-section">
          <h4>Mô tả</h4>
          <div className="guide-tour-modal-content-box">
            <p>{item?.tour?.summary || 'Chưa có mô tả chi tiết.'}</p>
          </div>
        </div>

        <div className="guide-tour-modal-section">
          <h4>Ghi chú</h4>
          <div className="guide-tour-modal-content-box">
            <p className="guide-tour-modal-note">
              {item?.assignment_note || item?.assignment?.note || item?.notes || 'Không có ghi chú đặc biệt.'}
            </p>
          </div>
        </div>

        <div className="guide-tour-modal-section">
          <h4>Lịch trình</h4>
          {loading ? (
            <div className="guide-tour-modal-content-box guide-tour-modal-empty">Đang tải chi tiết...</div>
          ) : Array.isArray(item?.tour?.itineraries) && item.tour.itineraries.length > 0 ? (
            <div className="guide-tour-modal-itineraries">
              {item.tour.itineraries.map((step) => (
                <article key={step.id} className="guide-tour-modal-step">
                  <span>Ngày {step.day_number}</span>
                  <strong>{step.title || 'Hành trình'}</strong>
                  <p>{step.description || 'Chưa có mô tả chi tiết.'}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="guide-tour-modal-content-box guide-tour-modal-empty">Tour này chưa có lịch trình chi tiết.</div>
          )}
        </div>

        <div className="guide-tour-modal-section">
          <button type="button" className="guide-tour-detail-btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

function ReplacementRequestModal({
  open,
  item,
  reason,
  evidence,
  errors,
  submitting,
  onReasonChange,
  onEvidenceChange,
  onClose,
  onSubmit,
}) {
  const fileInputRef = useRef(null)
  const previewUrl = useMemo(() => {
    if (!evidence || !evidence.type?.startsWith('image/')) return ''

    return URL.createObjectURL(evidence)
  }, [evidence])

  useEffect(() => {
    if (!previewUrl) return undefined

    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function handlePickFile() {
    fileInputRef.current?.click()
  }

  function handleClearFile() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    onEvidenceChange(null)
  }

  if (!open || !item) return null

  return (
    <div className="guide-tour-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="guide-replace-modal" role="dialog" aria-modal="true" aria-label="Yêu cầu đổi HDV" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="guide-tour-modal-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>

        <div className="guide-replace-modal-head">
          <span>Yêu cầu đổi HDV</span>
          <h3>{item?.tour?.title || 'Tour được phân công'}</h3>
          <p>
            Vui lòng gửi yêu cầu trước ngày khởi hành ít nhất 5 ngày. Admin sẽ duyệt và tự động phân công HDV khác nếu yêu cầu được chấp nhận.
          </p>
        </div>

        <form className="guide-replace-form" onSubmit={onSubmit} noValidate>
          <label>
            <span>
              Lý do xin đổi HDV <b>*</b>
            </span>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={5}
              disabled={submitting}
              placeholder="Nêu lý do cần xin đổi HDV phụ trách tour này..."
              className={errors.reason ? 'is-invalid' : ''}
            />
            {errors.reason ? <small>{errors.reason}</small> : null}
          </label>

          <label>
            <span>Ảnh hoặc file bằng chứng nếu có</span>
            <div className="guide-replace-evidence-row">
              <div className={`guide-replace-file-preview ${errors.evidence ? 'is-invalid' : ''}`}>
                {evidence ? (
                  previewUrl ? (
                    <img src={previewUrl} alt={evidence.name} className="guide-replace-file-preview-image" />
                  ) : (
                    <div className="guide-replace-file-preview-fallback">
                      <span>{evidence.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                      <small>{evidence.name}</small>
                    </div>
                  )
                ) : (
                  <div className="guide-replace-file-preview-empty">Chưa có ảnh</div>
                )}
              </div>

              <div className="guide-replace-file-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={submitting}
                  onChange={(event) => onEvidenceChange(event.target.files?.[0] || null)}
                  className="guide-replace-file-input"
                />
                <button
                  type="button"
                  className={`guide-replace-file-trigger ${errors.evidence ? 'is-invalid' : ''}`}
                  onClick={handlePickFile}
                  disabled={submitting}
                >
                  Chọn file/ảnh
                </button>

                {evidence ? (
                  <button
                    type="button"
                    className="guide-replace-file-remove"
                    onClick={handleClearFile}
                    disabled={submitting}
                  >
                    Xóa file
                  </button>
                ) : null}
              </div>
            </div>
            {errors.evidence ? <small>{errors.evidence}</small> : null}
          </label>

          <div className="guide-replace-form-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GuideToursPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState({
    keyword: '',
    from_date: '',
    sort_by: 'sort',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tabTotals, setTabTotals] = useState({ all: 0, upcoming: 0, ongoing: 0, completed: 0 })
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 5, total: 0 })
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedTourDetail, setSelectedTourDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [heroImage, setHeroImage] = useState(getRandomHeroImage())
  const [newTourIds, setNewTourIds] = useState(() => new Set())
  const [replaceModalOpen, setReplaceModalOpen] = useState(false)
  const [replaceTarget, setReplaceTarget] = useState(null)
  const [replaceReason, setReplaceReason] = useState('')
  const [replaceEvidence, setReplaceEvidence] = useState(null)
  const [replaceErrors, setReplaceErrors] = useState({})
  const [replaceSubmitting, setReplaceSubmitting] = useState(false)

  const selectedTourIdRef = useRef(selectedTourId)
  const knownAssignmentIdsRef = useRef(new Set())
  const initializedAssignmentsRef = useRef(false)

  useEffect(() => {
    selectedTourIdRef.current = selectedTourId
  }, [selectedTourId])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroImage(getRandomHeroImage())
    }, 45000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleNewAssignment(event) {
      const ids = Array.isArray(event.detail?.ids) ? event.detail.ids : []

      if (ids.length === 0) return

      setNewTourIds((current) => {
        const next = new Set(current)

        ids.forEach((id) => {
          if (id) next.add(String(id))
        })

        return next
      })
    }

    window.addEventListener('guide-tour:new-assignment-detected', handleNewAssignment)

    return () => {
      window.removeEventListener('guide-tour:new-assignment-detected', handleNewAssignment)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadTours() {
      setLoading(true)
      setError('')
      setMessage('')

      try {
        const params = { page, per_page: 5, ...cleanFilters(appliedFilters) }
        const [all, upcoming, ongoing, completed, activePayload] = await Promise.all([
          getGuideTours({ per_page: 1 }),
          getGuideTourUpcoming({ per_page: 1 }),
          getGuideTourOngoing({ per_page: 1 }),
          getGuideTourCompleted({ per_page: 1 }),
          RESPONSE_FETCHERS[activeTab](params),
        ])

        if (!mounted) return

        const active = normalizePaginator(activePayload)
        const nextItems = active.items
        const currentAssignmentIds = new Set(nextItems.map(getAssignmentKey).filter(Boolean))

        if (!initializedAssignmentsRef.current) {
          knownAssignmentIdsRef.current = currentAssignmentIds
          initializedAssignmentsRef.current = true
        } else {
          const detectedNewIds = [...currentAssignmentIds].filter(
            (id) => !knownAssignmentIdsRef.current.has(id),
          )

          if (detectedNewIds.length > 0) {
            setNewTourIds((current) => {
              const next = new Set(current)
              detectedNewIds.forEach((id) => next.add(String(id)))
              return next
            })
          }

          knownAssignmentIdsRef.current = new Set([
            ...knownAssignmentIdsRef.current,
            ...currentAssignmentIds,
          ])
        }

        setItems(nextItems)
        setMeta(active.meta)
        setTabTotals({
          all: normalizePaginator(all).meta.total,
          upcoming: normalizePaginator(upcoming).meta.total,
          ongoing: normalizePaginator(ongoing).meta.total,
          completed: normalizePaginator(completed).meta.total,
        })

        const currentSelectedId = selectedTourIdRef.current
        const stillExists = nextItems.some((item) => item.id === currentSelectedId)

        if (!stillExists && currentSelectedId !== null) {
          setSelectedTourId(null)
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError?.response?.data?.message || 'Không tải được danh sách tour được phân công.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadTours()

    return () => {
      mounted = false
    }
  }, [activeTab, appliedFilters, page])

  useEffect(() => {
    if (!detailOpen || !selectedTourId) return undefined

    let mounted = true

    async function loadDetail() {
      setDetailLoading(true)
      setError('')
      try {
        const detail = await getGuideTourDetail(selectedTourId)
        if (mounted) setSelectedTourDetail(detail)
      } catch (detailError) {
        if (mounted) {
          setSelectedTourDetail(null)
          setError(detailError?.response?.data?.message || 'Không tải được chi tiết tour.')
        }
      } finally {
        if (mounted) setDetailLoading(false)
      }
    }

    void loadDetail()

    return () => {
      mounted = false
    }
  }, [detailOpen, selectedTourId])

  const currentItem = useMemo(
    () => items.find((item) => item.id === selectedTourId) || null,
    [items, selectedTourId],
  )

  const modalItem = selectedTourDetail || currentItem
  const heroItem = currentItem || items[0] || null
  const guide = readSession()

  const visibleItems = useMemo(() => {
    const sorted = [...items]

    sorted.sort((a, b) => {
      if (filters.sort_by === 'sort') {
        const rankDiff = getTourSortRank(a) - getTourSortRank(b)

        if (rankDiff !== 0) return rankDiff
      }

      if (filters.sort_by === 'oldest') {
        return compareDepartureDate(a, b)
      }

      if (filters.sort_by === 'newest') {
        return compareDepartureDate(b, a)
      }

      const rankDiff = getTourSortRank(a) - getTourSortRank(b)

      if (rankDiff !== 0) return rankDiff

      return compareDepartureDate(a, b)
    })

    return sorted
  }, [filters.sort_by, items])

  const selectedCount = Number(meta.total || 0)

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function handleSortChange(value) {
    setFilters((current) => {
      const nextFilters = { ...current, sort_by: value }
      setAppliedFilters(nextFilters)
      setPage(1)
      return nextFilters
    })
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    setPage(1)
    setAppliedFilters(filters)
  }

  function handleResetFilters() {
    const reset = { keyword: '', from_date: '', sort_by: 'sort' }
    setFilters(reset)
    setAppliedFilters(reset)
    setPage(1)
  }

  function handleTabChange(tab) {
    setActiveTab(tab)
    setPage(1)
  }

  function clearNewFlag(item) {
    const key = getAssignmentKey(item)

    if (!key) return

    setNewTourIds((current) => {
      if (!current.has(key)) return current

      const next = new Set(current)
      next.delete(key)

      if (next.size === 0) {
        window.dispatchEvent(new Event('guide-tour:new-assignment-cleared'))
      }

      return next
    })
  }

  function openDetail(item) {
    clearNewFlag(item)
    setSelectedTourId(item.id)
    setDetailOpen(true)
    setSelectedTourDetail(null)
  }

  function openReplacementRequest(item) {
    const requestState = canRequestReplacement(item)

    if (!requestState.ok) {
      setError(requestState.reason)
      return
    }

    clearNewFlag(item)
    setReplaceTarget(item)
    setReplaceReason('')
    setReplaceEvidence(null)
    setReplaceErrors({})
    setReplaceModalOpen(true)
  }


  function validateReplacementForm() {
    const errors = {}

    if (!replaceReason.trim()) {
      errors.reason = 'Vui lòng nhập lý do xin đổi HDV.'
    } else if (replaceReason.trim().length < 10) {
      errors.reason = 'Lý do cần ít nhất 10 ký tự.'
    }

    if (replaceEvidence && replaceEvidence.size > 5 * 1024 * 1024) {
      errors.evidence = 'File bằng chứng không được vượt quá 5MB.'
    }

    return errors
  }

  async function submitReplacementRequest(event) {
    event.preventDefault()

    const errors = validateReplacementForm()

    if (Object.keys(errors).length > 0) {
      setReplaceErrors(errors)
      return
    }

    try {
      setReplaceSubmitting(true)
      setReplaceErrors({})
      setError('')
      setMessage('')

      await requestGuideReplacement(replaceTarget.id, {
        reason: replaceReason.trim(),
        evidence: replaceEvidence,
      })

      setMessage('Đã gửi yêu cầu đổi HDV. Admin sẽ xem xét và phản hồi.')
      setReplaceModalOpen(false)
      setReplaceTarget(null)
      setItems((current) =>
        current.map((item) =>
          item.id === replaceTarget.id
            ? {
                ...item,
                replacement_request_pending: true,
              }
            : item,
        ),
      )
      window.dispatchEvent(new Event('guide-notification:changed'))
    } catch (submitError) {
      const payloadErrors = submitError?.response?.data?.errors

      if (payloadErrors) {
        setReplaceErrors({
          reason: payloadErrors.reason?.[0],
          evidence: payloadErrors.evidence?.[0],
        })
      }

      setError(submitError?.response?.data?.message || 'Không gửi được yêu cầu đổi HDV.')
    } finally {
      setReplaceSubmitting(false)
    }
  }

  return (
    <div className="guide-tours-page">
      <section
        className="guide-tours-hero guide-tours-hero-legacy"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="guide-tours-hero-overlay" />
        <div className="guide-tours-hero-copy">
          <span className="guide-tours-hero-kicker">Lịch làm việc</span>
          <h1>Xin chào, {guide?.full_name || guide?.name || 'HDV'}</h1>
            <p>
              {heroItem?.tour?.title
              ? `Bạn đang có ${formatNumber(tabTotals.all)} tour được phân công.`
              : 'Bạn đang xem danh sách tour được phân công.'}
            </p>
        </div>
      </section>

      <section className="guide-tour-metrics-grid">
        <TourStatCard
          label="Tổng số lịch"
          value={formatNumber(tabTotals.all)}
          tone="blue"
          hint="Tất cả tour được giao"
          icon={
            <>
              <rect x="5" y="5" width="14" height="14" rx="4" />
              <path d="M8 5V3.5M16 5V3.5M7 9h10M9 13h6" />
            </>
          }
          active={activeTab === 'all'}
          onClick={() => handleTabChange('all')}
        />
        <TourStatCard
          label="Sắp diễn ra"
          value={formatNumber(tabTotals.upcoming)}
          tone="green"
          hint="Tour chưa khởi hành"
          icon={
            <>
              <circle cx="12" cy="12" r="8" />
              <path d="M12 7.25v4.9l3.2 1.9" />
            </>
          }
          active={activeTab === 'upcoming'}
          onClick={() => handleTabChange('upcoming')}
        />
        <TourStatCard
          label="Đang dẫn tour"
          value={formatNumber(tabTotals.ongoing)}
          tone="amber"
          hint="Tour đang chạy"
          icon={
            <>
              <path d="M4 12h4l2.5-4 3 8 2-4H20" />
              <path d="M12 3.5v2.5" />
            </>
          }
          active={activeTab === 'ongoing'}
          onClick={() => handleTabChange('ongoing')}
        />
        <TourStatCard
          label="Hoàn thành"
          value={formatNumber(tabTotals.completed)}
          tone="red"
          hint="Tour đã kết thúc"
          icon={
            <>
              <circle cx="12" cy="12" r="8" />
              <path d="m8.5 12.2 2.4 2.4L15.8 9.7" />
            </>
          }
          active={activeTab === 'completed'}
          onClick={() => handleTabChange('completed')}
        />
      </section>

      <form className="guide-tour-filter-bar" onSubmit={handleSearchSubmit}>
        <label className="guide-tour-filter-field search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={filters.keyword}
            onChange={(event) => updateFilter('keyword', event.target.value)}
            placeholder="Tìm kiếm tour..."
          />
        </label>

        <label className="guide-tour-filter-field">
          <select
            value={filters.sort_by}
            onChange={(event) => handleSortChange(event.target.value)}
            aria-label="Lọc sắp xếp"
          >
            <option value="sort">
              Sắp xếp theo
            </option>
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </label>

        <label className="guide-tour-filter-field">
          <input
            type="date"
            value={filters.from_date}
            onChange={(event) => updateFilter('from_date', event.target.value)}
            aria-label="Ngày"
          />
        </label>

        <div className="guide-tour-filter-actions">
          <button type="submit" className="guide-tour-filter-submit">
            Lọc
          </button>
          <button type="button" className="guide-tour-filter-reset" onClick={handleResetFilters}>
            Đặt lại
          </button>
        </div>
      </form>

      {(error || message) && (
        <div className={error ? 'guide-profile-alert is-error' : 'guide-profile-alert'}>{error || message}</div>
      )}

      <section className="guide-tour-list-shell">
        <div className="guide-tour-list-head">
          <div>
            <span>{TAB_CONFIG[activeTab].label}</span>
            <h2>Danh sách tour được phân công</h2>
          </div>
          <div className="guide-tour-list-count">
            <strong>{formatNumber(selectedCount)}</strong>
            <small>kết quả</small>
          </div>
        </div>

        {loading ? (
          <div className="guide-tour-empty large">Đang tải danh sách tour...</div>
        ) : visibleItems.length > 0 ? (
          <>
            <div className="guide-tour-list">
              {visibleItems.map((item) => (
                <TourRow
                  key={item.id}
                  item={item}
                  active={selectedTourId === item.id}
                  isNew={newTourIds.has(getAssignmentKey(item))}
                  onDetail={() => openDetail(item)}
                  onRequestChange={openReplacementRequest}
                />
              ))}
            </div>

            <div className="guide-tour-pagination">
              <div className="guide-tour-pagination-actions">
                <button
                  type="button"
                  className="guide-tour-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  Trang trước
                </button>
                <div className="guide-tour-page-numbers">
                  <span className="is-active">{formatNumber(meta.current_page)}</span>
                  <small>/ {formatNumber(meta.last_page)}</small>
                </div>
                <button
                  type="button"
                  className="guide-tour-page-btn"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Trang sau
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="guide-tour-empty large">Không có tour phù hợp với bộ lọc hiện tại.</div>
        )}
      </section>

      <TourDetailModal
        open={detailOpen}
        item={modalItem}
        loading={detailLoading}
        isNew={modalItem ? newTourIds.has(getAssignmentKey(modalItem)) : false}
        onRequestChange={openReplacementRequest}
        onClose={() => {
          setDetailOpen(false)
          setSelectedTourDetail(null)
        }}
      />

      <ReplacementRequestModal
        open={replaceModalOpen}
        item={replaceTarget}
        reason={replaceReason}
        evidence={replaceEvidence}
        errors={replaceErrors}
        submitting={replaceSubmitting}
        onReasonChange={(value) => {
          setReplaceReason(value)
          setReplaceErrors((current) => ({ ...current, reason: '' }))
        }}
        onEvidenceChange={(file) => {
          setReplaceEvidence(file)
          setReplaceErrors((current) => ({ ...current, evidence: '' }))
        }}
        onClose={() => {
          if (!replaceSubmitting) {
            setReplaceModalOpen(false)
            setReplaceTarget(null)
          }
        }}
        onSubmit={submitReplacementRequest}
      />
    </div>
  )
}

export default GuideToursPage
