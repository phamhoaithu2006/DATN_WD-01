import { useEffect, useMemo, useState } from 'react'
import {
  getGuideAttendanceSessions,
  getGuideTourCompleted,
  getGuideTourCustomers,
  getGuideTourDetail,
} from '../../services/guideTourApi'
import { mediaUrl } from '../../utils/mediaUrl'
import { formatDateDdMmYyyy, formatDateTimeDdMmYyyy } from '../../utils/dateFormat'
import { formatDestinationPlace, formatDestinationPlaceAddress } from '../../utils/destinationPlaceFormat'

const INITIAL_META = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="guide-section-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

function formatNumber(value) {
  const number = Number(value || 0)
  return new Intl.NumberFormat('vi-VN').format(Number.isFinite(number) ? number : 0)
}

function formatDate(value) {
  return formatDateDdMmYyyy(value, 'Ch?a x?c ??nh')
}

function formatDateTime(value) {
  return formatDateTimeDdMmYyyy(value, '?')
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim()
}

function getAssignmentNote(item) {
  const note = String(item?.assignment_note || item?.assignment?.note || item?.notes || '').trim()

  if (/databaseseeder/i.test(note)) {
    return 'Tour được hệ thống tự động phân công.'
  }

  return note || 'Không có ghi chú phân công.'
}

function groupItinerariesByDay(itineraries) {
  const grouped = new Map()

  itineraries.forEach((step, index) => {
    const parsedDay = Number(step?.day_number)
    const dayNumber = Number.isInteger(parsedDay) && parsedDay > 0 ? parsedDay : 1
    const activities = grouped.get(dayNumber) || []
    activities.push({ ...step, originalIndex: index })
    grouped.set(dayNumber, activities)
  })

  return [...grouped.entries()]
    .sort(([dayA], [dayB]) => dayA - dayB)
    .map(([dayNumber, activities]) => ({
      dayNumber,
      activities: activities.sort((activityA, activityB) => (
        Number(activityA.sort_order || 0) - Number(activityB.sort_order || 0)
        || activityA.originalIndex - activityB.originalIndex
      )),
    }))
}

function normalizePaginator(response) {
  const payload = response?.data ?? response
  const paginator = payload?.data ?? payload

  if (Array.isArray(paginator?.data)) {
    return {
      items: paginator.data,
      meta: {
        current_page: paginator.current_page ?? 1,
        last_page: paginator.last_page ?? 1,
        per_page: paginator.per_page ?? paginator.data.length ?? 10,
        total: paginator.total ?? paginator.data.length ?? 0,
      },
    }
  }

  if (Array.isArray(paginator)) {
    return {
      items: paginator,
      meta: INITIAL_META,
    }
  }

  return {
    items: [],
    meta: INITIAL_META,
  }
}

function compareDepartureDate(a, b) {
  const aTime = new Date(a?.departure_date || 0).getTime() || 0
  const bTime = new Date(b?.departure_date || 0).getTime() || 0

  return aTime - bTime
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

function getDestination(item) {
  return item?.tour?.destination?.name || item?.tour?.destination?.province_city || 'Chưa có điểm đến'
}

function getCompletedBadge(item) {
  const status = String(item?.status || '').toLowerCase()

  if (status === 'completed') return 'Hoàn thành'
  if (status === 'cancelled' || status === 'canceled') return 'Đã hủy'

  return 'Lịch sử'
}

function getAttendanceLabel(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'checked_out') return 'Đã check-out'
  if (normalized === 'checked_in') return 'Đã check-in'
  if (normalized === 'absent') return 'Vắng mặt'
  return 'Chưa điểm danh'
}

function HistoryRow({ item, onDetail }) {
  const image = getTourImage(item)
  const title = item?.tour?.title || 'Tour đã hoàn thành'

  return (
    <article className="guide-tour-row-card state-completed">
      <button type="button" className="guide-tour-row-main" onClick={onDetail}>
        <div className="guide-tour-row-image-wrap">
          {image ? (
            <img src={image} alt={title} className="guide-tour-row-image" />
          ) : (
            <div className="guide-tour-row-fallback">{title.slice(0, 2).toUpperCase()}</div>
          )}
        </div>

        <div className="guide-tour-row-content">
          <div className="guide-tour-row-head">
            <div className="guide-tour-row-title-block">
              <h3>{title}</h3>
              <p>
                {getDestination(item)} · {formatDate(item?.departure_date)} - {formatDate(item?.return_date || item?.departure_date)}
              </p>
            </div>
            <span className="guide-tour-pill tone-blue">{getCompletedBadge(item)}</span>
          </div>

          <div className="guide-tour-row-meta compact">
            <span>
              <strong>{getDestination(item)}</strong>
              <small>Điểm đến</small>
            </span>
            <span>
              <strong>{formatNumber(item?.booked_slots || 0)} khách</strong>
              <small>Số khách</small>
            </span>
          </div>
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

function TourHistoryModal({ open, item, detailLoading, extras, onClose }) {
  const [expandedCustomerId, setExpandedCustomerId] = useState(null)
  const customers = Array.isArray(extras?.customers) ? extras.customers : []
  const sessions = Array.isArray(extras?.sessions) ? extras.sessions : []
  const itineraryDays = groupItinerariesByDay(
    Array.isArray(item?.tour?.itineraries) ? item.tour.itineraries : [],
  )

  if (!open || !item) return null

  return (
    <div className="guide-tour-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="guide-tour-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết lịch sử tour"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="guide-tour-modal-top-close" onClick={onClose} aria-label="Đóng">×</button>
        <div className="guide-tour-modal-hero">
          <div className="guide-tour-modal-image-wrap">
            {getTourImage(item) ? (
              <img src={getTourImage(item)} alt={item?.tour?.title || 'Ảnh tour'} />
            ) : (
              <div className="guide-tour-modal-fallback">{(item?.tour?.title || 'TG').slice(0, 2).toUpperCase()}</div>
            )}
          </div>

          <div className="guide-tour-modal-copy">
            <span className="guide-tour-pill tone-blue">{getCompletedBadge(item)}</span>
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
        </div>

        <div className="guide-tour-modal-section">
          <h4>Mô tả</h4>
          <div className="guide-tour-modal-content-box">
            <p>{item?.tour?.summary || 'Chưa có mô tả chi tiết.'}</p>
          </div>
        </div>

        <div className="guide-tour-modal-section">
          <h4>Thông tin phân công</h4>
          <div className="guide-tour-modal-content-box">
            <p className="guide-tour-modal-note">
              {getAssignmentNote(item)}
            </p>
          </div>
        </div>

        <div className="guide-tour-modal-section">
          <div className="guide-tour-modal-section-head">
            <div>
              <h4>Khách hàng và điểm danh</h4>
              <p>Danh sách khách, trạng thái check-in và lưu ý đã đăng ký.</p>
            </div>
            <span className="guide-tour-modal-count">
              {formatNumber(customers.reduce((total, customer) => total + Number(customer?.guest_count || 1), 0))} khách
            </span>
          </div>

          {detailLoading ? (
            <div className="guide-tour-modal-content-box guide-tour-modal-empty">Đang tải khách hàng...</div>
          ) : customers.length ? (
            <div className="guide-tour-history-customers">
              {customers.map((customer) => {
                const note = customer.special_request || customer.customer_note || customer.health_note
                const attendance = customer.attendance || {}
                const isExpanded = expandedCustomerId === customer.id

                return (
                  <article key={customer.id} className="guide-tour-history-customer">
                    <div className="guide-tour-history-customer-main">
                      <strong>
                        {customer.full_name || 'Khách hàng'}
                        {customer.is_booking_contact && customer.guest_count > 1 ? ` · ${customer.guest_count} khách` : ''}
                      </strong>
                      <span>{customer.phone || customer.email || 'Chưa có thông tin liên hệ'}</span>
                    </div>
                    <button
                      type="button"
                      className="guide-tour-history-detail-btn"
                      onClick={() => setExpandedCustomerId(isExpanded ? null : customer.id)}
                    >
                      {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                    </button>
                    {isExpanded ? (
                      <div className="guide-tour-history-customer-detail">
                        <div className="guide-tour-history-attendance">
                          <span className={`guide-tour-history-attendance-status is-${customer.attendance_status || 'not_checked_in'}`}>
                            {getAttendanceLabel(customer.attendance_status)}
                          </span>
                          {attendance.checked_in_at ? <small>Check-in: {formatDateTime(attendance.checked_in_at)}</small> : <small>Chưa có thời gian check-in</small>}
                        </div>
                        {note ? <p className="guide-tour-history-customer-note">Lưu ý: {note}</p> : <p className="guide-tour-history-customer-note is-empty">Không có lưu ý từ khách hàng.</p>}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="guide-tour-modal-content-box guide-tour-modal-empty">Chưa có dữ liệu khách hàng.</div>
          )}

          {!detailLoading && sessions.length ? (
            <div className="guide-tour-history-sessions">
              {sessions.map((session) => {
                const photos = Array.isArray(session.photos) ? session.photos : []

                return (
                  <article key={session.id}>
                    <span>
                      {session.name || 'Điểm danh'} · {formatDate(session.scheduled_date)}: {formatNumber(session.checked_in_count || 0)}/{formatNumber(session.attendance_count || 0)} đã check-in
                    </span>
                    {photos.length ? (
                      <div className="guide-tour-history-photo-gallery">
                        {photos.map((photo) => (
                          <a key={photo.id} href={mediaUrl(photo.url)} target="_blank" rel="noreferrer">
                            <img src={mediaUrl(photo.url)} alt={photo.original_name || `Ảnh ${session.name}`} />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="guide-tour-modal-section">
          <h4>Lịch trình</h4>
          {detailLoading ? (
            <div className="guide-tour-modal-content-box guide-tour-modal-empty">Đang tải chi tiết...</div>
          ) : itineraryDays.length > 0 ? (
            <div className="guide-tour-modal-itineraries">
              {itineraryDays.map((day) => (
                <section className="guide-tour-modal-itinerary-day" key={day.dayNumber}>
                  <header>
                    <span>Ngày {day.dayNumber}</span>
                    <strong>{day.activities.length} hoạt động</strong>
                  </header>
                  <div>
                    {day.activities.map((step, index) => (
                      <article key={step.id || `${day.dayNumber}-${index}`} className="guide-tour-modal-step">
                        <i>{index + 1}</i>
                        <div>
                          <strong>{step.title || 'Hoạt động trong ngày'}</strong>
                          {step.destination_place?.name ? (
                            <p><b>Điểm đến:</b> {formatDestinationPlace(step.destination_place)}</p>
                          ) : null}
                          {formatDestinationPlaceAddress(step.destination_place) ? <p><b>Địa chỉ:</b> {formatDestinationPlaceAddress(step.destination_place)}</p> : null}
                          {stripHtml(step.description) ? <p>{stripHtml(step.description)}</p> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="guide-tour-modal-content-box guide-tour-modal-empty">Tour này chưa có lịch trình chi tiết.</div>
          )}
        </div>

        <div className="guide-tour-modal-section">
          <h4>Cập nhật</h4>
          <div className="guide-tour-modal-content-box">
            <p>Hoàn thành lúc {formatDateTime(item?.updated_at)}.</p>
          </div>
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

function GuideHistoryPage() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(INITIAL_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [sortBy, setSortBy] = useState('sort')
  const [fromDate, setFromDate] = useState('')
  const [appliedFromDate, setAppliedFromDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedTourId, setSelectedTourId] = useState(null)
  const [selectedTourDetail, setSelectedTourDetail] = useState(null)
  const [selectedTourExtras, setSelectedTourExtras] = useState({ customers: [], sessions: [] })
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadCompletedTours() {
      setLoading(true)
      setError('')

      try {
        const response = await getGuideTourCompleted({
          page,
          per_page: 10,
          keyword: appliedKeyword.trim() || undefined,
          from_date: appliedFromDate || undefined,
        })

        if (!mounted) return

        const normalized = normalizePaginator(response)
        setItems(normalized.items)
        setMeta(normalized.meta)
      } catch (loadError) {
        if (mounted) {
          setItems([])
          setMeta(INITIAL_META)
          setError(loadError?.response?.data?.message || 'Không tải được lịch sử tour.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadCompletedTours()

    return () => {
      mounted = false
    }
  }, [page, appliedKeyword, appliedFromDate])

  useEffect(() => {
    if (!detailOpen || !selectedTourId) return undefined

    let mounted = true

    async function loadDetail() {
      setDetailLoading(true)
      setSelectedTourExtras({ customers: [], sessions: [] })

      try {
        const [detailResult, customerResult, sessionResult] = await Promise.allSettled([
          getGuideTourDetail(selectedTourId),
          getGuideTourCustomers(selectedTourId, { per_page: 100 }),
          getGuideAttendanceSessions(selectedTourId),
        ])

        if (detailResult.status !== 'fulfilled') {
          throw detailResult.reason
        }

        if (mounted) {
          setSelectedTourDetail(detailResult.value)
          const apiCustomers = customerResult.status === 'fulfilled' && Array.isArray(customerResult.value?.data)
            ? customerResult.value.data
            : []
          setSelectedTourExtras({
            customers: apiCustomers.length > 0
              ? apiCustomers
              : (Array.isArray(detailResult.value?.history_customers) ? detailResult.value.history_customers : []),
            sessions: sessionResult.status === 'fulfilled' && Array.isArray(sessionResult.value?.data)
              ? sessionResult.value.data
              : [],
          })
        }
      } catch {
        if (mounted) {
          setSelectedTourDetail(items.find((item) => item.id === selectedTourId) || null)
        }
      } finally {
        if (mounted) setDetailLoading(false)
      }
    }

    void loadDetail()

    return () => {
      mounted = false
    }
  }, [detailOpen, selectedTourId, items])

  const currentItem = useMemo(
    () => items.find((item) => item.id === selectedTourId) || null,
    [items, selectedTourId],
  )

  const modalItem = selectedTourDetail || currentItem

  const visibleItems = useMemo(() => {
    const sorted = [...items]

    sorted.sort((a, b) => {
      if (sortBy === 'oldest') return compareDepartureDate(a, b)
      if (sortBy === 'newest') return compareDepartureDate(b, a)
      return compareDepartureDate(b, a)
    })

    return sorted
  }, [items, sortBy])

  function handleSubmit(event) {
    event.preventDefault()
    setPage(1)
    setAppliedKeyword(keyword)
    setAppliedFromDate(fromDate)
  }

  function handleReset() {
    setKeyword('')
    setAppliedKeyword('')
    setFromDate('')
    setAppliedFromDate('')
    setSortBy('sort')
    setPage(1)
  }

  function openDetail(item) {
    setSelectedTourId(item.id)
    setSelectedTourDetail(item)
    setDetailOpen(true)
  }

  function closeDetail() {
    setDetailOpen(false)
    setSelectedTourId(null)
    setSelectedTourDetail(null)
    setSelectedTourExtras({ customers: [], sessions: [] })
  }

  function handleSortChange(value) {
    setSortBy(value)
    setPage(1)
  }

  return (
    <section className="guide-history-page">
      <div className="guide-card">
        <div className="guide-card-header">
          <SectionHeader
            title="Lịch sử tour"
            description="Danh sách các tour đã hoàn thành."
            action={
              <div className="guide-tour-list-count">
                <strong>{formatNumber(meta.total)}</strong>
                <small>tour</small>
              </div>
            }
          />
        </div>

        <div className="guide-card-body">
          <form className="guide-tour-filter-bar" onSubmit={handleSubmit}>
            <label className="guide-tour-filter-field search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm theo tên tour, điểm đến..."
              />
            </label>

            <label className="guide-tour-filter-field">
              <select value={sortBy} onChange={(event) => handleSortChange(event.target.value)} aria-label="Lọc sắp xếp">
                <option value="sort">Sắp xếp theo</option>
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
              </select>
            </label>

            <label className="guide-tour-filter-field">
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                aria-label="Ngày"
              />
            </label>

            <div className="guide-tour-filter-actions">
              <button type="submit" className="guide-tour-filter-submit">
              Lọc
            </button>
              <button type="button" className="guide-tour-filter-reset" onClick={handleReset}>
                Đặt lại
              </button>
            </div>
          </form>

          {error ? <div className="guide-dashboard-error" style={{ marginTop: 16 }}>{error}</div> : null}

          {loading ? (
            <p className="guide-history-loading">Đang tải lịch sử tour...</p>
          ) : items.length === 0 ? (
            <div className="guide-empty-card" style={{ marginTop: 16 }}>
              <strong>Chưa có tour đã hoàn thành</strong>
              <p>Những tour hoàn thành sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <>
              <div className="guide-tour-list" style={{ marginTop: 16 }}>
                {visibleItems.map((item) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
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
                    <small>/ {formatNumber(meta.last_page)}</small>
                  </div>
                  <button
                    type="button"
                    className="guide-tour-page-btn"
                    disabled={page >= meta.last_page}
                    onClick={() => setPage((current) => Math.min(meta.last_page, current + 1))}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <TourHistoryModal
        open={detailOpen}
        item={modalItem}
        detailLoading={detailLoading}
        extras={selectedTourExtras}
        onClose={closeDetail}
      />
    </section>
  )
}

export default GuideHistoryPage
