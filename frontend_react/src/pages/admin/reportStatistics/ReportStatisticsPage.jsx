import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getReportCharts, getReportOverview } from '../../../services/reportApi'

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

  if (number >= 1000000000) {
    return `${Math.round(number / 1000000000)} tỷ`
  }

  if (number >= 1000000) {
    return `${Math.round(number / 1000000)}tr`
  }

  if (number >= 1000) {
    return `${Math.round(number / 1000)}k`
  }

  return `${number}`
}

const Card = ({ children, className = '' }) => (
  <div
    className={`rounded-[22px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${className}`}
  >
    {children}
  </div>
)

function StatCard({ title, value, description, icon, tone = 'blue' }) {
  const toneClasses = {
    blue: {
      border: 'border-blue-200',
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      ring: 'ring-blue-100',
    },
    green: {
      border: 'border-emerald-200',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      ring: 'ring-emerald-100',
    },
    purple: {
      border: 'border-violet-200',
      text: 'text-violet-600',
      bg: 'bg-violet-50',
      ring: 'ring-violet-100',
    },
    orange: {
      border: 'border-orange-200',
      text: 'text-orange-600',
      bg: 'bg-orange-50',
      ring: 'ring-orange-100',
    },
  }

  const currentTone = toneClasses[tone] || toneClasses.blue

  return (
    <Card className={`p-5 ${currentTone.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-sm font-bold ${currentTone.text}`}>{title}</p>
          <h3 className="mt-3 truncate text-[28px] font-extrabold leading-tight text-slate-950">
            {value}
          </h3>
          <p className="mt-3 text-sm text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${currentTone.bg} text-2xl ring-8 ${currentTone.ring}`}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}

function SelectBox({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={onChange}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  )
}

function ChartHeader({ title, description }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
          Theo tháng
        </span>
        <span className="text-xl leading-none text-slate-400">⋮</span>
      </div>
    </div>
  )
}

function EmptyState({ children }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center text-sm text-slate-500">
      {children}
    </div>
  )
}

function ReportStatisticsPage() {
  const currentYear = new Date().getFullYear()

  const [year, setYear] = useState(currentYear)
  const [overview, setOverview] = useState(null)
  const [charts, setCharts] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const years = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => currentYear - index)
  }, [currentYear])

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
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể tải dữ liệu báo cáo.'
      )
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const revenueChart = charts?.revenue_by_month_chart || []
  const customerChart = charts?.customer_by_month_chart || []
  const topDestinations = charts?.top_destinations || []

  const hasRevenueData = revenueChart.some((item) => Number(item.revenue) > 0)
  const hasCustomerData = customerChart.some(
    (item) => Number(item.total_customers) > 0
  )

  return (
    <div className="min-h-full space-y-5 bg-slate-50/70">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-950">
            Báo cáo & Thống kê
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Theo dõi doanh thu, booking, lượng khách và điểm đến nổi bật.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            <span>⬇</span>
            Xuất báo cáo
          </button>

          <button
            type="button"
            onClick={fetchReports}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            <span>↻</span>
            Làm mới dữ liệu
          </button>
        </div>
      </section>

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 sm:w-[360px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
              📅
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">Khoảng thời gian</p>
              <p className="mt-1 whitespace-nowrap text-sm font-extrabold text-slate-950">
                01/01/{year} - 31/12/{year}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-[220px] lg:ml-auto">
            <SelectBox
              label="Năm"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectBox>
          </div>
        </div>
      </Card>

      {overview?.current_date && (
        <p className="text-xs font-medium text-slate-500">
          Dữ liệu cập nhật ngày: {overview.current_date}
        </p>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <Card className="p-10 text-center text-sm font-semibold text-slate-500">
          Đang tải dữ liệu báo cáo...
        </Card>
      ) : (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Tổng doanh thu năm"
              value={formatCurrency(overview?.total_revenue_year)}
              description={`Năm ${overview?.year || year}`}
              icon="💰"
              tone="blue"
            />

            <StatCard
              title="Tổng số booking"
              value={formatNumber(overview?.total_bookings_year)}
              description="Tất cả booking trong năm"
              icon="📋"
              tone="green"
            />

            <StatCard
              title="Tỉ lệ hoàn thành tour"
              value={`${overview?.tour_completion_rate || 0}%`}
              description="Booking có trạng thái hoàn thành"
              icon="◔"
              tone="purple"
            />

            <StatCard
              title="TB doanh thu/tháng"
              value={formatCurrency(overview?.average_revenue_per_booking_month)}
              description="Trung bình booking đã thanh toán"
              icon="📈"
              tone="orange"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <Card className="p-5">
              <ChartHeader
                title="Doanh thu theo tháng"
                description="Chỉ tính các booking đã thanh toán."
              />

              {hasRevenueData ? (
                <div className="h-[310px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueChart}
                      margin={{ top: 8, right: 12, left: 28, bottom: 4 }}
                    >
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        width={62}
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatCompactMoney}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
                        formatter={(value) => [formatCurrency(value), 'Doanh thu']}
                        contentStyle={{
                          border: '1px solid #E2E8F0',
                          borderRadius: 14,
                          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Doanh thu"
                        fill="#2563EB"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={34}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState>Chưa có dữ liệu doanh thu trong năm này.</EmptyState>
              )}
            </Card>

            <Card className="p-5">
              <ChartHeader
                title="Số lượng khách theo tháng"
                description="Không tính booking đã bị hủy."
              />

              {hasCustomerData ? (
                <div className="h-[310px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={customerChart}
                      margin={{ top: 8, right: 14, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <Tooltip
                        formatter={(value) => [formatNumber(value), 'Số khách']}
                        contentStyle={{
                          border: '1px solid #E2E8F0',
                          borderRadius: 14,
                          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_customers"
                        name="Số khách"
                        stroke="#2563EB"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: '#FFFFFF',
                          stroke: '#2563EB',
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState>Chưa có dữ liệu khách trong năm này.</EmptyState>
              )}
            </Card>
          </section>

          <Card className="p-5">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">
                  Top 5 điểm đến được ưa chuộng
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Xếp hạng theo số lượng booking trong năm {year}.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[760px] border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">#</th>
                    <th className="px-5 py-4">Điểm đến</th>
                    <th className="px-5 py-4">Tỉnh / Thành phố</th>
                    <th className="px-5 py-4">Số booking</th>
                    <th className="px-5 py-4">Số khách</th>
                  </tr>
                </thead>

                <tbody>
                  {topDestinations.length > 0 ? (
                    topDestinations.map((destination, index) => (
                      <tr
                        key={destination.id}
                        className="border-t border-slate-100 text-sm text-slate-700 transition hover:bg-blue-50/40"
                      >
                        <td className="px-5 py-4 font-bold text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-950">
                            {destination.name}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {destination.province_city || 'Chưa cập nhật'}
                        </td>
                        <td className="px-5 py-4 font-semibold">
                          {formatNumber(destination.total_bookings)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-blue-600">
                          {formatNumber(destination.total_tourists)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        Chưa có dữ liệu điểm đến trong năm này.
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
