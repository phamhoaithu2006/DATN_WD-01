import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, CartesianGrid, LineChart, Line, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { getAdminDashboardSnapshot } from '../../services/adminDashboardApi'
import { formatDateDdMmYyyy } from '../../utils/dateFormat'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('vi-VN')

const STATUS_TONE = {
  pending: { label: 'Chờ xác nhận', color: '#f59e0b' },
  confirmed: { label: 'Đã xác nhận', color: '#0ea5e9' },
  completed: { label: 'Hoàn thành', color: '#10b981' },
  cancelled: { label: 'Đã hủy', color: '#ef4444' },
  unpaid: { label: 'Chưa thanh toán', color: '#f97316' },
  paid: { label: 'Đã thanh toán', color: '#10b981' },
  failed: { label: 'Thanh toán lỗi', color: '#ef4444' },
  refunded: { label: 'Đã hoàn tiền', color: '#8b5cf6' },
}

const BOOKING_STATUS_COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#ef4444']
const ACTIVITY_TONES = {
  booking: { bg: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
  tour: { bg: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
  guide: { bg: 'bg-violet-50 text-violet-600', dot: 'bg-violet-500' },
  support: { bg: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' },
}
const EMPTY_OBJECT = {}
const EMPTY_ARRAY = []

function Icon({ children, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

const RevenueIcon = ({ className }) => (
  <Icon className={className}><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Icon>
)
const BookingIcon = ({ className }) => (
  <Icon className={className}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" /></Icon>
)
const TourIcon = ({ className }) => (
  <Icon className={className}><path d="M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2-6-2Z" /><path d="M9 4v14" /><path d="M15 6v14" /></Icon>
)
const CustomerIcon = ({ className }) => (
  <Icon className={className}><circle cx="10" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4" /><path d="M16 11l2 2 4-4" /></Icon>
)
const GuideIcon = ({ className }) => (
  <Icon className={className}><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4" /><path d="M16 11l2 2 4-4" /></Icon>
)
const SupportIcon = ({ className }) => (
  <Icon className={className}><path d="M4 13a8 8 0 0 1 16 0" /><path d="M4 13v4a2 2 0 0 0 2 2h1v-8H6a2 2 0 0 0-2 2Z" /><path d="M20 13v4a2 2 0 0 1-2 2h-1v-8h1a2 2 0 0 1 2 2Z" /></Icon>
)
const RefreshIcon = ({ className }) => (
  <Icon className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></Icon>
)
const DownloadIcon = ({ className }) => (
  <Icon className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></Icon>
)
const CalendarIcon = ({ className }) => (
  <Icon className={className}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></Icon>
)

function Card({ children, className = '', style }) {
  return (
    <section
      style={style}
      className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </section>
  )
}

function StatCard({ title, value, description, icon, tone = 'blue' }) {
  const palette = {
    blue: 'from-blue-50 to-white border-blue-100',
    emerald: 'from-emerald-50 to-white border-emerald-100',
    violet: 'from-violet-50 to-white border-violet-100',
    amber: 'from-amber-50 to-white border-amber-100',
    rose: 'from-rose-50 to-white border-rose-100',
    slate: 'from-slate-50 to-white border-slate-100',
  }

  return (
    <Card className={`overflow-hidden bg-gradient-to-br ${palette[tone] || palette.blue} p-5`}> 
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h3 className="mt-3 truncate text-[30px] font-black tracking-tight text-slate-950">{value}</h3>
          <p className="mt-2 text-xs font-medium text-slate-500">{description}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
          {icon}
        </div>
      </div>
    </Card>
  )
}

function SectionTitle({ title, description, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  )
}

function formatMoney(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0 đ'
  return currencyFormatter.format(number)
}

function formatNumber(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  return numberFormatter.format(number)
}

function formatRelativeTime(value) {
  if (!value) return 'vừa xong'
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.round(diff / 60000))

  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.round(hours / 24)
  return `${days} ngày trước`
}

function mapBookingStatus(status) {
  return STATUS_TONE[status] || { label: status || 'Không rõ', color: '#94a3b8' }
}

function makeActivityItems(recentBookings = [], recentTours = []) {
  const bookingItems = recentBookings.slice(0, 5).map((booking) => ({
    type: 'booking',
    title: `${booking.booking_code || 'Booking'} ${booking.status === 'confirmed' ? 'đã xác nhận' : booking.status === 'completed' ? 'đã hoàn thành' : booking.status === 'cancelled' ? 'đã hủy' : 'được tạo'}`,
    subtitle: booking.user?.full_name || booking.contact?.contact_name || 'Khách hàng mới',
    time: booking.created_at,
  }))

  const tourItems = recentTours.slice(0, 5).map((tour) => ({
    type: 'tour',
    title: `${tour.title || 'Tour'} ${tour.status === 'published' ? 'đã xuất bản' : tour.status === 'draft' ? 'ở bản nháp' : 'được cập nhật'}`,
    subtitle: tour.destination?.name || tour.destination_name || 'Chưa có điểm đến',
    time: tour.created_at,
  }))

  return [...bookingItems, ...tourItems]
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
    .slice(0, 6)
}

function AdminDashboardPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const years = useMemo(() => Array.from({ length: 3 }, (_, index) => currentYear - index), [currentYear])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getAdminDashboardSnapshot(year)
      setSnapshot(data)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không tải được dữ liệu tổng quan.')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  const overview = snapshot?.overview ?? EMPTY_OBJECT
  const charts = snapshot?.charts ?? EMPTY_OBJECT
  const bookingStats = snapshot?.bookingStats ?? EMPTY_OBJECT
  const customerStats = snapshot?.customerStats ?? EMPTY_OBJECT
  const guideStats = snapshot?.guideStats ?? EMPTY_OBJECT
  const supportStats = snapshot?.supportStats ?? EMPTY_OBJECT
  const tourStats = snapshot?.tourStats ?? EMPTY_OBJECT
  const recentBookings = snapshot?.recentBookings ?? EMPTY_ARRAY
  const recentTours = snapshot?.recentTours ?? EMPTY_ARRAY

  const revenueChart = (charts.revenue_by_month_chart || []).map((item, index) => ({
    month: item.month || `T${index + 1}`,
    revenue: Number(item.revenue || 0),
    bookings: Number((charts.booking_by_month_chart || [])[index]?.total_bookings || 0),
    customers: Number((charts.customer_by_month_chart || [])[index]?.total_customers || 0),
  }))

  const bookingPie = useMemo(() => {
    const entries = [
      { key: 'completed', value: Number(bookingStats.completed || 0), label: 'Hoàn thành' },
      { key: 'confirmed', value: Number(bookingStats.confirmed || 0), label: 'Đã xác nhận' },
      { key: 'pending', value: Number(bookingStats.pending || 0), label: 'Chờ xác nhận' },
      { key: 'cancelled', value: Number(bookingStats.cancelled || 0), label: 'Đã hủy' },
    ]

    return entries
      .filter((item) => item.value > 0)
      .map((item, index) => ({ ...item, color: BOOKING_STATUS_COLORS[index % BOOKING_STATUS_COLORS.length] }))
  }, [bookingStats])

  const activityItems = useMemo(() => makeActivityItems(recentBookings, recentTours), [recentBookings, recentTours])

  const statCards = [
    {
      key: 'revenue',
      title: 'Tổng doanh thu',
      value: formatMoney(overview.total_revenue_year),
      description: `Năm ${overview.year || year}`,
      icon: <RevenueIcon className="h-6 w-6" />,
      tone: 'blue',
    },
    {
      key: 'bookings',
      title: 'Tổng booking',
      value: formatNumber(overview.total_bookings_year || bookingStats.total),
      description: 'Tất cả booking trong hệ thống',
      icon: <BookingIcon className="h-6 w-6" />,
      tone: 'emerald',
    },
    {
      key: 'tours',
      title: 'Tổng tour',
      value: formatNumber(tourStats.total),
      description: `${formatNumber(tourStats.published)} tour đang xuất bản`,
      icon: <TourIcon className="h-6 w-6" />,
      tone: 'violet',
    },
    {
      key: 'customers',
      title: 'Khách hàng',
      value: formatNumber(customerStats.total_users),
      description: `${formatNumber(customerStats.active_users)} đang hoạt động`,
      icon: <CustomerIcon className="h-6 w-6" />,
      tone: 'amber',
    },
    {
      key: 'guides',
      title: 'Hướng dẫn viên',
      value: formatNumber(guideStats.total),
      description: `${formatNumber(guideStats.data?.find((item) => item.status === 'active')?.total || 0)} đang hoạt động`,
      icon: <GuideIcon className="h-6 w-6" />,
      tone: 'rose',
    },
    {
      key: 'support',
      title: 'Nhân viên hỗ trợ',
      value: formatNumber(supportStats.total),
      description: `${formatNumber(supportStats.active)} đang làm việc`,
      icon: <SupportIcon className="h-6 w-6" />,
      tone: 'slate',
    },
  ]

  const exportCsv = () => {
    const rows = [
      ['BÁO CÁO TỔNG QUAN HỆ THỐNG'],
      [`Năm: ${year}`],
      [`Cập nhật: ${formatDateDdMmYyyy(overview.current_date, 'Chưa cập nhật')}`],
      [],
      ['Chỉ số', 'Giá trị'],
      ['Tổng doanh thu', overview.total_revenue_year || 0],
      ['Tổng booking', overview.total_bookings_year || bookingStats.total || 0],
      ['Tổng tour', tourStats.total || 0],
      ['Tổng khách hàng', customerStats.total_users || 0],
      ['Hướng dẫn viên', guideStats.total || 0],
      ['Nhân viên hỗ trợ', supportStats.total || 0],
      [],
      ['Tour nổi bật', 'Điểm đến', 'Booking', 'Doanh thu'],
      ...(tourStats.top_tours || []).map((tour) => [
        tour.title,
        tour.destination_name || tour.province_city || 'Chưa có',
        tour.total_bookings || 0,
        tour.total_revenue || 0,
      ]),
    ]

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tong-quan-he-thong-${year}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-6 bg-slate-50/70">
      <style>{`
        @keyframes dashboardFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .dashboard-fade-up { opacity: 0; animation: dashboardFadeUp 0.45s ease-out both; }
      `}</style>

      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Tổng Quan Hệ Thống']}
        title="Tổng Quan Hệ Thống"
        description={`Cập nhật lần cuối: ${formatDateDdMmYyyy(overview.current_date, 'Chưa cập nhật')}`}
        showNotificationBell
        actions={
          <>
            <label className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
              <CalendarIcon className="h-4 w-4 text-sky-600" />
              <select
                className="bg-transparent outline-none"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                {years.map((item) => (
                  <option key={item} value={item}>
                    Năm {item}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600"
            >
              <DownloadIcon className="h-4 w-4" />
              Xuất báo cáo
            </button>
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-600"
            >
              <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-white shadow-sm" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {statCards.map((card, index) => (
            <div key={card.key} className="dashboard-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
              <StatCard {...card} />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Card className="dashboard-fade-up p-5" style={{ animationDelay: '120ms' }}>
          <SectionTitle
            title="Doanh Thu & Booking Theo Tháng"
            description={`Năm ${year}`}
          />
          {revenueChart.some((item) => item.revenue > 0 || item.bookings > 0) ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip formatter={(value, name) => [name === 'revenue' ? formatMoney(value) : formatNumber(value), name === 'revenue' ? 'Doanh thu' : 'Booking']} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="bookings" name="Booking" stroke="#f59e0b" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Chưa có dữ liệu doanh thu" description="Hãy chọn năm khác hoặc kiểm tra lại dữ liệu booking." />
          )}
        </Card>

        <Card className="dashboard-fade-up p-5" style={{ animationDelay: '180ms' }}>
          <SectionTitle
            title="Trạng Thái Booking"
            description={`Tổng: ${formatNumber(bookingStats.total || overview.total_bookings_year)}`}
          />
          {bookingPie.length > 0 ? (
            <div className="grid gap-4">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bookingPie} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={62} outerRadius={94} paddingAngle={3}>
                      {bookingPie.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [formatNumber(value), name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2">
                {bookingPie.map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                    </div>
                    <strong className="text-sm text-slate-950">{formatNumber(item.value)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="Chưa có trạng thái booking" description="Hệ thống chưa có booking đủ dữ liệu để hiển thị biểu đồ." />
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <Card className="dashboard-fade-up p-5" style={{ animationDelay: '240ms' }}>
          <SectionTitle
            title="Tăng Trưởng Khách Hàng"
            description="Số lượng khách hàng mới theo tháng"
            action={
              <Link to="/admin/users" className="text-sm font-bold text-sky-600 hover:text-sky-700">
                Xem chi tiết
              </Link>
            }
          />
          {(charts.customer_by_month_chart || []).some((item) => Number(item.total_customers || 0) > 0) ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.customer_by_month_chart || []}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip formatter={(value) => [formatNumber(value), 'Khách hàng']} />
                  <Bar dataKey="total_customers" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Chưa có dữ liệu khách hàng" description="Biểu đồ sẽ hiển thị khi hệ thống có khách hàng mới." />
          )}
        </Card>

        <Card className="dashboard-fade-up p-5" style={{ animationDelay: '300ms' }}>
          <SectionTitle
            title="Tour Phổ Biến"
            description="Top tour theo số booking"
            action={
              <Link to="/admin/tours" className="text-sm font-bold text-sky-600 hover:text-sky-700">
                Xem tất cả
              </Link>
            }
          />
          {Array.isArray(tourStats.top_tours) && tourStats.top_tours.length > 0 ? (
            <div className="space-y-3">
              {tourStats.top_tours.map((tour, index) => (
                <article key={tour.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-950">{tour.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {tour.destination_name || tour.province_city || 'Chưa cập nhật'} · {formatNumber(tour.total_bookings)} booking · {formatMoney(tour.total_revenue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-amber-500">★ {Number(tour.average_rating || 0).toFixed(1)}</div>
                    <div className="text-xs text-slate-500">{formatNumber(tour.review_count)} đánh giá</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có tour nổi bật" description="Hệ thống sẽ tự động hiển thị tour được đặt nhiều nhất." />
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Card className="dashboard-fade-up overflow-hidden" style={{ animationDelay: '360ms' }}>
          <div className="border-b border-slate-100 p-5">
            <SectionTitle
              title="Booking Mới Nhất"
              description="5 booking gần nhất từ API quản lý booking"
              action={
                <Link to="/admin/bookings" className="text-sm font-bold text-sky-600 hover:text-sky-700">
                  Xem tất cả
                </Link>
              }
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Mã</th>
                  <th className="px-5 py-3">Khách hàng</th>
                  <th className="px-5 py-3">Tour</th>
                  <th className="px-5 py-3">Số tiền</th>
                  <th className="px-5 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.length > 0 ? recentBookings.map((booking) => {
                  const status = mapBookingStatus(booking.status)
                  return (
                    <tr key={booking.id} className="border-t border-slate-100 text-sm text-slate-700">
                      <td className="px-5 py-4 font-bold text-sky-600">{booking.booking_code || `#${booking.id}`}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-950">{booking.user?.full_name || booking.contact?.contact_name || 'Khách lẻ'}</div>
                        <div className="text-xs text-slate-500">{formatRelativeTime(booking.created_at)}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{booking.tour?.title || '—'}</td>
                      <td className="px-5 py-4 font-semibold text-slate-950">{formatMoney(booking.total_amount)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan="5" className="px-5 py-10">
                      <EmptyState title="Chưa có booking mới" description="Danh sách booking gần nhất sẽ xuất hiện tại đây." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="dashboard-fade-up p-5" style={{ animationDelay: '420ms' }}>
          <SectionTitle
            title="Hoạt Động Gần Đây"
            description="Ghép từ booking mới và tour mới"
          />
          <div className="space-y-4">
            {activityItems.length > 0 ? activityItems.map((item, index) => {
              const tone = ACTIVITY_TONES[item.type] || ACTIVITY_TONES.booking
              return (
                <div key={`${item.type}-${index}`} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone.bg}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{formatRelativeTime(item.time)}</p>
                  </div>
                </div>
              )
            }) : (
              <EmptyState title="Chưa có hoạt động" description="Hoạt động mới sẽ được hiển thị sau khi có dữ liệu." />
            )}
          </div>
        </Card>
      </div>
    </section>
  )
}

export default AdminDashboardPage
