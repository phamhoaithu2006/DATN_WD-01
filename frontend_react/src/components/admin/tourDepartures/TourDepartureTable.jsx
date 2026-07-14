import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import adminNotificationApi from '../../../services/adminNotificationApi'

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


const ClockIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
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


function getReplacementDepartureId(request) {
  return String(
    request?.tour_departure_id ||
      request?.departure_id ||
      request?.tourDepartureId ||
      ''
  )
}

function getPendingReplacementRequestForDeparture(departure, requests = []) {
  const departureId = String(departure?.id || '')

  if (!departureId) return null

  return (
    requests.find((request) => {
      const status = String(request?.status || 'pending').toLowerCase()

      return getReplacementDepartureId(request) === departureId && status === 'pending'
    }) || null
  )
}

function getReplacementGuideName(request) {
  return (
    request?.current_guide_name ||
    request?.guide_name ||
    request?.current_guide?.user?.full_name ||
    request?.guide?.user?.full_name ||
    `HDV #${request?.current_guide_id || request?.guide_id || ''}`
  )
}

function sortByReplacementRequests(rows = [], requests = []) {
  return [...rows].sort((a, b) => {
    const aHasRequest = getPendingReplacementRequestForDeparture(a, requests) ? 1 : 0
    const bHasRequest = getPendingReplacementRequestForDeparture(b, requests) ? 1 : 0

    if (aHasRequest !== bHasRequest) return bHasRequest - aHasRequest

    return 0
  })
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
      badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
      row: 'bg-emerald-50/70 hover:bg-emerald-100/60',
      border: 'border-l-4 border-emerald-300',
    }
  }

  if (departure.assignment_state === 'blocked') {
    return {
      text: 'Hết HDV phù hợp',
      badge: 'bg-rose-100 text-rose-700 ring-rose-200',
      row: 'bg-rose-50/80 hover:bg-rose-100/60',
      border: 'border-l-4 border-rose-300',
    }
  }

  return {
    text: 'Chưa phân công',
    badge: 'bg-rose-100 text-rose-700 ring-rose-200',
    row: 'bg-rose-50/80 hover:bg-rose-100/60',
    border: 'border-l-4 border-rose-300',
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

function getDateKey(value) {
  if (!value) return ''

  const matchedDate = String(value).match(/^\d{4}-\d{2}-\d{2}/)

  return matchedDate ? matchedDate[0] : ''
}

function getTodayKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDepartureTimeGroup(departure) {
  const scheduleGroup = departure?.schedule_group

  if (['upcoming', 'ongoing', 'past'].includes(scheduleGroup)) {
    return scheduleGroup
  }

  const today = getTodayKey()
  const departureDate = getDateKey(departure?.departure_date)
  const returnDate = getDateKey(departure?.return_date) || departureDate

  if (!departureDate) {
    return 'upcoming'
  }

  if (today < departureDate) {
    return 'upcoming'
  }

  if (today >= departureDate && today <= returnDate) {
    return 'ongoing'
  }

  return 'past'
}

function isLockedDeparture(departure) {
  if (typeof departure?.is_locked === 'boolean') {
    return departure.is_locked
  }

  return getDepartureTimeGroup(departure) !== 'upcoming'
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

function hasAssignedGuide(departure) {
  const leadAssignment = getLeadAssignment(departure)

  return Boolean(leadAssignment || departure?.assignment_state === 'assigned')
}

function isAssignmentWarningTarget(departure) {
  return ['upcoming', 'ongoing'].includes(getDepartureTimeGroup(departure))
}

function sortByAssignmentState(items = []) {
  return [...items].sort((a, b) => {
    const aAssigned = hasAssignedGuide(a) ? 1 : 0
    const bAssigned = hasAssignedGuide(b) ? 1 : 0

    if (aAssigned !== bAssigned) {
      return aAssigned - bAssigned
    }

    const aDate = getDateKey(a?.departure_date)
    const bDate = getDateKey(b?.departure_date)

    if (aDate !== bDate) {
      return aDate.localeCompare(bDate)
    }

    return Number(a?.id || 0) - Number(b?.id || 0)
  })
}

function getAssignmentFilterEmptyText(scheduleFilter, assignmentFilter) {
  if (assignmentFilter === 'unassigned') {
    return 'Không có lịch chưa phân công trong nhóm này.'
  }

  if (assignmentFilter === 'assigned') {
    return 'Không có lịch đã phân công trong nhóm này.'
  }

  if (scheduleFilter === 'ongoing') {
    return 'Không có lịch đang diễn ra.'
  }

  if (scheduleFilter === 'past') {
    return 'Không có lịch đã qua.'
  }

  if (scheduleFilter === 'all') {
    return 'Không có lịch khởi hành.'
  }

  return 'Không có lịch sắp tới.'
}

function parseNotificationData(value) {
  if (!value) return {}

  if (typeof value === 'object') return value

  try {
    return JSON.parse(value)
  } catch (error) {
    return {}
  }
}

function getNotificationList(response) {
  const payload = response?.data ?? response
  const data = payload?.data ?? payload

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data
  if (Array.isArray(payload?.notifications)) return payload.notifications

  return []
}

function isDepartureHistoryNotification(item) {
  const data = parseNotificationData(item?.data)
  const source = data?.source

  if (['tour_departure', 'guide_assignment'].includes(source)) {
    return true
  }

  const text = `${item?.title || ''} ${item?.message || ''}`.toLowerCase()

  return (
    text.includes('lịch khởi hành') ||
    text.includes('phân công') ||
    text.includes('hdv') ||
    text.includes('hướng dẫn')
  )
}

function formatHistoryTime(value) {
  if (!value) return ''

  const date = new Date(String(value).replace(' ', 'T'))

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DepartureHistoryButton() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)

  const unreadItems = items.filter((item) => item.status === 'unread')
  const unreadCount = unreadItems.length

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)

      const response = await adminNotificationApi.getList({
        per_page: 50,
      })

      const list = getNotificationList(response)
        .filter(isDepartureHistoryNotification)
        .slice(0, 30)

      setItems(list)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchHistory()

    const handleChanged = () => {
      void fetchHistory()
    }

    window.addEventListener('focus', handleChanged)
    window.addEventListener('admin-notification:changed', handleChanged)

    return () => {
      window.removeEventListener('focus', handleChanged)
      window.removeEventListener('admin-notification:changed', handleChanged)
    }
  }, [fetchHistory])

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        void closeHistory()
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, unreadItems])

  async function markUnreadAsRead() {
    const ids = unreadItems
      .map((item) => item.id)
      .filter(Boolean)

    if (ids.length === 0) return

    try {
      await Promise.all(
        ids.map((id) => adminNotificationApi.markAsRead(id))
      )

      setItems((current) =>
        current.map((item) =>
          ids.includes(item.id) ? { ...item, status: 'read' } : item
        )
      )

      window.dispatchEvent(new Event('admin-notification:changed'))
    } catch (error) {
      console.error(error)
    }
  }

  async function closeHistory() {
    setOpen(false)
    await markUnreadAsRead()
    await fetchHistory()
  }

  async function toggleHistory() {
    if (open) {
      await closeHistory()
      return
    }

    setOpen(true)
    await fetchHistory()
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={toggleHistory}
        className="relative inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-blue-700"
        title="Xem lịch sử thao tác lịch khởi hành và phân công HDV"
      >
        <ClockIcon />
        Lịch sử thao tác

        {unreadCount > 0 ? (
          <span className="absolute -right-2 -top-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-black leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-3 w-[440px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="font-black text-slate-900">Lịch sử thao tác</h3>
              <p className="text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} thao tác mới`
                  : 'Không có thao tác mới'}
              </p>
            </div>

            <button
              type="button"
              onClick={closeHistory}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
            >
              Đóng
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-3">
            {loading ? (
              <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                Đang tải lịch sử...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                Chưa có lịch sử thao tác.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const unread = item.status === 'unread'

                  return (
                    <article
                      key={item.id}
                      className={`relative rounded-xl border p-3 ${
                        unread
                          ? 'border-rose-200 bg-rose-50/70'
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      {unread ? (
                        <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                          NEW
                        </span>
                      ) : null}

                      <h4 className="pr-14 text-sm font-black text-slate-900">
                        {item.title || 'Thông báo'}
                      </h4>

                      <p className="mt-1 whitespace-pre-line pr-2 text-xs leading-5 text-slate-600">
                        {item.message || item.content || ''}
                      </p>

                      <p className="mt-2 text-[11px] font-bold text-slate-400">
                        {formatHistoryTime(item.created_at)}
                      </p>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function TourDepartureTable({
  departures = [],
  loading = false,
  selectedTourId,
  onDelete,
  onOpenAssignment,
  onViewDetails,
  assignmentWarningCount,
  onRequestEdit,
  activeTab = 'departures',
  scheduleFilter = 'all',
  departuresReady = true,
  onChangeTab,
  onChangeScheduleFilter,
  guideContent,
  assignmentPath = '/admin/tour-departures/guide-assignments',
  replacementRequests = [],
  highlightedReplacementDepartureId = null,
  onApproveReplacementRequest,
  onRejectReplacementRequest,
}) {
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

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
  const isInitialLoading = loading || !departuresReady

  const unassignedDepartureCount = useMemo(() => {
    if (Number.isFinite(Number(assignmentWarningCount))) {
      return Number(assignmentWarningCount)
    }

    return departures.filter(
      (item) => isAssignmentWarningTarget(item) && !hasAssignedGuide(item)
    ).length
  }, [departures, assignmentWarningCount])

  const groupedRows = useMemo(() => {
    const upcomingRows = departures.filter(
      (item) => getDepartureTimeGroup(item) === 'upcoming'
    )

    const ongoingRows = departures.filter(
      (item) => getDepartureTimeGroup(item) === 'ongoing'
    )

    const pastRows = departures.filter(
      (item) => getDepartureTimeGroup(item) === 'past'
    )

    return {
      upcoming: upcomingRows,
      ongoing: ongoingRows,
      past: pastRows,
      all: departures,
    }
  }, [departures])

  const scheduleTabs = useMemo(
    () => [
      { key: 'all', label: 'Tất cả', rows: groupedRows.all },
      { key: 'upcoming', label: 'Sắp tới', rows: groupedRows.upcoming },
      { key: 'ongoing', label: 'Đang diễn ra', rows: groupedRows.ongoing },
      { key: 'past', label: 'Đã qua', rows: groupedRows.past },
    ],
    [groupedRows]
  )

  const renderScheduleTabLabel = (tab) => {
    return `${tab.label} (${tab.rows.length})`
  }

  const scheduleRows = useMemo(() => {
    const rows =
      scheduleTabs.find((tab) => tab.key === scheduleFilter)?.rows ||
      groupedRows.upcoming

    return sortByReplacementRequests(
      sortByAssignmentState(rows),
      replacementRequests
    )
  }, [scheduleTabs, scheduleFilter, groupedRows.upcoming, replacementRequests])

  const assignmentFilterTabs = useMemo(() => {
    const activeRows = scheduleRows.filter((item) =>
      isAssignmentWarningTarget(item)
    )
    const unassignedRows = activeRows.filter((item) => !hasAssignedGuide(item))
    const assignedRows = activeRows.filter((item) => hasAssignedGuide(item))

    return [
      { key: 'all', label: 'Tất cả phân công', rows: scheduleRows },
      { key: 'unassigned', label: 'Chưa phân công', rows: unassignedRows },
      { key: 'assigned', label: 'Đã phân công', rows: assignedRows },
    ]
  }, [scheduleRows])

  const displayedRows = useMemo(() => {
    return (
      assignmentFilterTabs.find((tab) => tab.key === assignmentFilter)?.rows ||
      scheduleRows
    )
  }, [assignmentFilterTabs, assignmentFilter, scheduleRows])

  const totalRows = displayedRows.length
  const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1)
  const safePage = Math.min(currentPage, totalPages)
  const pageStartIndex = (safePage - 1) * pageSize
  const pageEndIndex = pageStartIndex + pageSize
  const paginatedRows = displayedRows.slice(pageStartIndex, pageEndIndex)
  const visibleStart = totalRows === 0 ? 0 : pageStartIndex + 1
  const visibleEnd = Math.min(pageEndIndex, totalRows)
  useEffect(() => {
    setCurrentPage(1)
  }, [scheduleFilter, assignmentFilter, pageSize, activeTab])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

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
            {isInitialLoading
              ? 'Đang tải...'
              : isGuidesTab
                ? 'Phân công HDV'
                : `${visibleStart}-${visibleEnd}/${totalRows} lịch`}
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
            className={`relative inline-flex items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-black transition ${
              isGuidesTab
                ? 'border-slate-200 bg-white text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <GuideIcon />
            Phân công HDV

            {unassignedDepartureCount > 0 ? (
              <span
                className="absolute -right-2 -top-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-black leading-none text-white ring-2 ring-white"
                title={`${unassignedDepartureCount} lịch sắp tới/đang diễn ra chưa phân công`}
              >
                {unassignedDepartureCount > 99 ? '99+' : unassignedDepartureCount}
              </span>
            ) : null}
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
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              {scheduleTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onChangeScheduleFilter?.(tab.key)}
                  className={`w-full rounded-lg px-4 py-2 text-sm font-bold transition ${
                    scheduleFilter === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {renderScheduleTabLabel(tab)}
                </button>
              ))}
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap gap-2">
                {assignmentFilterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setAssignmentFilter(tab.key)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                      assignmentFilter === tab.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label} ({tab.rows.length})
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <DepartureHistoryButton />

                {replacementRequests.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 font-black text-orange-700 ring-1 ring-orange-100">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    {replacementRequests.length} yêu cầu đổi HDV
                  </span>
                ) : null}

                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-bold text-rose-700 ring-1 ring-rose-100">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Chưa phân công
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 ring-1 ring-emerald-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Đã phân công
                </span>
              </div>
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
                  {isInitialLoading ? (
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
                        {getAssignmentFilterEmptyText(
                          scheduleFilter,
                          assignmentFilter
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((item, index) => {
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
                      const replacementRequest = getPendingReplacementRequestForDeparture(
                        item,
                        replacementRequests
                      )
                      const isHighlightedReplacement =
                        highlightedReplacementDepartureId &&
                        String(highlightedReplacementDepartureId) === String(item.id)

                      return (
                        <tr
                          key={item.id}
                          className={`text-slate-700 transition ${
                            replacementRequest
                              ? 'bg-orange-50/80 hover:bg-orange-100/70 border-l-4 border-orange-400'
                              : `${assignmentMeta.row} ${assignmentMeta.border}`
                          } ${locked ? 'text-slate-500' : ''} ${
                            isHighlightedReplacement ? 'ring-2 ring-orange-300 ring-inset' : ''
                          }`}
                        >
                          <td className="px-4 py-4 text-center">
                            {pageStartIndex + index + 1}
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
                              <span className="font-bold text-rose-700">
                                Chưa có HDV
                              </span>
                            )}

                            {replacementRequest ? (
                              <div className="mt-2 inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-200">
                                Có yêu cầu đổi HDV
                              </div>
                            ) : null}
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
                              {replacementRequest ? (
                                <div className="mb-1 flex w-full justify-center">
                                  <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-orange-700 ring-1 ring-orange-200">
                                    Chờ xử lý đổi HDV
                                  </span>
                                </div>
                              ) : null}
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

            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Hiển thị{' '}
                  <strong className="text-slate-900">
                    {visibleStart}-{visibleEnd}
                  </strong>{' '}
                  trên <strong className="text-slate-900">{totalRows}</strong>{' '}
                  lịch
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trước
                </button>

                <span className="inline-flex min-w-[56px] items-center justify-center rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700">
                  {safePage}/{totalPages}
                </span>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
