import { useMemo } from 'react'

function toArray(value) {
  if (Array.isArray(value)) return value

  return []
}

function formatDate(value) {
  if (!value) return '—'

  const raw = String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!raw) return '—'

  const [year, month, day] = raw.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(String(value).replace(' ', 'T'))

  if (Number.isNaN(date.getTime())) return formatDate(value)

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—'

  const number = Number(value)

  if (Number.isNaN(number)) return String(value)

  return `${number.toLocaleString('vi-VN')}đ`
}

function getDepartureId(departure, payload) {
  return (
    departure?.id ||
    payload?.departure?.id ||
    payload?.tour_departure?.id ||
    payload?.tourDeparture?.id ||
    payload?.id ||
    null
  )
}

function getTourTitle(departure, payload) {
  return (
    departure?.tour?.title ||
    departure?.tour_title ||
    payload?.departure?.tour?.title ||
    payload?.tour_departure?.tour?.title ||
    payload?.tour?.title ||
    `Lịch khởi hành #${getDepartureId(departure, payload) || ''}`
  )
}

function getAssignments(departure = {}) {
  if (Array.isArray(departure?.assigned_guides)) return departure.assigned_guides
  if (Array.isArray(departure?.guide_assignments)) return departure.guide_assignments
  if (Array.isArray(departure?.guideAssignments)) return departure.guideAssignments

  return []
}

function getLeadAssignment(departure = {}) {
  const activeAssignments = getAssignments(departure).filter(
    (assignment) => !assignment.status || assignment.status === 'assigned',
  )

  return (
    activeAssignments.find((assignment) => assignment.role === 'lead' || !assignment.role) ||
    activeAssignments[0] ||
    null
  )
}

function getGuideName(assignment) {
  if (!assignment) return ''

  return (
    assignment?.guide?.user?.full_name ||
    assignment?.guide?.user?.name ||
    assignment?.guide_name ||
    assignment?.user?.full_name ||
    assignment?.user?.name ||
    assignment?.guide?.guide_code ||
    `HDV #${assignment?.guide_id || assignment?.guide?.id || ''}`
  )
}

function getDetailDeparture(propDeparture, payload) {
  return (
    propDeparture ||
    payload?.departure ||
    payload?.tour_departure ||
    payload?.tourDeparture ||
    payload?.data?.departure ||
    null
  )
}

function normalizeCustomers(payload) {
  const possibleCollections = [
    payload?.customers?.data,
    payload?.customers,
    payload?.bookings?.data,
    payload?.bookings,
    payload?.participants?.data,
    payload?.participants,
    payload?.data?.data,
    payload?.data,
  ]

  for (const collection of possibleCollections) {
    if (Array.isArray(collection)) return collection
  }

  return []
}

function getMeta(payload) {
  return (
    payload?.customers?.meta ||
    payload?.bookings?.meta ||
    payload?.participants?.meta ||
    payload?.meta ||
    payload?.customers ||
    payload?.bookings ||
    payload?.participants ||
    payload?.data ||
    {}
  )
}

function getCustomerName(item) {
  return (
    item?.participant?.full_name ||
    item?.participant?.name ||
    item?.customer?.full_name ||
    item?.customer?.name ||
    item?.full_name ||
    item?.name ||
    item?.user?.full_name ||
    item?.user?.name ||
    'Khách hàng'
  )
}

function getCustomerPhone(item) {
  return (
    item?.participant?.phone ||
    item?.customer?.phone ||
    item?.phone ||
    item?.user?.phone ||
    ''
  )
}

function getCustomerEmail(item) {
  return (
    item?.participant?.email ||
    item?.customer?.email ||
    item?.email ||
    item?.user?.email ||
    ''
  )
}

function getBookingCode(item) {
  return item?.booking?.booking_code || item?.booking_code || item?.code || item?.id || ''
}

function getStatusText(status) {
  const value = String(status || '').toLowerCase()

  if (value === 'paid') return 'Đã thanh toán'
  if (value === 'confirmed') return 'Đã xác nhận'
  if (value === 'pending') return 'Chờ xử lý'
  if (value === 'cancelled' || value === 'canceled') return 'Đã hủy'

  return status || '—'
}

function getStatusClass(status) {
  const value = String(status || '').toLowerCase()

  if (['paid', 'confirmed'].includes(value)) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  }

  if (['cancelled', 'canceled'].includes(value)) {
    return 'bg-rose-50 text-rose-700 ring-rose-100'
  }

  return 'bg-amber-50 text-amber-700 ring-amber-100'
}

function DetailStat({ label, value, tone = 'slate' }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    slate: 'bg-slate-50 text-slate-700 ring-slate-100',
  }[tone]

  return (
    <div className={`rounded-2xl p-4 ring-1 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  )
}

function TourDepartureBookingModal({
  open = false,
  loading = false,
  error = '',
  payload = null,
  departure: propDeparture = null,
  onClose,
  onPageChange,
  onOpenAssignment,
}) {
  const departure = useMemo(
    () => getDetailDeparture(propDeparture, payload),
    [propDeparture, payload],
  )

  const customers = useMemo(() => normalizeCustomers(payload), [payload])
  const meta = useMemo(() => getMeta(payload), [payload])
  const leadAssignment = getLeadAssignment(departure || {})

  const departureId = getDepartureId(departure, payload)
  const totalSlots = Number(departure?.total_slots || payload?.total_slots || 0)
  const bookedSlots = Number(
    departure?.booked_slots ??
      payload?.booked_slots ??
      meta?.total ??
      customers.length ??
      0,
  )
  const remainingSlots = Math.max(totalSlots - bookedSlots, 0)
  const assignmentButtonText = leadAssignment ? 'Đổi HDV' : 'Phân công HDV'

  const currentPage = Number(meta?.current_page || 1)
  const lastPage = Number(meta?.last_page || 1)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-10 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              Chi tiết lịch khởi hành
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {getTourTitle(departure, payload)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatDate(departure?.departure_date || payload?.departure_date)} –{' '}
              {formatDate(
                departure?.return_date ||
                  payload?.return_date ||
                  departure?.departure_date ||
                  payload?.departure_date,
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {typeof onOpenAssignment === 'function' && departureId ? (
              <button
                type="button"
                onClick={() => onOpenAssignment(departureId)}
                className={`rounded-xl px-4 py-2 text-sm font-black text-white shadow-sm transition ${
                  leadAssignment
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {assignmentButtonText}
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-200"
            >
              Đóng
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailStat label="Tổng chỗ" value={totalSlots || '—'} tone="blue" />
            <DetailStat label="Đã đặt" value={bookedSlots} tone="emerald" />
            <DetailStat label="Còn lại" value={remainingSlots} tone="amber" />
            <DetailStat
              label="HDV phụ trách"
              value={leadAssignment ? getGuideName(leadAssignment) : 'Chưa có'}
              tone={leadAssignment ? 'emerald' : 'slate'}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">Thông tin lịch</p>

              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <p>
                  <span className="font-bold text-slate-800">Ngày đi:</span>{' '}
                  {formatDate(departure?.departure_date || payload?.departure_date)}
                </p>
                <p>
                  <span className="font-bold text-slate-800">Ngày về:</span>{' '}
                  {formatDate(
                    departure?.return_date ||
                      payload?.return_date ||
                      departure?.departure_date ||
                      payload?.departure_date,
                  )}
                </p>
                <p>
                  <span className="font-bold text-slate-800">Giá:</span>{' '}
                  {formatMoney(
                    departure?.discount_price ||
                      departure?.base_price ||
                      departure?.price ||
                      payload?.price,
                  )}
                </p>
                <p>
                  <span className="font-bold text-slate-800">Thời điểm tạo:</span>{' '}
                  {formatDateTime(departure?.created_at || payload?.created_at)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">Phân công HDV</p>

              {leadAssignment ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 text-sm">
                  <p className="font-black text-emerald-800">
                    {getGuideName(leadAssignment)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {leadAssignment?.guide?.guide_code ||
                      leadAssignment?.guide_code ||
                      `HDV #${leadAssignment?.guide_id || ''}`}
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-rose-200 bg-white p-3 text-sm font-bold text-rose-700">
                  Lịch này chưa có HDV. Bấm “Phân công HDV” để chọn hướng dẫn viên.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="font-black text-slate-950">Khách đã đặt</h3>
                <p className="text-sm text-slate-500">
                  Danh sách khách/đơn đặt tour của lịch khởi hành này.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {bookedSlots} lượt đặt
              </span>
            </div>

            {loading ? (
              <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                Đang tải danh sách khách đặt...
              </div>
            ) : customers.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                Chưa có khách đặt tour này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Liên hệ</th>
                      <th className="px-4 py-3">Mã đặt</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((item, index) => {
                      const status =
                        item?.booking?.status ||
                        item?.status ||
                        item?.payment_status ||
                        ''

                      return (
                        <tr key={item?.id || `${getCustomerName(item)}-${index}`}>
                          <td className="px-4 py-3">
                            <p className="font-black text-slate-900">
                              {getCustomerName(item)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <p>{getCustomerPhone(item) || 'Chưa có SĐT'}</p>
                            <p className="text-xs text-slate-400">
                              {getCustomerEmail(item) || 'Chưa có email'}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-700">
                            {getBookingCode(item) || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${getStatusClass(status)}`}
                            >
                              {getStatusText(status)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {lastPage > 1 ? (
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange?.(currentPage - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-sm font-bold text-slate-600">
                  {currentPage}/{lastPage}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= lastPage}
                  onClick={() => onPageChange?.(currentPage + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}

export default TourDepartureBookingModal