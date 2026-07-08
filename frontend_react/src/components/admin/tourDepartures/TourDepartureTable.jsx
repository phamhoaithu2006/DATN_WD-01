import { Link } from 'react-router-dom'

const GuideIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c.8-4.1 3.4-6 8-6s7.2 1.9 8 6" />
  </svg>
)

const DetailIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
)

const EditIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

const TrashIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
)

function formatDate(value) {
  if (!value) return '-'

  const rawDate = String(value).slice(0, 10)
  const date = new Date(`${rawDate}T00:00:00`)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(String(value).replace(' ', 'T'))

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(price) {
  if (price === null || price === undefined || price === '') {
    return '-'
  }

  const numberPrice = Number(price)

  if (Number.isNaN(numberPrice)) return '-'

  return `${numberPrice.toLocaleString('vi-VN')}đ`
}

function getAssignments(departure) {
  if (Array.isArray(departure.assigned_guides)) {
    return departure.assigned_guides
  }

  if (Array.isArray(departure.guide_assignments)) {
    return departure.guide_assignments
  }

  if (Array.isArray(departure.guideAssignments)) {
    return departure.guideAssignments
  }

  return []
}

function getLeadAssignment(departure) {
  const assignments = getAssignments(departure)

  const activeAssignments = assignments.filter(
    (assignment) =>
      !assignment.status || assignment.status === 'assigned'
  )

  return (
    activeAssignments.find(
      (assignment) => assignment.role === 'lead' || !assignment.role
    ) ||
    activeAssignments[0] ||
    null
  )
}

function getGuideName(assignment) {
  if (!assignment) return ''

  return (
    assignment.guide?.user?.full_name ||
    assignment.guide?.user?.name ||
    assignment.guide_name ||
    assignment.user?.full_name ||
    assignment.user?.name ||
    assignment.guide?.guide_code ||
    `HDV #${assignment.guide_id || assignment.guide?.id || ''}`
  )
}

function getStatusMeta(status) {
  const map = {
    open: {
      text: 'Đang mở',
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
    closed: {
      text: 'Đã đóng',
      badge: 'bg-slate-100 text-slate-700 ring-slate-200',
    },
    completed: {
      text: 'Hoàn thành',
      badge: 'bg-sky-50 text-sky-700 ring-sky-100',
    },
    cancelled: {
      text: 'Đã hủy',
      badge: 'bg-rose-50 text-rose-700 ring-rose-100',
    },
  }

  return (
    map[status] || {
      text: status || 'Không rõ',
      badge: 'bg-gray-50 text-gray-700 ring-gray-200',
    }
  )
}

function getAssignmentMeta(departure) {
  const leadAssignment = getLeadAssignment(departure)

  if (leadAssignment || departure.assignment_state === 'assigned') {
    return {
      text: 'Đã phân công',
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      row: 'bg-emerald-50/25',
    }
  }

  if (departure.assignment_state === 'blocked') {
    return {
      text: 'Hết HDV phù hợp',
      badge: 'bg-rose-50 text-rose-700 ring-rose-100',
      row: 'bg-rose-50/25',
    }
  }

  return {
    text: 'Chưa phân công',
    badge: 'bg-amber-50 text-amber-700 ring-amber-100',
    row: 'bg-amber-50/20',
  }
}

function getRemainSlotClass(remainSlots) {
  if (remainSlots <= 0) {
    return 'text-rose-600 bg-rose-50 ring-rose-100'
  }

  if (remainSlots <= 5) {
    return 'text-amber-600 bg-amber-50 ring-amber-100'
  }

  return 'text-emerald-600 bg-emerald-50 ring-emerald-100'
}

function isLockedDeparture(departure) {
  if (typeof departure?.is_locked === 'boolean') {
    return departure.is_locked
  }

  if (departure?.schedule_group === 'past') {
    return true
  }

  if (!departure?.departure_date) {
    return false
  }

  const departureDate = new Date(
    `${String(departure.departure_date).slice(0, 10)}T00:00:00`
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return departureDate <= today
}

function getBookingCount(departure) {
  return Number(
    departure?.active_bookings_count ??
      departure?.bookings_count ??
      departure?.bookings?.length ??
      departure?.booked_slots ??
      0
  )
}

function hasActiveBookings(departure) {
  if (typeof departure?.has_bookings === 'boolean') {
    return departure.has_bookings
  }

  return getBookingCount(departure) > 0
}

export default function TourDepartureTable({
  departures = [],
  loading = false,
  selectedTourId,
  onDelete,
  onOpenAssignment,
  onViewDetails,
  onRequestEdit,
  activeTab = 'departures',
  scheduleFilter = 'upcoming',
  onChangeTab,
  onChangeScheduleFilter,
  guideContent,
  assignmentPath = '/admin/tour-departures/guide-assignments',
}) {
  const getEditLink = (departureId) => {
    if (selectedTourId) {
      return `/admin/tour-departures/${selectedTourId}/edit/${departureId}`
    }

    return `/admin/tour-departures/edit/${departureId}`
  }

  const getAssignmentLink = (departureId) => {
    const params = new URLSearchParams()

    if (selectedTourId) params.set('tourId', selectedTourId)
    if (departureId) params.set('departureId', departureId)

    const query = params.toString()

    return query ? `${assignmentPath}?${query}` : assignmentPath
  }

  const isDeparturesTab = activeTab === 'departures'
  const isGuidesTab = activeTab === 'guides'

  const upcomingRows = departures.filter(
    (item) => !isLockedDeparture(item)
  )

  const pastRows = departures.filter((item) =>
    isLockedDeparture(item)
  )

  const displayedRows =
    scheduleFilter === 'past'
      ? pastRows
      : scheduleFilter === 'all'
        ? departures
        : upcomingRows

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              {isGuidesTab
                ? 'Phân công hướng dẫn viên'
                : 'Danh sách lịch khởi hành'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {isGuidesTab
                ? 'Tự động chọn hướng dẫn viên phù hợp cho từng lịch khởi hành.'
                : 'Quản lý lịch khởi hành, số chỗ và trạng thái phân công HDV.'}
            </p>
          </div>

          <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">
            {isGuidesTab
              ? 'Phân công HDV'
              : `${displayedRows.length}/${departures.length} lịch`}
          </div>
        </div>

        <div className="-mb-px flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChangeTab?.('departures')}
            className={`rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-black transition ${
              isDeparturesTab
                ? 'border-slate-200 bg-white text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Lịch khởi hành
          </button>

          <button
            type="button"
            onClick={() => onChangeTab?.('guides')}
            className={`inline-flex items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-black transition ${
              isGuidesTab
                ? 'border-slate-200 bg-white text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <GuideIcon />
            Phân công HDV
          </button>
        </div>
      </div>

      <div className="p-5">
        {isGuidesTab ? (
          guideContent || (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Không có dữ liệu phân công.
            </div>
          )
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onChangeScheduleFilter?.('upcoming')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  scheduleFilter === 'upcoming'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sắp tới ({upcomingRows.length})
              </button>

              <button
                type="button"
                onClick={() => onChangeScheduleFilter?.('past')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  scheduleFilter === 'past'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đã bắt đầu / đã qua ({pastRows.length})
              </button>

              <button
                type="button"
                onClick={() => onChangeScheduleFilter?.('all')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  scheduleFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({departures.length})
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1500px] text-sm">
                <thead className="bg-slate-50 text-center text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="border-b px-4 py-4">STT</th>
                    <th className="border-b px-4 py-4 text-left">Ngày đi</th>
                    <th className="border-b px-4 py-4 text-left">Ngày về</th>
                    <th className="border-b px-4 py-4 text-left">Thời điểm tạo</th>
                    <th className="border-b px-4 py-4 text-right">Giá</th>
                    <th className="border-b px-4 py-4">Tổng chỗ</th>
                    <th className="border-b px-4 py-4">Đã đặt</th>
                    <th className="border-b px-4 py-4">Còn lại</th>
                    <th className="border-b px-4 py-4 text-left">HDV phụ trách</th>
                    <th className="border-b px-4 py-4">Phân công</th>
                    <th className="border-b px-4 py-4">Trạng thái</th>
                    <th className="border-b px-4 py-4">Hành động</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="12"
                        className="px-4 py-14 text-center text-slate-500"
                      >
                        Đang tải lịch khởi hành...
                      </td>
                    </tr>
                  ) : displayedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan="12"
                        className="px-4 py-14 text-center text-slate-500"
                      >
                        {scheduleFilter === 'past'
                          ? 'Không có lịch đã bắt đầu hoặc đã qua.'
                          : 'Không có lịch khởi hành phù hợp.'}
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((item, index) => {
                      const totalSlots = Number(item.total_slots || 0)
                      const bookedSlots = Number(item.booked_slots || 0)
                      const remainSlots = Math.max(
                        totalSlots - bookedSlots,
                        0
                      )

                      const assignmentMeta = getAssignmentMeta(item)
                      const statusMeta = getStatusMeta(item.status)
                      const leadAssignment = getLeadAssignment(item)

                      const locked = isLockedDeparture(item)
                      const booked = hasActiveBookings(item)
                      const bookingCount = getBookingCount(item)

                      return (
                        <tr
                          key={item.id}
                          className={`text-slate-700 ${
                            locked
                              ? 'bg-slate-50 text-slate-500'
                              : assignmentMeta.row
                          }`}
                        >
                          <td className="px-4 py-4 text-center">
                            {index + 1}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {formatDate(item.departure_date)}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {formatDate(
                              item.return_date || item.departure_date
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {formatDateTime(item.created_at)}
                          </td>

                          <td className="px-4 py-4 text-right font-bold">
                            {item.discount_price
                              ? formatPrice(item.discount_price)
                              : formatPrice(
                                  item.base_price ?? item.price
                                )}
                          </td>

                          <td className="px-4 py-4 text-center">
                            {totalSlots}
                          </td>

                          <td className="px-4 py-4 text-center">
                            {bookedSlots}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex min-w-[54px] justify-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${getRemainSlotClass(
                                remainSlots
                              )}`}
                            >
                              {remainSlots}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            {leadAssignment ? (
                              <div>
                                <p className="font-bold text-slate-900">
                                  {getGuideName(leadAssignment)}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {leadAssignment.guide?.guide_code ||
                                    'HDV chính'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-500">
                                Chưa có HDV
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${assignmentMeta.badge}`}
                            >
                              {assignmentMeta.text}
                            </span>

                            {booked ? (
                              <p className="mt-1 text-[11px] font-medium text-slate-500">
                                {bookingCount} khách/đơn đặt
                              </p>
                            ) : null}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusMeta.badge}`}
                            >
                              {statusMeta.text}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-wrap justify-center gap-2">
                              {typeof onViewDetails === 'function' ? (
                                <button
                                  type="button"
                                  onClick={() => onViewDetails(item.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700"
                                >
                                  <DetailIcon />
                                  Chi tiết
                                </button>
                              ) : null}

                              {locked ? (
                                <span className="inline-flex items-center rounded-lg bg-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
                                  Đã khóa
                                </span>
                              ) : (
                                <>
                                  {typeof onOpenAssignment ===
                                  'function' ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onOpenAssignment(item.id)
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700"
                                    >
                                      <GuideIcon />
                                      {leadAssignment
                                        ? 'Xem HDV'
                                        : 'Phân HDV'}
                                    </button>
                                  ) : (
                                    <Link
                                      to={getAssignmentLink(item.id)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700"
                                    >
                                      <GuideIcon />
                                      Phân HDV
                                    </Link>
                                  )}

                                  {typeof onRequestEdit ===
                                  'function' ? (
                                    <button
                                      type="button"
                                      title={
                                        booked
                                          ? 'Lịch đã có khách đặt, cần xác nhận trước khi sửa.'
                                          : 'Sửa lịch khởi hành'
                                      }
                                      onClick={() => onRequestEdit(item)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700"
                                    >
                                      <EditIcon />
                                      Sửa
                                    </button>
                                  ) : (
                                    <Link
                                      to={getEditLink(item.id)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700"
                                    >
                                      <EditIcon />
                                      Sửa
                                    </Link>
                                  )}

                                  {typeof onDelete === 'function' ? (
                                    <button
                                      type="button"
                                      onClick={() => onDelete(item)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                                    >
                                      <TrashIcon />
                                      Xóa
                                    </button>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}