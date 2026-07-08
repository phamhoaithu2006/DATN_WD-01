import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getGuideDashboard } from '../../services/guideDashboardApi'
import { mediaUrl } from '../../utils/mediaUrl'

const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('vi-VN')

const weekdayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function formatMoney(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? moneyFormatter.format(number) : '0đ'
}

function formatMoneyCompact(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number) || number === 0) return '0đ'
  if (Math.abs(number) >= 1000000000) {
    return `${(number / 1000000000).toFixed(number % 1000000000 === 0 ? 0 : 1)} tỷ`
  }
  if (Math.abs(number) >= 1000000) {
    return `${(number / 1000000).toFixed(number % 1000000 === 0 ? 0 : 1)}tr`
  }
  return formatMoney(number)
}

function formatNumber(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? numberFormatter.format(number) : '0'
}

function formatDate(value) {
  if (!value) return 'Chưa xác định'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatTime(value) {
  if (!value) return '--:--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function initials(name) {
  return String(name || 'HDV')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function monthLabel(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(date)
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

function StatCard({ title, value, subtitle, tone = 'blue', badge, onClick, active = false, icon }) {
  return (
    <button
      type="button"
      className={`guide-stat-card tone-${tone} ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <div className="guide-stat-card-head">
        <span className="guide-stat-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </span>
        {badge ? <span className="guide-stat-badge">{badge}</span> : null}
      </div>
      <span className="guide-stat-title">{title}</span>
      <strong className="guide-stat-value">{value}</strong>
      {subtitle ? <span className="guide-stat-subtitle">{subtitle}</span> : null}
    </button>
  )
}

function Pill({ tone, children }) {
  return <span className={`guide-pill tone-${tone}`}>{children}</span>
}

function statusTone(status) {
  const value = String(status || '').toLowerCase()

  if (value.includes('confirm') || value.includes('xác nhận')) return 'green'
  if (value.includes('ongoing') || value.includes('diễn ra')) return 'amber'
  if (value.includes('cancel') || value.includes('hủy')) return 'red'
  return 'blue'
}

function statusLabel(item) {
  const value = String(item?.assignment_status || item?.status || '').toLowerCase()

  if (value.includes('confirm')) return 'Đã xác nhận'
  if (value.includes('ongoing')) return 'Đang diễn ra'
  if (value.includes('cancel')) return 'Đã hủy'
  if (item?.departure_date) return new Date(item.departure_date) < new Date() ? 'Đang chạy' : 'Sắp đi'
  return 'Đã phân công'
}

function TourRow({ item }) {
  const tour = item?.tour || {}
  const destination = tour.destination?.name || tour.destination?.province_city || 'Chưa có điểm đến'
  const thumbnail = tour.thumbnail_url || tour.thumbnail?.image_url || tour.image_url
  const thumbnailAlt = tour.thumbnail_alt || tour.thumbnail?.alt_text || tour.title || 'Ảnh tour'

  return (
    <article className="guide-tour-row">
      <div className="guide-tour-row-thumb" aria-hidden="true">
        {thumbnail ? (
          <img src={thumbnail} alt={thumbnailAlt} />
        ) : (
          tour.title ? initials(tour.title) : 'TG'
        )}
      </div>
      <div className="guide-tour-row-main">
        <div className="guide-tour-row-head">
          <div>
            <h3>{tour.title || 'Tour được phân công'}</h3>
            <p>
              {destination} · {formatNumber(item?.booked_slots)} khách · {formatDate(item?.departure_date)}
            </p>
          </div>
          <Pill tone={statusTone(item?.assignment_status || item?.status)}>{statusLabel(item)}</Pill>
        </div>
        <div className="guide-tour-row-meta">
          <span>{formatTime(item?.departure_date)}</span>
          <span>{formatMoneyCompact(item?.price)}</span>
          <span>{formatNumber(item?.available_slots)} chỗ trống</span>
        </div>
      </div>
    </article>
  )
}

function CalendarCard({ monthDate, onPrev, onNext, eventsByDate, selectedDate }) {
  const days = useMemo(() => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startIndex = (firstDay.getDay() + 6) % 7
    const totalDays = new Date(year, month + 1, 0).getDate()
    const items = []

    for (let i = 0; i < startIndex; i += 1) {
      items.push(null)
    }

    for (let day = 1; day <= totalDays; day += 1) {
      items.push(new Date(year, month, day))
    }

    return items
  }, [monthDate])

  return (
    <section className="guide-card guide-calendar-card">
      <div className="guide-card-header">
        <SectionHeader
          title="Lịch làm việc"
          description={monthLabel(monthDate)}
          action={(
            <div className="guide-calendar-actions">
              <button type="button" className="guide-calendar-nav" onClick={onPrev} aria-label="Tháng trước">‹</button>
              <button type="button" className="guide-calendar-nav" onClick={onNext} aria-label="Tháng sau">›</button>
            </div>
          )}
        />
      </div>
      <div className="guide-card-body">
        <div className="guide-calendar-grid weekdays">
          {weekdayLabels.map((label) => (
            <div key={label} className="guide-calendar-weekday">{label}</div>
          ))}
        </div>
        <div className="guide-calendar-grid days">
          {days.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="guide-calendar-cell empty" />

            const key = date.toISOString().slice(0, 10)
            const events = eventsByDate.get(key) || []
            const isToday = selectedDate && key === selectedDate
            const isCurrentMonth = date.getMonth() === monthDate.getMonth()

            return (
              <div
                key={key}
                className={`guide-calendar-cell ${isToday ? 'is-selected' : ''} ${isCurrentMonth ? '' : 'is-muted'}`}
              >
                <span>{date.getDate()}</span>
                <div className="guide-calendar-dots">
                  {events.slice(0, 3).map((tone, dotIndex) => (
                    <i key={`${key}-${dotIndex}`} className={`tone-${tone}`} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="guide-calendar-legend">
          <span><i className="tone-blue" /> Tour đã lên lịch</span>
          <span><i className="tone-green" /> Tour đang diễn ra</span>
          <span><i className="tone-orange" /> Cuộc hẹn</span>
          <span><i className="tone-red" /> Nghỉ phép</span>
        </div>
      </div>
    </section>
  )
}

function DonutCard({ overview }) {
  const segments = overview?.segments || []
  const total = Number(overview?.active || overview?.total || 0)
  const chart = segments
    .map((segment) => `${segment.color} ${segment.percent || 0}%`)
    .join(', ')

  return (
    <section className="guide-card">
      <div className="guide-card-header">
        <SectionHeader title="Tổng quan tour" description="Thống kê tất cả các tour" />
      </div>
      <div className="guide-card-body guide-overview-body">
        <div className="guide-donut-wrap">
          <div className="guide-donut" style={{ background: `conic-gradient(${chart})` }}>
            <div className="guide-donut-inner">
              <strong>{formatNumber(total)}</strong>
              <span>Tours</span>
            </div>
          </div>
        </div>
        <div className="guide-overview-list">
          {segments.map((segment) => (
            <div key={segment.key} className="guide-overview-item">
              <div className="guide-overview-item-row">
                <span className="guide-overview-dot" style={{ background: segment.color }} />
                <strong>{segment.label}</strong>
                <span>{segment.percent}%</span>
              </div>
              <div className="guide-overview-bar">
                <span style={{ width: `${segment.percent}%`, background: segment.color }} />
              </div>
              <small>{formatNumber(segment.count)} tour</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ReviewsCard({ guide, summary, reviews }) {
  const average = Number(summary?.rating?.average || guide?.average_rating || 0)
  const count = Number(summary?.rating?.review_count || guide?.review_count || 0)
  const stars = Math.max(1, Math.min(5, Math.round(average || 0)))

  return (
    <section className="guide-card">
      <div className="guide-card-header">
        <SectionHeader title="Đánh giá từ khách hàng" description={`Dựa trên ${formatNumber(count)} đánh giá`} />
      </div>
      <div className="guide-card-body guide-reviews-body">
        <div className="guide-review-summary">
          <div>
            <strong>{average.toFixed(1)}</strong>
            <span>/ 5 sao</span>
          </div>
          <div>
            <div className="guide-review-stars">
              {Array.from({ length: 5 }).map((_, index) => (
                <i key={index} className={index < stars ? 'is-active' : ''}>★</i>
              ))}
            </div>
            <small>Chất lượng phục vụ và phản hồi của khách</small>
          </div>
        </div>

        <div className="guide-review-list">
          {reviews.length ? (
            reviews.map((review) => (
              <article key={review.id} className="guide-review-item">
                <div className="guide-review-avatar">
                  {review.reviewer_avatar ? (
                    <img src={mediaUrl(review.reviewer_avatar)} alt={review.reviewer_name} />
                  ) : (
                    <span>{review.reviewer_initials || initials(review.reviewer_name)}</span>
                  )}
                </div>
                <div className="guide-review-content">
                  <div className="guide-review-head">
                    <div>
                      <strong>{review.reviewer_name}</strong>
                      <p>{review.tour_title}</p>
                    </div>
                    <div className="guide-review-stars compact">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <i key={index} className={index < review.rating ? 'is-active' : ''}>★</i>
                      ))}
                    </div>
                  </div>
                  <p className="guide-review-text">{review.comment || 'Khách chưa để lại nhận xét chi tiết.'}</p>
                  <small>{formatDate(review.created_at)}</small>
                </div>
              </article>
            ))
          ) : (
            <div className="guide-empty-card">
              <strong>Chưa có đánh giá mới</strong>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function IncomeTable({ rows, summary }) {
  const incomeYear = summary?.income?.year || new Date().getFullYear()
  const incomeMonth = summary?.income?.month || new Date().getMonth() + 1

  return (
    <section className="guide-card guide-income-card">
      <div className="guide-card-header">
        <SectionHeader title="Thống kê thu nhập" description={`Năm ${incomeYear} · Tháng ${incomeMonth}`} />
      </div>
      <div className="guide-card-body guide-income-body">
        <table className="guide-income-table">
          <thead>
            <tr>
              <th>Tháng</th>
              <th>Thu nhập</th>
              <th>Biến động</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => {
              const trendClass = row.trend === 'up' ? 'positive' : row.trend === 'down' ? 'negative' : 'neutral'
              const trendIcon = row.trend === 'up' ? '↗' : row.trend === 'down' ? '↘' : '—'

              return (
                <tr key={row.month_number}>
                  <td>
                    <div className="guide-income-month">
                      <span className="guide-income-icon">📅</span>
                      <strong>{row.label}</strong>
                    </div>
                  </td>
                  <td><strong>{formatMoney(row.revenue)}</strong></td>
                  <td>
                    <span className={`guide-income-trend ${trendClass}`}>
                      {row.change_percent === null ? trendIcon : `${row.change_percent > 0 ? '+' : ''}${row.change_percent}% ${trendIcon}`}
                    </span>
                  </td>
                  <td>{row.note}</td>
                </tr>
              )
            }) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function GuideDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [tourPeriod, setTourPeriod] = useState('month')
  const [customerPeriod, setCustomerPeriod] = useState('month')
  const [calendarOffset, setCalendarOffset] = useState(0)

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const response = await getGuideDashboard()
        if (mounted) setDashboard(response?.data || null)
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.message || 'Không tải được dữ liệu trang chủ HDV.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  const guide = dashboard?.guide || {}
  const summary = dashboard?.summary || {}
  const periodStats = summary.period || {}
  const selectedTourStats = periodStats[tourPeriod] || {}
  const selectedCustomerStats = periodStats[customerPeriod] || {}

  const todaySchedule = useMemo(() => dashboard?.today_schedule ?? [], [dashboard?.today_schedule])
  const upcomingTours = useMemo(() => dashboard?.upcoming_tours ?? [], [dashboard?.upcoming_tours])
  const ongoingTours = useMemo(() => dashboard?.ongoing_tours ?? [], [dashboard?.ongoing_tours])
  const assignedTours = useMemo(() => dashboard?.assigned_tours ?? [], [dashboard?.assigned_tours])
  const incomeRows = useMemo(() => dashboard?.income_rows ?? [], [dashboard?.income_rows])
  const tourOverview = dashboard?.tour_overview || {}
  const recentReviews = useMemo(() => dashboard?.recent_reviews ?? [], [dashboard?.recent_reviews])

  const avatarSrc = mediaUrl(guide.avatar_url || guide.user?.avatar_url)
  const fullName = guide.user?.full_name || guide.user?.name || 'Hướng dẫn viên'
  const today = useMemo(() => new Date(), [])
  const visibleMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth() + calendarOffset, 1), [today, calendarOffset])
  const calendarKey = visibleMonth.toISOString().slice(0, 7)
  const selectedDate = today.toISOString().slice(0, 10)

  const calendarEvents = useMemo(() => {
    const buckets = new Map()
    const push = (date, tone) => {
      if (!date) return
      const key = String(date).slice(0, 10)
      if (!key.startsWith(calendarKey)) return
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(tone)
    }

    upcomingTours.forEach((item) => push(item.departure_date, 'blue'))
    ongoingTours.forEach((item) => push(item.departure_date, 'green'))
    todaySchedule.forEach((item) => push(item.departure_date, 'orange'))
    assignedTours.forEach((item) => push(item.departure_date, 'red'))

    return buckets
  }, [assignedTours, calendarKey, ongoingTours, todaySchedule, upcomingTours])

  const monthIncome = Number(summary.income?.current_month_revenue || 0)
  const yearIncome = Number(summary.income?.current_year_revenue || 0)
  const totalTours = Number(summary.tour_count_total || 0)

  const heroDate = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(today)

  return (
    <section className="guide-dashboard-overview">
      {loading ? (
        <div className="guide-dashboard-loading">
          <div className="guide-dashboard-skeleton hero" />
          <div className="guide-dashboard-skeleton-grid">
            <div className="guide-dashboard-skeleton card" />
            <div className="guide-dashboard-skeleton card" />
            <div className="guide-dashboard-skeleton card" />
            <div className="guide-dashboard-skeleton card" />
          </div>
        </div>
      ) : null}

      {error ? <div className="guide-dashboard-error">{error}</div> : null}

      {!loading && !error ? (
        <>
          <header className="guide-dashboard-hero">
            <div className="guide-dashboard-hero-copy">
              <span className="guide-dashboard-kicker">{heroDate}</span>
              <h1>Xin chào, {fullName} 👋</h1>
              <p>
                Trang chủ này gom nhanh tour được phân công,
                lịch trình hôm nay, đánh giá gần đây và thống kê doanh thu để HDV nhìn tổng quan thật nhanh.
              </p>
              <div className="guide-dashboard-hero-actions">
                <a href="#today-schedule" className="guide-primary-action">Xem tour hôm nay</a>
                <a href="#work-calendar" className="guide-secondary-action">Lịch làm việc</a>
              </div>
            </div>
            <div className="guide-dashboard-hero-visual" aria-hidden="true">
              <div className="guide-hero-shape shape-one" />
              <div className="guide-hero-shape shape-two" />
              <div className="guide-hero-card">
                <div className="guide-hero-card-avatar">
                  {avatarSrc ? <img src={avatarSrc} alt={fullName} /> : initials(fullName)}
                </div>
                <span>{guide.guide_code || 'HDV'}</span>
                <strong>{formatNumber(totalTours)} tour đã dẫn</strong>
                <small>{formatNumber(summary.rating?.review_count || guide.review_count)} lượt đánh giá</small>
              </div>
            </div>
          </header>

          <div className="guide-stats-grid">
            <StatCard
              title="Tổng tour đã dẫn"
              value={formatNumber(tourPeriod === 'month' ? selectedTourStats.tour_count : periodStats.year?.tour_count)}
              subtitle={`Đang xem ${tourPeriod === 'month' ? selectedTourStats.label : periodStats.year?.label || 'theo năm'} - bấm để đổi`}
              tone="blue"
              active={tourPeriod === 'month'}
              badge={tourPeriod === 'month' ? 'Tháng' : 'Năm'}
              icon={(
                <>
                  <path d="M4 19.5V5.5" />
                  <path d="M4 19.5C7.5 16 12.5 16 16 19.5" />
                  <path d="M4 5.5C7.5 9 12.5 9 16 5.5" />
                  <path d="M16 5.5V19.5" />
                  <path d="M20 7v10" />
                </>
              )}
              onClick={() => setTourPeriod((current) => (current === 'month' ? 'year' : 'month'))}
            />
            <StatCard
              title="Đánh giá trung bình"
              value={`${Number(summary.rating?.average || guide.average_rating || 0).toFixed(1)}/5`}
              subtitle={`${formatNumber(summary.rating?.review_count || guide.review_count)} lượt đánh giá`}
              tone="amber"
              icon={(
                <>
                  <polygon points="12 2.5 15.3 9.1 22.5 10.1 17.2 15.1 18.5 22.3 12 18.7 5.5 22.3 6.8 15.1 1.5 10.1 8.7 9.1 12 2.5" />
                </>
              )}
            />
            <StatCard
              title="Tổng lượt khách"
              value={formatNumber(customerPeriod === 'month' ? selectedCustomerStats.customer_count : periodStats.year?.customer_count)}
              subtitle={`Đang xem ${customerPeriod === 'month' ? selectedCustomerStats.label : periodStats.year?.label || 'theo năm'} - bấm để đổi`}
              tone="green"
              active={customerPeriod === 'month'}
              badge={customerPeriod === 'month' ? 'Tháng' : 'Năm'}
              icon={(
                <>
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3.5 19c1.5-3 4-4.5 5.5-4.5S12.5 16 14 19" />
                  <path d="M14.5 11.5h4" />
                  <path d="M14.5 15.5h6" />
                </>
              )}
              onClick={() => setCustomerPeriod((current) => (current === 'month' ? 'year' : 'month'))}
            />
            <StatCard
              title="Thu nhập tháng này"
              value={formatMoneyCompact(monthIncome)}
              subtitle={`${formatMoney(yearIncome)} trong ${summary.income?.year || new Date().getFullYear()}`}
              tone="red"
              icon={(
                <>
                  <path d="M12 3v18" />
                  <path d="M16.5 7.5c0-2.2-2-4-4.5-4s-4.5 1.8-4.5 4 2 3.5 4.5 4 4.5 1.8 4.5 4-2 4-4.5 4-4.5-1.8-4.5-4" />
                </>
              )}
            />
          </div>

          <div className="guide-middle-grid" id="today-schedule">
            <section className="guide-card">
              <div className="guide-card-header">
                <SectionHeader
                  title="Tour sắp tới"
                  description={`${upcomingTours.length} tour trong tuần này`}
                  action={<Link to="/guide/tours" className="guide-card-link">Xem tất cả →</Link>}
                />
              </div>
              <div className="guide-card-body">
          <div className="guide-tour-list">
                  {upcomingTours.length ? upcomingTours.slice(0, 3).map((item) => (
                    <TourRow key={item.id} item={item} />
                  )) : (
                    <div className="guide-empty-card">
                      <strong>Chưa có tour sắp tới</strong>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div id="work-calendar">
              <CalendarCard
                monthDate={visibleMonth}
                onPrev={() => setCalendarOffset((current) => current - 1)}
                onNext={() => setCalendarOffset((current) => current + 1)}
                eventsByDate={calendarEvents}
                selectedDate={selectedDate}
              />
            </div>
          </div>

          <div className="guide-bottom-grid">
            <DonutCard overview={tourOverview} />
            <ReviewsCard guide={guide} summary={summary} reviews={recentReviews} />
          </div>

          <IncomeTable rows={incomeRows} summary={summary} />
        </>
      ) : null}
    </section>
  )
}

export default GuideDashboardPage
