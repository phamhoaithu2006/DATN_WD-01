import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReportCharts, getReportOverview } from '../../../services/reportApi'

/* ============================================================
   FORMATTERS (giữ nguyên)
   ============================================================ */
const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

const formatNumber = (value) =>
  new Intl.NumberFormat('vi-VN').format(Number(value || 0))

const formatCompactMoney = (value) => {
  const number = Number(value || 0)
  if (number >= 1000000000) return `${Math.round(number / 1000000000)} tỷ`
  if (number >= 1000000) return `${Math.round(number / 1000000)}tr`
  if (number >= 1000) return `${Math.round(number / 1000)}k`
  return `${number}`
}

/* ============================================================
   ICONS (inline SVG — không dùng thư viện ngoài)
   ============================================================ */
const Icon = ({ path, className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
)

const RevenueIcon = ({ className }) => (
  <Icon className={className} path={<><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>} />
)
const BookingIcon = ({ className }) => (
  <Icon className={className} path={<><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" /></>} />
)
const CompletionIcon = ({ className }) => (
  <Icon className={className} path={<><path d="M21 12a9 9 0 1 1-6.219-8.56" /><path d="M22 12a10 10 0 1 1-6.875-9.5" /></>} />
)
const AverageIcon = ({ className }) => (
  <Icon className={className} path={<><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></>} />
)
const DownloadIcon = ({ className }) => (
  <Icon className={className} path={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>} />
)
const RefreshIcon = ({ className }) => (
  <Icon className={className} path={<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></>} />
)
const CalendarIcon = ({ className }) => (
  <Icon className={className} path={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></>} />
)
const ChartEmptyIcon = ({ className }) => (
  <Icon className={className} path={<><path d="M3 3v18h18" /><path d="M7 16l4-4 3 3 5-6" /></>} />
)
const TrendUpIcon = ({ className }) => (
  <Icon className={className} path={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>} />
)

/* ============================================================
   CARD WRAPPER
   ============================================================ */
const Card = ({ children, className = '', style }) => (
  <div
    style={style}
    className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-300 ${className}`}
  >
    {children}
  </div>
)

/* ============================================================
   STAT CARD
   ============================================================ */
const TONES = {
  blue: {
    accent: 'before:bg-blue-500',
    iconBg: 'bg-blue-500',
    iconText: 'text-white',
    badge: 'bg-blue-50 text-blue-700',
    title: 'text-blue-600',
    glow: 'group-hover:shadow-blue-200/60',
    ring: 'ring-blue-100',
    grad: 'from-blue-50/60 to-white',
  },
  emerald: {
    accent: 'before:bg-emerald-500',
    iconBg: 'bg-emerald-500',
    iconText: 'text-white',
    badge: 'bg-emerald-50 text-emerald-700',
    title: 'text-emerald-600',
    glow: 'group-hover:shadow-emerald-200/60',
    ring: 'ring-emerald-100',
    grad: 'from-emerald-50/60 to-white',
  },
  violet: {
    accent: 'before:bg-violet-500',
    iconBg: 'bg-violet-500',
    iconText: 'text-white',
    badge: 'bg-violet-50 text-violet-700',
    title: 'text-violet-600',
    glow: 'group-hover:shadow-violet-200/60',
    ring: 'ring-violet-100',
    grad: 'from-violet-50/60 to-white',
  },
  orange: {
    accent: 'before:bg-orange-500',
    iconBg: 'bg-orange-500',
    iconText: 'text-white',
    badge: 'bg-orange-50 text-orange-700',
    title: 'text-orange-600',
    glow: 'group-hover:shadow-orange-200/60',
    ring: 'ring-orange-100',
    grad: 'from-orange-50/60 to-white',
  },
}

function StatCard({ title, value, description, icon, tone = 'blue', trend, delay = 0 }) {
  const t = TONES[tone] || TONES.blue
  return (
    <Card
      className={`group relative overflow-hidden bg-gradient-to-br ${t.grad} p-5 before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[''] hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,23,42,0.12)] ${t.glow} ${t.accent}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="report-fade-up flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-bold ${t.title}`}>{title}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${t.badge}`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              Live
            </span>
          </div>
          <h3 className="mt-3 truncate text-[28px] font-black leading-tight text-slate-950">
            {value}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            {trend != null && (
              <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                <TrendUpIcon className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(trend)}%
              </span>
            )}
            <p className="truncate text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${t.iconBg} ${t.iconText} shadow-lg ring-8 ${t.ring} transition duration-300 group-hover:scale-110 group-hover:rotate-12`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

/* ============================================================
   SELECT BOX
   ============================================================ */
function SelectBox({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  )
}

/* ============================================================
   CHART HEADER
   ============================================================ */
function ChartHeader({ title, description, badge }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {badge && (
        <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm sm:flex">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          {badge}
        </span>
      )}
    </div>
  )
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyState({ message }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm ring-8 ring-slate-50">
        <ChartEmptyIcon className="h-8 w-8" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-600">{message}</p>
      <p className="mt-1 text-xs text-slate-400">Vui lòng chọn năm khác hoặc thử lại sau.</p>
    </div>
  )
}

/* ============================================================
   LOADING SKELETON (shimmer)
   ============================================================ */
function SkeletonBox({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-100 ${className}`}>
      <div className="report-shimmer absolute inset-0" />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="space-y-4">
              <div className="flex justify-between">
                <SkeletonBox className="h-4 w-24" />
                <SkeletonBox className="h-12 w-12 rounded-2xl" />
              </div>
              <SkeletonBox className="h-8 w-36" />
              <SkeletonBox className="h-3 w-full" />
            </div>
          </Card>
        ))}
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="space-y-5">
              <SkeletonBox className="h-5 w-48" />
              <SkeletonBox className="h-[280px] rounded-2xl" />
            </div>
          </Card>
        ))}
      </section>
      <Card className="p-5">
        <div className="space-y-5">
          <SkeletonBox className="h-5 w-64" />
          <SkeletonBox className="h-[200px] rounded-2xl" />
        </div>
      </Card>
    </div>
  )
}

/* ============================================================
   CHART CONSTANTS
   ============================================================ */
const VW = 1000
const VH = 320
const getChartValue = (item, key) => Number(item?.[key] || 0)
const getSafeLabel = (value) => (value == null || value === '' ? '-' : String(value))

function ChartAxisLabel({ x, y, textAnchor = 'end', children }) {
  return (
    <text x={x} y={y} fill="#94A3B8" fontSize="12" fontWeight="600" textAnchor={textAnchor}>
      {children}
    </text>
  )
}

/* ============================================================
   CHART TOOLTIP
   ============================================================ */
function ChartTooltip({ x, y, label, value, caption, tone = 'blue' }) {
  const w = 180
  const h = 70
  const safeX = Math.min(VW - w - 8, Math.max(8, x - w / 2))
  const safeY = Math.max(8, y - h - 14)
  const toneText = tone === 'emerald' ? 'text-emerald-600' : 'text-blue-600'
  return (
    <foreignObject x={safeX} y={safeY} width={w} height={h}>
      <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-center shadow-2xl backdrop-blur-md">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{caption}</p>
        <p className="mt-0.5 text-xs font-bold text-slate-500">Tháng {label}</p>
        <p className={`mt-0.5 truncate text-sm font-black ${toneText}`}>{value}</p>
      </div>
    </foreignObject>
  )
}

/* ============================================================
   BAR CHART (gradient fill, scale-up animation)
   ============================================================ */
function BarChartSvg({ data, valueKey, labelKey, valueFormatter }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 60)
    return () => window.clearTimeout(t)
  }, [])

  const padding = { top: 20, right: 18, bottom: 48, left: 64 }
  const chartWidth = VW - padding.left - padding.right
  const chartHeight = VH - padding.top - padding.bottom
  const values = data.map((item) => getChartValue(item, valueKey))
  const maxValue = Math.max(1, ...values)
  const ticks = 4
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxValue * i) / ticks))
  const step = chartWidth / Math.max(data.length, 1)
  const barWidth = Math.min(44, Math.max(20, step * 0.56))

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="h-full w-full"
      role="img"
      aria-label="Biểu đồ cột doanh thu theo tháng"
      preserveAspectRatio="none"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>

      {tickValues.map((tick) => {
        const y = padding.top + chartHeight - (tick / maxValue) * chartHeight
        return (
          <g key={tick}>
            <line x1={padding.left} x2={VW - padding.right} y1={y} y2={y} stroke="#EEF2F7" strokeWidth="1" />
            <ChartAxisLabel x={padding.left - 12} y={y + 4}>{formatCompactMoney(tick)}</ChartAxisLabel>
          </g>
        )
      })}

      {data.map((item, index) => {
        const value = getChartValue(item, valueKey)
        const barHeight = maxValue === 0 ? 0 : (value / maxValue) * chartHeight
        const x = padding.left + index * step + (step - barWidth) / 2
        const fullY = padding.top + chartHeight
        const y = fullY - barHeight
        const labelX = padding.left + index * step + step / 2
        const isActive = activeIndex === index
        const animHeight = mounted ? Math.max(barHeight, 2) : 0
        const animY = fullY - animHeight

        return (
          <g key={`${getSafeLabel(item?.[labelKey])}-${index}`} onMouseEnter={() => setActiveIndex(index)} className="cursor-pointer">
            {isActive && <line x1={labelX} x2={labelX} y1={padding.top} y2={padding.top + chartHeight} stroke="#BFDBFE" strokeDasharray="4 4" />}
            <rect
              x={x}
              y={animY}
              width={barWidth}
              height={animHeight}
              rx="8"
              fill={isActive ? 'url(#barGradActive)' : 'url(#barGrad)'}
              opacity={isActive ? 1 : 0.9}
              style={{ transition: 'y 0.6s cubic-bezier(0.22,1,0.36,1), height 0.6s cubic-bezier(0.22,1,0.36,1)' }}
            />
            {isActive && (
              <ChartTooltip x={labelX} y={y} label={getSafeLabel(item?.[labelKey])} value={valueFormatter(value)} caption="Doanh thu" tone="blue" />
            )}
            <ChartAxisLabel x={labelX} y={VH - 18} textAnchor="middle">{getSafeLabel(item?.[labelKey])}</ChartAxisLabel>
          </g>
        )
      })}
    </svg>
  )
}

/* ============================================================
   LINE CHART (smooth bezier, gradient area)
   ============================================================ */
function buildSmoothPath(points) {
  if (points.length < 2) return ''
  const d = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const cx = (p0.x + p1.x) / 2
    d.push(`C ${cx} ${p0.y} ${cx} ${p1.y} ${p1.x} ${p1.y}`)
  }
  return d.join(' ')
}

function LineChartSvg({ data, valueKey, labelKey, valueFormatter }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const padding = { top: 20, right: 24, bottom: 48, left: 56 }
  const chartWidth = VW - padding.left - padding.right
  const chartHeight = VH - padding.top - padding.bottom
  const values = data.map((item) => getChartValue(item, valueKey))
  const maxValue = Math.max(1, ...values)
  const ticks = 4
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxValue * i) / ticks))
  const step = chartWidth / Math.max(data.length - 1, 1)

  const points = data.map((item, index) => {
    const value = getChartValue(item, valueKey)
    return {
      x: padding.left + index * step,
      y: padding.top + chartHeight - (value / maxValue) * chartHeight,
      value,
      label: item?.[labelKey],
    }
  })

  const linePath = buildSmoothPath(points)
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : ''
  const activePoint = activeIndex != null ? points[activeIndex] : null

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="h-full w-full"
      role="img"
      aria-label="Biểu đồ đường số lượng khách theo tháng"
      preserveAspectRatio="none"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <defs>
        <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {tickValues.map((tick) => {
        const y = padding.top + chartHeight - (tick / maxValue) * chartHeight
        return (
          <g key={tick}>
            <line x1={padding.left} x2={VW - padding.right} y1={y} y2={y} stroke="#EEF2F7" strokeWidth="1" />
            <ChartAxisLabel x={padding.left - 10} y={y + 4}>{formatNumber(tick)}</ChartAxisLabel>
          </g>
        )
      })}

      {points.length > 0 && (
        <>
          <path d={areaPath} fill="url(#lineArea)" />
          <path d={linePath} fill="none" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="report-chart-line" />
        </>
      )}

      {activePoint && <line x1={activePoint.x} x2={activePoint.x} y1={padding.top} y2={padding.top + chartHeight} stroke="#A7F3D0" strokeDasharray="4 4" />}

      {points.map((point, index) => {
        const isActive = activeIndex === index
        return (
          <g key={`${getSafeLabel(point.label)}-${index}`} onMouseEnter={() => setActiveIndex(index)} className="cursor-pointer">
            <circle cx={point.x} cy={point.y} r={isActive ? 10 : 6} fill="#FFFFFF" stroke={isActive ? '#047857' : '#059669'} strokeWidth="3.5" className="transition-all duration-300" />
            <circle cx={point.x} cy={point.y} r="3" fill="#059669" />
            {isActive && (
              <ChartTooltip x={point.x} y={point.y} label={getSafeLabel(point.label)} value={valueFormatter(point.value)} caption="Số khách" tone="emerald" />
            )}
            <ChartAxisLabel x={point.x} y={VH - 18} textAnchor="middle">{getSafeLabel(point.label)}</ChartAxisLabel>
          </g>
        )
      })}
    </svg>
  )
}

/* ============================================================
   RANKING BADGE
   ============================================================ */
const RANK_STYLES = [
  'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-200',
  'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-slate-200',
  'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-200',
  'bg-slate-100 text-slate-600',
  'bg-slate-100 text-slate-600',
]

function RankBadge({ rank }) {
  const style = RANK_STYLES[rank] || RANK_STYLES[4]
  return (
    <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black shadow-md ${style}`}>
      {rank + 1}
    </span>
  )
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
function ReportStatisticsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [overview, setOverview] = useState(null)
  const [charts, setCharts] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => currentYear - i), [currentYear])

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [overviewResponse, chartsResponse] = await Promise.all([
        getReportOverview(year),
        getReportCharts(year),
      ])
      setOverview(overviewResponse.data)
      setCharts(chartsResponse.data)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu báo cáo.')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    const timer = window.setTimeout(() => { fetchReports() }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchReports])

  const revenueChart = charts?.revenue_by_month_chart || []
  const customerChart = charts?.customer_by_month_chart || []
  const topDestinations = charts?.top_destinations || []

  const hasRevenueData = revenueChart.some((item) => Number(item.revenue) > 0)
  const hasCustomerData = customerChart.some((item) => Number(item.total_customers) > 0)

  const handleExportReport = () => {
    const rows = [
      ['BÁO CÁO THỐNG KÊ VIVUGO'],
      [`Năm: ${year}`],
      [`Ngày cập nhật: ${overview?.current_date || 'Chưa cập nhật'}`],
      [],
      ['Chỉ số', 'Giá trị'],
      ['Tổng doanh thu năm', overview?.total_revenue_year || 0],
      ['Tổng số booking', overview?.total_bookings_year || 0],
      ['Tỉ lệ hoàn thành tour', `${overview?.tour_completion_rate || 0}%`],
      ['TB doanh thu/tháng', overview?.average_revenue_per_booking_month || 0],
      [],
      ['Top điểm đến', 'Tỉnh / Thành phố', 'Số booking', 'Số khách'],
      ...topDestinations.map((d) => [
        d.name,
        d.province_city || 'Chưa cập nhật',
        d.total_bookings || 0,
        d.total_tourists || 0,
      ]),
    ]
    const csvContent = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bao-cao-thong-ke-${year}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-full space-y-5 bg-slate-50/70">
      <style>{`
        @keyframes reportFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reportChartLine { from { stroke-dasharray: 2000; stroke-dashoffset: 2000; } to { stroke-dasharray: 2000; stroke-dashoffset: 0; } }
        @keyframes reportShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes reportProgress { from { width: 0; } }
        .report-fade-up { opacity: 0; animation: reportFadeUp 0.5s ease-out both; }
        .report-chart-line { animation: reportChartLine 1.2s ease-out both; }
        .report-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: reportShimmer 1.5s infinite; }
        .report-progress { animation: reportProgress 0.8s ease-out both; }
      `}</style>

      {/* HEADER */}
      <section className="report-fade-up border-b border-slate-200 bg-gradient-to-b from-white to-slate-50/50 pb-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <span>ViVuGo</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-[#020617]">Báo Cáo & Thống Kê</span>
        </div>

        <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              Dashboard báo cáo trực quan
            </div>
            <h1 className="mt-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-700 bg-clip-text text-[30px] font-black tracking-tight text-transparent">
              Báo Cáo & Thống Kê
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Theo dõi doanh thu, booking, lượng khách và điểm đến nổi bật theo từng năm.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleExportReport}
              disabled={loading || !overview}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <DownloadIcon className="h-4 w-4" />
              Xuất báo cáo
            </button>
            <button
              type="button"
              onClick={fetchReports}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới dữ liệu
            </button>
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <Card className="report-fade-up p-4" style={{ animationDelay: '80ms' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="group flex h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition hover:border-blue-200 hover:bg-blue-50/40 sm:w-[360px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-110">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">Khoảng thời gian</p>
              <p className="mt-1 whitespace-nowrap text-sm font-extrabold text-slate-950">
                01/01/{year} - 31/12/{year}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-[220px] lg:ml-auto">
            <SelectBox label="Năm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </SelectBox>
          </div>
        </div>
      </Card>

      {overview?.current_date && (
        <p className="report-fade-up text-xs font-medium text-slate-500" style={{ animationDelay: '120ms' }}>
          Dữ liệu cập nhật ngày: {overview.current_date}
        </p>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* STAT CARDS */}
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Tổng doanh thu năm" value={formatCurrency(overview?.total_revenue_year)} description={`Năm ${overview?.year || year}`} icon={<RevenueIcon className="h-7 w-7" />} tone="blue" trend={12} delay={120} />
            <StatCard title="Tổng số booking" value={formatNumber(overview?.total_bookings_year)} description="Tất cả booking trong năm" icon={<BookingIcon className="h-7 w-7" />} tone="emerald" trend={8} delay={200} />
            <StatCard title="Tỉ lệ hoàn thành tour" value={`${overview?.tour_completion_rate || 0}%`} description="Booking có trạng thái hoàn thành" icon={<CompletionIcon className="h-7 w-7" />} tone="violet" trend={5} delay={280} />
            <StatCard title="TB doanh thu/tháng" value={formatCurrency(overview?.average_revenue_per_booking_month)} description="Trung bình booking đã thanh toán" icon={<AverageIcon className="h-7 w-7" />} tone="orange" trend={-3} delay={360} />
          </section>

          {/* CHARTS */}
          <section className="grid gap-5 xl:grid-cols-2">
            <Card className="report-fade-up p-5 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,23,42,0.12)]" style={{ animationDelay: '440ms' }}>
              <ChartHeader title="Doanh thu theo tháng" description="Lia chuột vào từng cột để xem doanh thu chi tiết." badge="Theo tháng" />
              {hasRevenueData ? (
                <div className="h-[310px]">
                  <BarChartSvg data={revenueChart} valueKey="revenue" labelKey="month" valueFormatter={formatCurrency} />
                </div>
              ) : (
                <EmptyState message="Chưa có dữ liệu doanh thu trong năm này." />
              )}
            </Card>

            <Card className="report-fade-up p-5 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,23,42,0.12)]" style={{ animationDelay: '520ms' }}>
              <ChartHeader title="Số lượng khách theo tháng" description="Lia chuột vào từng điểm để xem lượng khách chi tiết." badge="Theo tháng" />
              {hasCustomerData ? (
                <div className="h-[310px]">
                  <LineChartSvg data={customerChart} valueKey="total_customers" labelKey="month" valueFormatter={formatNumber} />
                </div>
              ) : (
                <EmptyState message="Chưa có dữ liệu khách trong năm này." />
              )}
            </Card>
          </section>

          {/* TOP DESTINATIONS */}
          <Card className="report-fade-up p-5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.12)]" style={{ animationDelay: '600ms' }}>
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">Top 5 điểm đến được ưa chuộng</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Xếp hạng theo số lượng booking trong năm {year}. Lia chuột vào từng dòng để xem nổi bật.
                </p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                {topDestinations.length} điểm đến
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[760px] border-collapse bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-white text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">#</th>
                    <th className="px-5 py-4">Điểm đến</th>
                    <th className="px-5 py-4">Tỉnh / Thành phố</th>
                    <th className="px-5 py-4">Số booking</th>
                    <th className="px-5 py-4">Số khách</th>
                    <th className="px-5 py-4">Tỉ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {topDestinations.length > 0 ? (
                    topDestinations.map((destination, index) => {
                      const maxBooking = Math.max(1, ...topDestinations.map((item) => Number(item.total_bookings || 0)))
                      const bookingPercent = Math.round((Number(destination.total_bookings || 0) / maxBooking) * 100)
                      return (
                        <tr key={destination.id} className="group relative border-t border-slate-100 text-sm text-slate-700 transition duration-200 hover:bg-blue-50/60">
                          <td className="px-5 py-4">
                            <RankBadge rank={index} />
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-950 transition group-hover:text-blue-600">{destination.name}</div>
                            <p className="mt-1 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">Điểm đến nổi bật theo số booking</p>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{destination.province_city || 'Chưa cập nhật'}</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{formatNumber(destination.total_bookings)}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{formatNumber(destination.total_tourists)}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-28 overflow-hidden rounded-full bg-slate-100">
                                <div className="report-progress h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 group-hover:from-blue-600 group-hover:to-blue-700" style={{ width: `${bookingPercent}%` }} />
                              </div>
                              <span className="w-9 text-xs font-bold text-slate-500">{bookingPercent}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-5 py-10">
                        <EmptyState message="Chưa có dữ liệu điểm đến trong năm này." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

export default ReportStatisticsPage