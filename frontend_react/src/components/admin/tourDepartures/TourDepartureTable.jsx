import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
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

const MoreIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
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
  const isCancelled = ['cancelled', 'canceled'].includes(String(departure?.status || '').toLowerCase())
    || String(departure?.schedule_group || '').toLowerCase() === 'cancelled'

  const activeAssignments = assignments.filter(
    (assignment) =>
      isCancelled
        ? assignment.status === 'cancelled'
        : !assignment.status || ['assigned', 'confirmed'].includes(assignment.status)
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

function sortByReplacementRequests(rows = [], requests = []) {
  return [...rows].sort((a, b) => {
    const aHasRequest = getPendingReplacementRequestForDeparture(a, requests) ? 1 : 0
    const bHasRequest = getPendingReplacementRequestForDeparture(b, requests) ? 1 : 0

    if (aHasRequest !== bHasRequest) return bHasRequest - aHasRequest

    return 0
  })
}

function getTourTitle(departure) {
  return (
    departure?.tour?.title ||
    departure?.tour?.name ||
    departure?.tour_title ||
    departure?.tour_name ||
    departure?.name_tour ||
    `Tour #${departure?.tour_id || departure?.tour?.id || ''}`
  )
}

function getBookedGuestCount(departure) {
  return Number(
    departure?.booked_slots ??
      departure?.booked_guests_count ??
      departure?.participants_count ??
      departure?.active_participants_count ??
      0
  )
}

function getDaysUntilDeparture(departure) {
  const departureDate = getDateKey(departure?.departure_date)

  if (!departureDate) return null

  const today = new Date(`${getTodayKey()}T00:00:00`)
  const target = new Date(`${departureDate}T00:00:00`)

  if (Number.isNaN(today.getTime()) || Number.isNaN(target.getTime())) {
    return null
  }

  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function isMinimumGuestWarning(departure) {
  if (getDepartureTimeGroup(departure) !== 'upcoming') return false

  const daysUntilDeparture = getDaysUntilDeparture(departure)

  if (daysUntilDeparture === null || daysUntilDeparture < 0 || daysUntilDeparture > 3) {
    return false
  }

  return getBookedGuestCount(departure) < 10
}

function getStatusMeta(departure) {
  const status = String(departure?.status || '').toLowerCase()
  const daysUntilDeparture = getDaysUntilDeparture(departure)
  const isOpen = status === 'open'
    && getDepartureTimeGroup(departure) === 'upcoming'
    && daysUntilDeparture !== null
    && daysUntilDeparture > 3

  return isOpen
    ? { text: 'Mở', badge: 'text-emerald-700' }
    : { text: 'Đóng', badge: 'text-slate-600' }
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
  const status = String(departure?.status || '').toLowerCase()

  // Trạng thái kết thúc nghiệp vụ luôn được ưu tiên.
  if (status === 'cancelled' || status === 'canceled') return 'cancelled'
  if (status === 'completed') return 'completed'

  // Các lịch còn hoạt động phải được phân loại theo ngày thực tế.
  // Tránh trường hợp API còn status="open" nhưng ngày đã qua mà UI vẫn hiện "Sắp tới".
  const today = getTodayKey()
  const departureDate = getDateKey(departure?.departure_date)
  const returnDate = getDateKey(departure?.return_date) || departureDate

  if (departureDate) {
    if (today < departureDate) return 'upcoming'
    if (today >= departureDate && today <= returnDate) return 'ongoing'
    return 'completed'
  }

  // Chỉ fallback về dữ liệu backend khi không có ngày hợp lệ.
  const scheduleGroup = String(departure?.schedule_group || '').toLowerCase()

  if (scheduleGroup === 'past') return 'completed'
  if (['upcoming', 'ongoing', 'completed', 'cancelled'].includes(scheduleGroup)) {
    return scheduleGroup
  }

  if (status === 'closed') return 'ongoing'
  return 'upcoming'
}

function isLockedDeparture(departure) {
  const group = getDepartureTimeGroup(departure)

  return group === 'ongoing' || group === 'completed' || group === 'cancelled'
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
  if (getDepartureTimeGroup(departure) === 'cancelled') return false
  const leadAssignment = getLeadAssignment(departure)

  return Boolean(leadAssignment || departure?.assignment_state === 'assigned')
}

function isAssignmentWarningTarget(departure) {
  if (typeof departure?.is_missing_guide_warning === 'boolean') {
    return departure.is_missing_guide_warning
  }

  const daysUntilDeparture = getDaysUntilDeparture(departure)

  return getDepartureTimeGroup(departure) === 'upcoming'
    && daysUntilDeparture !== null
    && daysUntilDeparture >= 1
    && daysUntilDeparture <= 3
}

function compareDepartureDateNearestFirst(a, b) {
  const parsedACreatedAt = new Date(a?.updated_at || a?.created_at || 0).getTime()
  const parsedBCreatedAt = new Date(b?.updated_at || b?.created_at || 0).getTime()
  const aCreatedAt = Number.isFinite(parsedACreatedAt) ? parsedACreatedAt : 0
  const bCreatedAt = Number.isFinite(parsedBCreatedAt) ? parsedBCreatedAt : 0

  if (aCreatedAt !== bCreatedAt) {
    return bCreatedAt - aCreatedAt
  }

  const idCompare = Number(b?.id || 0) - Number(a?.id || 0)

  if (idCompare !== 0) {
    return idCompare
  }

  const aDate = getDateKey(a?.departure_date) || '0000-00-00'
  const bDate = getDateKey(b?.departure_date) || '0000-00-00'

  /* Lịch khởi hành gần hơn được ưu tiên hiển thị ở đầu danh sách. */
  if (aDate !== bDate) {
    return aDate.localeCompare(bDate)
  }

  const aReturnDate = getDateKey(a?.return_date) || aDate
  const bReturnDate = getDateKey(b?.return_date) || bDate

  if (aReturnDate !== bReturnDate) {
    return aReturnDate.localeCompare(bReturnDate)
  }

  return 0
}

function sortByAssignmentState(items = []) {
  return [...items].sort((a, b) => {
    const dateCompare = compareDepartureDateNearestFirst(a, b)

    if (dateCompare !== 0) {
      return dateCompare
    }

    const aAssigned = hasAssignedGuide(a) ? 1 : 0
    const bAssigned = hasAssignedGuide(b) ? 1 : 0

    if (aAssigned !== bAssigned) {
      return aAssigned - bAssigned
    }

    return Number(b?.id || 0) - Number(a?.id || 0)
  })
}

function sortMinimumGuestWarningsFirst(items = []) {
  return [...items].sort((a, b) => {
    const aWarning = isMinimumGuestWarning(a) ? 1 : 0
    const bWarning = isMinimumGuestWarning(b) ? 1 : 0

    return bWarning - aWarning
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

  if (scheduleFilter === 'completed') {
    return 'Không có lịch đã hoàn thành.'
  }

  if (scheduleFilter === 'cancelled') {
    return 'Không có lịch đã hủy.'
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
  } catch {
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
  const source = String(data?.source || '').toLowerCase()
  const type = String(data?.type || '').toLowerCase()
  const action = String(data?.action || '').toLowerCase()

  if (
    source === 'guide_leave_request' ||
    type === 'guide_leave_request' ||
    data?.guide_leave_request_id ||
    data?.leave_request_id
  ) {
    return false
  }

  if (
    source === 'guide_replacement_request' ||
    type === 'guide_replacement_request'
  ) {
    return ['approved', 'rejected'].includes(action)
  }

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
      return list
    } catch (error) {
      console.error(error)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const closeHistoryForEffect = useEffectEvent(closeHistory)

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
        void closeHistoryForEffect()
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, unreadItems])

  async function markUnreadAsRead(sourceItems = unreadItems) {
    const ids = sourceItems
      .filter((item) => item.status === 'unread')
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
    const latestItems = await fetchHistory()
    await markUnreadAsRead(latestItems)
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
        Timeline

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
  onCancel,
  onOpenAssignment,
  onViewDetails,
  onRequestEdit,
  activeTab = 'departures',
  scheduleFilter = 'upcoming',
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
  const [pageSize, setPageSize] = useState(10)
  const [openActionMenuId, setOpenActionMenuId] = useState(null)

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

  const groupedRows = useMemo(() => {
    const upcomingRows = departures.filter(
      (item) => getDepartureTimeGroup(item) === 'upcoming'
    )

    const ongoingRows = departures.filter(
      (item) => getDepartureTimeGroup(item) === 'ongoing'
    )

    const completedRows = departures.filter(
      (item) => getDepartureTimeGroup(item) === 'completed'
    )

    const cancelledRows = departures.filter(
      (item) => getDepartureTimeGroup(item) === 'cancelled'
    )

    return {
      upcoming: upcomingRows,
      ongoing: ongoingRows,
      completed: completedRows,
      cancelled: cancelledRows,
      all: departures,
    }
  }, [departures])

  const scheduleTabs = useMemo(
    () => [
      { key: 'upcoming', label: 'Sắp tới', rows: groupedRows.upcoming },
      { key: 'ongoing', label: 'Đang diễn ra', rows: groupedRows.ongoing },
      { key: 'completed', label: 'Đã hoàn thành', rows: groupedRows.completed },
      { key: 'cancelled', label: 'Đã hủy', rows: groupedRows.cancelled },
      { key: 'all', label: 'Tất cả', rows: groupedRows.all },
    ],
    [groupedRows]
  )

  const scheduleRows = useMemo(() => {
    const rows =
      scheduleTabs.find((tab) => tab.key === scheduleFilter)?.rows ||
      groupedRows.upcoming

    return sortByAssignmentState(
      sortMinimumGuestWarningsFirst(
        sortByReplacementRequests(rows, replacementRequests)
      )
    )
  }, [scheduleTabs, scheduleFilter, groupedRows.upcoming, replacementRequests])

  const assignmentFilterTabs = useMemo(() => {
    /*
     * Bộ lọc phân công phải áp dụng trên TOÀN BỘ dữ liệu của tab trạng thái
     * đang chọn (Sắp tới / Đang diễn ra / Đã hoàn thành / Đã hủy / Tất cả).
     *
     * Trước đây chỉ lấy upcoming + ongoing nên ở tab "Đã hoàn thành"
     * dropdown luôn hiển thị Chưa phân công (0) / Đã phân công (0)
     * dù tab đang có nhiều lịch.
     */
    const unassignedRows = scheduleRows.filter(
      (item) => !hasAssignedGuide(item)
    )

    const assignedRows = scheduleRows.filter(
      (item) => hasAssignedGuide(item)
    )

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
    setOpenActionMenuId(null)
  }, [scheduleFilter, assignmentFilter, pageSize, activeTab])

  useEffect(() => {
    setAssignmentFilter('all')
  }, [scheduleFilter])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useEffect(() => {
    if (!openActionMenuId) return undefined

    const closeMenu = () => setOpenActionMenuId(null)

    document.addEventListener('mousedown', closeMenu)

    return () => {
      document.removeEventListener('mousedown', closeMenu)
    }
  }, [openActionMenuId])

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
                ? 'Phân công hoặc đổi hướng dẫn viên cho lịch khởi hành được chọn.'
                : 'Quản lý lịch khởi hành, số chỗ và trạng thái phân công HDV.'}
            </p>
          </div>

          <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">
            {isGuidesTab
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

          {isGuidesTab ? (
            <button
              type="button"
              onClick={() => onChangeTab?.('guides')}
              className="relative inline-flex items-center gap-2 rounded-t-xl border border-b-0 border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-blue-600 transition"
            >
              <GuideIcon />
              Phân công HDV
            </button>
          ) : null}
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {scheduleTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onChangeScheduleFilter?.(tab.key)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                      scheduleFilter === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label} ({tab.rows.length})
                  </button>
                ))}
              </div>

            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
              <label className="flex w-full max-w-[240px] items-center rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-bold text-slate-600 shadow-sm sm:w-auto">
                <select
                  value={assignmentFilter}
                  onChange={(event) => setAssignmentFilter(event.target.value)}
                  className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {assignmentFilterTabs.map((tab) => (
                    <option key={tab.key} value={tab.key}>
                      {tab.label} ({tab.rows.length})
                    </option>
                  ))}
                </select>
              </label>

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
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

            <div
              className={`overflow-x-auto rounded-xl border border-slate-200 transition-[padding] duration-200 ${
                openActionMenuId ? 'pb-72' : ''
              }`}
            >
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="bg-slate-50 text-center text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="border-b px-4 py-4">STT</th>
                    <th className="border-b px-4 py-4 text-left">Tên tour</th>
                    <th className="border-b px-4 py-4 text-left">Ngày đi</th>
                    <th className="border-b px-4 py-4 text-left">Ngày về</th>
                    <th className="border-b px-4 py-4 text-right">Giá</th>
                    <th className="border-b px-4 py-4">Đặt</th>
                    <th className="border-b px-4 py-4">HDV phụ trách</th>
                    <th className="border-b px-4 py-4">Trạng thái</th>
                    <th className="border-b px-4 py-4">Hành động</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-4 py-14 text-center text-slate-500"
                      >
                        Đang tải lịch khởi hành...
                      </td>
                    </tr>
                  ) : displayedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
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
                      const bookedGuestCount = getBookedGuestCount(item)
                      const minimumGuestWarning = isMinimumGuestWarning(item)
                      const daysUntilDeparture = getDaysUntilDeparture(item)
                      const tourTitle = getTourTitle(item)
                      const missingGuideWarning = isAssignmentWarningTarget(item) && !hasAssignedGuide(item)
                      const statusMeta = getStatusMeta(item)
                      const leadAssignment = getLeadAssignment(item)

                      const locked = isLockedDeparture(item)
                      const booked = hasActiveBookings(item)
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
                            missingGuideWarning || minimumGuestWarning
                              ? 'border-l-4 border-rose-500 bg-rose-50/90 hover:bg-rose-100/80'
                              : replacementRequest
                                ? 'bg-orange-50/80 hover:bg-orange-100/70 border-l-4 border-orange-400'
                                : 'bg-white hover:bg-slate-50'
                          } ${locked ? 'text-slate-500' : ''} ${
                            isHighlightedReplacement ? 'ring-2 ring-orange-300 ring-inset' : ''
                          }`}
                        >
                          <td className="px-4 py-4 text-center">
                            {pageStartIndex + index + 1}
                          </td>

                          <td className="min-w-[230px] px-4 py-4 text-left align-top">
                            <p className="font-black leading-5 text-slate-950">
                              {tourTitle}
                            </p>

                            {minimumGuestWarning ? (
                              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-100 px-2.5 py-2 text-[11px] font-bold leading-4 text-rose-700">
                                <span className="block font-black">
                                  Không đủ số lượng tối thiểu
                                </span>
                                <span>
                                  Hiện có {bookedGuestCount}/10 khách
                                  {daysUntilDeparture !== null
                                    ? ` · Còn ${daysUntilDeparture} ngày`
                                    : ''}
                                </span>
                                <span className="mt-1 block">
                                  Cần xử lý hủy lịch và thông báo trước khi tour khởi hành.
                                </span>
                              </div>
                            ) : null}

                            {missingGuideWarning ? (
                              <div className="mt-2 rounded-lg border border-rose-300 bg-rose-100 px-2.5 py-2 text-[11px] font-bold leading-4 text-rose-800">
                                <span className="block font-black">Thiếu HDV</span>
                                <span>
                                  Lịch còn {daysUntilDeparture} ngày nhưng chưa được phân công hướng dẫn viên.
                                </span>
                              </div>
                            ) : null}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {formatDate(item.departure_date)}
                          </td>

                          <td className="px-4 py-4 font-semibold">
                            {formatDate(
                              item.return_date || item.departure_date
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-bold">
                            {item.discount_price
                              ? formatPrice(item.discount_price)
                              : formatPrice(
                                  item.base_price ?? item.price
                                )}
                          </td>

                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex min-w-[74px] flex-col items-center rounded-xl bg-white/80 px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                              <span className="text-sm text-slate-950">
                                {bookedSlots}/{totalSlots}
                              </span>
                              <span className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                                đã đặt
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span
                              className={`text-xs font-bold ${
                                leadAssignment ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {leadAssignment ? (
                                <span className="inline-flex flex-col items-center gap-1">
                                  <span>{getGuideName(leadAssignment)}</span>
                                  {getDepartureTimeGroup(item) === 'cancelled' ? (
                                    <span className="text-[10px] font-semibold text-slate-400">HDV trước khi hủy</span>
                                  ) : null}
                                </span>
                              ) : 'Chưa có HDV'}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex px-1 py-1 text-xs font-bold ${statusMeta.badge}`}
                            >
                              {statusMeta.text}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div
                              className="relative flex justify-center"
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenActionMenuId((current) =>
                                    current === item.id ? null : item.id
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
                              >
                                Thao tác
                                <MoreIcon />
                              </button>

                              {openActionMenuId === item.id ? (
                                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-2xl ring-1 ring-black/5">
                                  {replacementRequest ? (
                                    <div className="mb-2 rounded-xl border border-orange-200 bg-orange-50 p-2">
                                      <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-orange-700">
                                        Yêu cầu đổi HDV
                                      </p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionMenuId(null)
                                            onApproveReplacementRequest?.(replacementRequest)
                                          }}
                                          className="rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
                                        >
                                          Duyệt
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionMenuId(null)
                                            onRejectReplacementRequest?.(replacementRequest)
                                          }}
                                          className="rounded-lg bg-rose-600 px-2.5 py-2 text-xs font-black text-white transition hover:bg-rose-700"
                                        >
                                          Không duyệt
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}

                                  {typeof onViewDetails === 'function' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuId(null)
                                        onViewDetails(item.id)
                                      }}
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
                                    >
                                      <DetailIcon />
                                      Chi tiết
                                    </button>
                                  ) : null}

                                  {locked && getDepartureTimeGroup(item) === 'ongoing' && typeof onOpenAssignment === 'function' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuId(null)
                                        onOpenAssignment(item.id)
                                      }}
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
                                    >
                                      <GuideIcon />
                                      {leadAssignment ? 'Đổi HDV' : 'Phân công HDV'}
                                    </button>
                                  ) : null}

                                  {locked ? (
                                    <span className="mt-1 flex w-full items-center rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-500">
                                      Đã khóa
                                    </span>
                                  ) : (
                                    <>
                                      {typeof onOpenAssignment === 'function' ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionMenuId(null)
                                            onOpenAssignment(item.id)
                                          }}
                                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
                                        >
                                          <GuideIcon />
                                          {leadAssignment ? 'Đổi HDV' : 'Phân công HDV'}
                                        </button>
                                      ) : (
                                        <Link
                                          to={getAssignmentLink(item.id)}
                                          onClick={() => setOpenActionMenuId(null)}
                                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
                                        >
                                          <GuideIcon />
                                          Phân HDV
                                        </Link>
                                      )}

                                      {typeof onRequestEdit === 'function' ? (
                                        <button
                                          type="button"
                                          title={
                                            booked
                                              ? 'Lịch đã có khách đặt, cần xác nhận trước khi sửa.'
                                              : 'Sửa lịch khởi hành'
                                          }
                                          onClick={() => {
                                            setOpenActionMenuId(null)
                                            onRequestEdit(item)
                                          }}
                                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-50"
                                        >
                                          <EditIcon />
                                          Sửa
                                        </button>
                                      ) : (
                                        <Link
                                          to={getEditLink(item.id)}
                                          onClick={() => setOpenActionMenuId(null)}
                                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-50"
                                        >
                                          <EditIcon />
                                          Sửa
                                        </Link>
                                      )}

                                      {typeof onCancel === 'function' &&
                                      getDepartureTimeGroup(item) === 'upcoming' ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionMenuId(null)
                                            onCancel(item)
                                          }}
                                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black text-rose-700 transition hover:bg-rose-50"
                                        >
                                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[11px]">
                                            ×
                                          </span>
                                          Hủy lịch
                                        </button>
                                      ) : null}

                                      {typeof onDelete === 'function' ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionMenuId(null)
                                            onDelete(item)
                                          }}
                                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
                                        >
                                          <TrashIcon />
                                          Xóa
                                        </button>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span>Số dòng</span>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    {[10, 20, 30].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Trước
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        aria-current={safePage === page ? 'page' : undefined}
                        className={safePage === page ? 'flex h-9 min-w-9 items-center justify-center rounded-lg bg-sky-600 px-2 text-xs font-extrabold text-white' : 'flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 hover:bg-slate-50'}
                      >
                        {page}
                      </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
