import { useEffect, useMemo, useRef, useState } from 'react'
import { readSession } from '../../services/authStorage'
import { mediaUrl } from '../../utils/mediaUrl'
import {
  getGuideTourCompleted,
  getGuideTourDetail,
  getGuideTourOngoing,
  getGuideTourUpcoming,
  getGuideTours,
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
  if (!value) return 'Chưa xác định'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
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

function getTourState(item) {
  const today = new Date()
  const departureDate = item?.departure_date ? new Date(item.departure_date) : null
  const returnDate = item?.return_date ? new Date(item.return_date) : departureDate
  const status = String(item?.status || '').toLowerCase()

  if (status === 'cancelled') return 'cancelled'
  if (status === 'completed') return 'completed'
  if (departureDate && departureDate > today) return 'upcoming'
  if (returnDate && returnDate >= today) return 'ongoing'
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
      return normalized !== '' && normalized !== 'default'
    }),
  )
}

function compareDepartureDate(a, b) {
  const aTime = new Date(a?.departure_date || 0).getTime()
  const bTime = new Date(b?.departure_date || 0).getTime()
  return aTime - bTime
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

function TourRow({ item, active, onDetail }) {
  const image = getTourImage(item)
  const title = item?.tour?.title || 'Tour được phân công'
  const note = item?.assignment_note || item?.assignment?.note || item?.notes || 'Chưa có ghi chú phân công.'
  const statusLabel = getTourStateLabel(item)
  const statusTone = getTourStateTone(item)

  return (
    <article className={`guide-tour-row-card ${active ? 'is-active' : ''}`}>
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
              <small>{formatNumber(item?.total_slots || 0)} chỗ</small>
            </span>
            <span>
              <strong>{formatMoney(item?.price)}</strong>
              <small>Giá tour</small>
            </span>
          </div>

          <div className="guide-tour-row-note">{note}</div>
        </div>
      </button>

      <div className="guide-tour-row-actions">
        <button type="button" className="guide-tour-detail-btn" onClick={onDetail}>
          Chi tiết
        </button>
      </div>
    </article>
  )
}

function TourDetailModal({ open, item, loading, onClose }) {
  const image = getTourImage(item)

  if (!open) return null

  return (
    <div className="guide-tour-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="guide-tour-modal" role="dialog" aria-modal="true" aria-label="Chi tiết tour" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="guide-tour-modal-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>

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
            <h3>{item?.tour?.title || 'Chi tiết tour'}</h3>
            <p>{getDestination(item)}</p>
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
          <h4>Mô tả tour</h4>
          <p>{item?.tour?.summary || 'Chưa có mô tả chi tiết.'}</p>
        </div>

        <div className="guide-tour-modal-section">
          <h4>Ghi chú phân công</h4>
          <p className="guide-tour-modal-note">
            {item?.assignment_note || item?.assignment?.note || item?.notes || 'Không có ghi chú đặc biệt.'}
          </p>
        </div>

        <div className="guide-tour-modal-section">
          <h4>Lộ trình</h4>
          {loading ? (
            <div className="guide-tour-modal-empty">Đang tải chi tiết...</div>
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
            <div className="guide-tour-modal-empty">Tour này chưa có lịch trình chi tiết.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function GuideToursPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState({
    keyword: '',
    from_date: '',
    sort_by: 'default',
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
  const selectedTourIdRef = useRef(selectedTourId)

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
    let mounted = true

    async function loadTours() {
      setLoading(true)
      setError('')
      setMessage('')

      try {
        const params = { page, per_page: 5, ...cleanFilters(appliedFilters) }
        const [all, upcoming, ongoing, completed] = await Promise.all([
          RESPONSE_FETCHERS.all(params),
          RESPONSE_FETCHERS.upcoming(params),
          RESPONSE_FETCHERS.ongoing(params),
          RESPONSE_FETCHERS.completed(params),
        ])

        if (!mounted) return

        const normalized = {
          all: normalizePaginator(all),
          upcoming: normalizePaginator(upcoming),
          ongoing: normalizePaginator(ongoing),
          completed: normalizePaginator(completed),
        }

        setTabTotals({
          all: normalized.all.meta.total,
          upcoming: normalized.upcoming.meta.total,
          ongoing: normalized.ongoing.meta.total,
          completed: normalized.completed.meta.total,
        })

        const nextItems = normalized[activeTab]?.items || normalized.all.items
        const nextMeta = normalized[activeTab]?.meta || normalized.all.meta

        setItems(nextItems)
        setMeta(nextMeta)

        const currentSelectedId = selectedTourIdRef.current
        const nextSelectedId = nextItems.some((item) => item.id === currentSelectedId)
          ? currentSelectedId
          : nextItems[0]?.id || null

        if (nextSelectedId !== currentSelectedId) {
          setSelectedTourId(nextSelectedId)
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

    if (filters.sort_by === 'soon') {
      sorted.sort(compareDepartureDate)
    } else if (filters.sort_by === 'oldest') {
      sorted.sort((a, b) => compareDepartureDate(b, a))
    } else if (filters.sort_by === 'latest') {
      sorted.sort((a, b) => compareDepartureDate(b, a))
    }

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
    const reset = { keyword: '', from_date: '', sort_by: 'default' }
    setFilters(reset)
    setAppliedFilters(reset)
    setPage(1)
  }

  function handleTabChange(tab) {
    setActiveTab(tab)
    setPage(1)
  }

  function openDetail(item) {
    setSelectedTourId(item.id)
    setDetailOpen(true)
    setSelectedTourDetail(null)
  }

  return (
    <div className="guide-tours-page">
      <section
        className="guide-tours-hero guide-tours-hero-legacy"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="guide-tours-hero-overlay" />
        <div className="guide-tours-hero-copy">
          <span className="guide-tours-hero-kicker">Tour của tôi</span>
          <h1>Xin chào, {guide?.full_name || guide?.name || 'HDV'}</h1>
          <p>
            {heroItem?.tour?.title
              ? `Bạn đang có ${formatNumber(tabTotals.all)} tour được phân công, hãy theo dõi lịch khởi hành và mở chi tiết nhanh chóng.`
              : 'Bạn đang xem danh sách tour được phân công, có thể lọc theo thời gian và điểm đến.'}
          </p>
        </div>
      </section>

      <section className="guide-tour-metrics-grid">
        <TourStatCard
          label="Tổng số lịch"
          value={formatNumber(tabTotals.all)}
          tone="blue"
          hint="Tất cả tour được giao"
          icon={<path d="M4 7h16M4 12h16M4 17h16" />}
          active={activeTab === 'all'}
          onClick={() => handleTabChange('all')}
        />
        <TourStatCard
          label="Sắp diễn ra"
          value={formatNumber(tabTotals.upcoming)}
          tone="green"
          hint="Tour chưa khởi hành"
          icon={<path d="M12 6v6l4 2" />}
          active={activeTab === 'upcoming'}
          onClick={() => handleTabChange('upcoming')}
        />
        <TourStatCard
          label="Đang dẫn tour"
          value={formatNumber(tabTotals.ongoing)}
          tone="amber"
          hint="Tour đang chạy"
          icon={<path d="M4 12h16M12 4v16" />}
          active={activeTab === 'ongoing'}
          onClick={() => handleTabChange('ongoing')}
        />
        <TourStatCard
          label="Hoàn thành"
          value={formatNumber(tabTotals.completed)}
          tone="red"
          hint="Tour đã kết thúc"
          icon={<path d="M5 13l4 4L19 7" />}
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
              <option value="default">Sắp xếp</option>
              <option value="latest">Mới nhất</option>
              <option value="soon">Sớm nhất</option>
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
                  onDetail={() => openDetail(item)}
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
        onClose={() => {
          setDetailOpen(false)
          setSelectedTourDetail(null)
        }}
      />
    </div>
  )
}

export default GuideToursPage
