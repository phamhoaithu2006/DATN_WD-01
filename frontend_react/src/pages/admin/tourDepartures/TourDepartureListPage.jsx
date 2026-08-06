import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Select from 'react-select'
import { toast } from 'sonner'
import { tourDepartureApi } from '../../../services/tourDepartureApi'
import adminGuideReplacementRequestApi, { normalizeItems } from '../../../services/adminGuideReplacementRequestApi'
import TourDepartureTable from '../../../components/admin/tourDepartures/TourDepartureTable'
import { GuideAssignmentPanel } from './GuideAssignmentPage.jsx'
import TourDepartureBookingModal from '../../../components/admin/tourDepartures/TourDepartureBookingModal.jsx'
import { confirmAction } from '../../../components/common/AppConfirmDialog.jsx'
import AdminGuideReplacementRequestsPanel from '../../../components/admin/guides/AdminGuideReplacementRequestsPanel.jsx'
import '../../../styles/support-staff.css'

function getArrayFromResponse(res) {
  if (Array.isArray(res?.data?.data)) return res.data.data
  if (Array.isArray(res?.data?.data?.data)) return res.data.data.data
  if (Array.isArray(res?.data)) return res.data

  return []
}

function normalizeTourSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function getTourName(tour) {
  if (!tour) return 'Chưa chọn tour'

  const name =
    tour.name ||
    tour.title ||
    tour.tour_name ||
    tour.name_tour ||
    ''

  if (name && !/^\d+$/.test(String(name).trim())) {
    return name
  }

  return `Tour #${tour.id}`
}


function getRequestErrorMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors) {
    const firstError = Object.values(errors).flat()[0]

    if (firstError) return firstError
  }

  if (error?.response?.status === 401) {
    return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  }

  if (error?.response?.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.'
  }

  return error?.response?.data?.message || fallback
}

function FieldError({ message }) {
  if (!message) return null

  return (
    <p className="mt-1 text-xs font-bold text-rose-600">
      {message}
    </p>
  )
}

function isLockedDeparture(departure) {
  const group = getDepartureTimeGroup(departure)

  if (group === 'past') {
    return true
  }

  if (group === 'upcoming' || group === 'ongoing') {
    return false
  }

  return false
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

  if (!departureDate) return 'upcoming'
  if (today < departureDate) return 'upcoming'
  if (today >= departureDate && today <= returnDate) return 'ongoing'

  return 'past'
}

function isAssignmentWarningTarget(departure) {
  return ['upcoming', 'ongoing'].includes(getDepartureTimeGroup(departure))
}

function getAssignments(departure) {
  if (Array.isArray(departure?.assigned_guides)) return departure.assigned_guides
  if (Array.isArray(departure?.guide_assignments)) return departure.guide_assignments
  if (Array.isArray(departure?.guideAssignments)) return departure.guideAssignments

  return []
}

function hasAssignedGuide(departure) {
  const activeAssignments = getAssignments(departure).filter(
    (assignment) => !assignment.status || assignment.status === 'assigned'
  )

  return Boolean(activeAssignments.length > 0 || departure?.assignment_state === 'assigned')
}

function getTourIdFromDeparture(departure) {
  return departure?.tour_id || departure?.tour?.id || departure?.tourId || null
}

function countNeedAssignment(items = []) {
  return items.filter(
    (item) => isAssignmentWarningTarget(item) && !hasAssignedGuide(item)
  ).length
}

function getMenuBadgeLabel(count) {
  if (count <= 0) return ''

  return count > 99 ? '99+' : String(count)
}


function formatReplacementDate(value) {
  if (!value) return '-'

  const raw = String(value).slice(0, 10)
  const date = new Date(`${raw}T00:00:00`)

  if (Number.isNaN(date.getTime())) return raw || '-'

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function TourDepartureListPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [tours, setTours] = useState([])
  const [selectedTourId, setSelectedTourId] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [departures, setDepartures] = useState([])
  const [allDepartures, setAllDepartures] = useState([])
  const [loading, setLoading] = useState(false)
  const [tourLoading, setTourLoading] = useState(false)
  const [replacementRequests, setReplacementRequests] = useState([])
  const [replacementPanelOpen, setReplacementPanelOpen] = useState(false)
  const [replacementBusyId, setReplacementBusyId] = useState(null)
  const [showInlineReplacementPanel] = useState(false)

  const [activeTab, setActiveTab] = useState('departures')
  const [scheduleFilter, setScheduleFilter] = useState('upcoming')
  const [focusedDepartureId, setFocusedDepartureId] = useState(null)

  /*
   * NEW chỉ tồn tại trong phiên render hiện tại.
   * Reload trang hoặc chuyển route khác rồi quay lại thì state này mất.
   */
  const [newDepartureIds, setNewDepartureIds] = useState(() => new Set())
  const [newAssignmentDepartureIds, setNewAssignmentDepartureIds] = useState(
    () => new Set()
  )

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailPayload, setDetailPayload] = useState(null)
  const [detailDepartureId, setDetailDepartureId] = useState(null)
  const [detailDeparture, setDetailDeparture] = useState(null)

  // Card thông báo thay cho alert/prompt của trình duyệt
  const [actionNotice, setActionNotice] = useState(null)

  // Modal xác nhận xóa lịch khởi hành
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingDeparture, setDeletingDeparture] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const fetchTours = useCallback(async () => {
    try {
      setTourLoading(true)

      const response = await tourDepartureApi.getTours()
      const list = getArrayFromResponse(response)

      setTours(list)
    } catch (error) {
      console.error(error)
      toast.error(getRequestErrorMessage(error, 'Không tải được danh sách tour'))
    } finally {
      setTourLoading(false)
    }
  }, [])

  const normalizeDeparturesForTour = useCallback((items = [], tour) => {
    return items.map((departure) => ({
      ...departure,
      tour_id: departure.tour_id || tour?.id || departure.tour?.id,
      tour: departure.tour || tour || null,
      tour_title: departure.tour_title || (tour ? getTourName(tour) : undefined),
    }))
  }, [])

  const replaceDeparturesForTour = useCallback((current, tourId, items) => {
    const value = String(tourId)
    const filteredCurrent = current.filter((departure) => {
      return String(getTourIdFromDeparture(departure)) !== value
    })

    return [...filteredCurrent, ...items]
  }, [])

  const fetchDepartures = useCallback(async (tourId = '', sourceTours = tours) => {
    try {
      setLoading(true)

      if (tourId) {
        const selectedTour = sourceTours.find(
          (tour) => String(tour.id) === String(tourId)
        )
        const response = await tourDepartureApi.getByTour(tourId)
        const list = normalizeDeparturesForTour(
          getArrayFromResponse(response),
          selectedTour
        )

        setDepartures(list)
        setAllDepartures((current) =>
          replaceDeparturesForTour(current, tourId, list)
        )
        return
      }

      if (typeof tourDepartureApi.getAllDepartures === 'function') {
        const response = await tourDepartureApi.getAllDepartures()
        const list = getArrayFromResponse(response)

        setDepartures(list)
        setAllDepartures(list)
        return
      }

      if (!sourceTours.length) {
        setDepartures([])
        setAllDepartures([])
        return
      }

      const responses = await Promise.all(
        sourceTours.map(async (tour) => {
          const response = await tourDepartureApi.getByTour(tour.id)

          return normalizeDeparturesForTour(getArrayFromResponse(response), tour)
        })
      )

      const list = responses.flat()

      setDepartures(list)
      setAllDepartures(list)
    } catch (error) {
      console.error(error)
      toast.error(
        getRequestErrorMessage(error, 'Không tải được lịch khởi hành')
      )
    } finally {
      setLoading(false)
    }
  }, [tours, normalizeDeparturesForTour, replaceDeparturesForTour])

  const fetchReplacementRequests = useCallback(async () => {
    try {
      const payload = await adminGuideReplacementRequestApi.list({ status: 'pending', per_page: 100 })
      setReplacementRequests(normalizeItems(payload))
    } catch (error) {
      console.error(error)
    }
  }, [])


  const loadBookedCustomers = useCallback(async (departureId, page = 1) => {
    if (!departureId) return

    try {
      setDetailLoading(true)
      setDetailError('')

      const response = await tourDepartureApi.getBookedCustomers(
        departureId,
        {
          page,
          per_page: 10,
        }
      )

      setDetailPayload(response?.data?.data || null)
    } catch (error) {
      console.error(error)

      setDetailError(
        getRequestErrorMessage(
          error,
          'Không tải được danh sách khách đặt tour.'
        )
      )
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTours()
  }, [fetchTours])

  useEffect(() => {
    void fetchDepartures(selectedTourId)
  }, [selectedTourId, fetchDepartures])

  useEffect(() => {
    void fetchReplacementRequests()
  }, [fetchReplacementRequests])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('openReplacementRequests') === '1') {
      setReplacementPanelOpen(true)
      void fetchReplacementRequests()
    }
  }, [fetchReplacementRequests, location.search])

  useEffect(() => {
    const state = location.state || {}
    const nextNewDepartureIds = new Set()
    const nextNewAssignmentDepartureIds = new Set()

    const createdId =
      state.newDepartureId ||
      state.createdDepartureId ||
      state.departureId ||
      null

    const assignedId =
      state.newAssignmentDepartureId ||
      state.assignedDepartureId ||
      null

    if (createdId) {
      nextNewDepartureIds.add(String(createdId))
    }

    if (assignedId) {
      nextNewAssignmentDepartureIds.add(String(assignedId))
    }

    if (nextNewDepartureIds.size > 0) {
      setNewDepartureIds(nextNewDepartureIds)
    }

    if (nextNewAssignmentDepartureIds.size > 0) {
      setNewAssignmentDepartureIds(nextNewAssignmentDepartureIds)
    }

    if (createdId || assignedId) {
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      })
    }
  }, [
    location.pathname,
    location.search,
    location.state,
    navigate,
  ])


  const handleDelete = (departure) => {
    const item =
      typeof departure === 'object'
        ? departure
        : departures.find(
            (row) => String(row.id) === String(departure)
          )

    const departureId = item?.id || departure

    if (!departureId) {
      setActionNotice({
        type: 'error',
        title: 'Không thể xóa',
        message: 'Không xác định được lịch khởi hành cần xóa.',
      })
      return
    }

    if (item && isLockedDeparture(item)) {
      setActionNotice({
        type: 'error',
        title: 'Không thể xóa lịch',
        message: 'Lịch khởi hành đã bắt đầu hoặc đã qua nên không thể xóa.',
      })
      return
    }

    if (item && hasActiveBookings(item)) {
      setActionNotice({
        type: 'error',
        title: 'Không thể xóa lịch',
        message: 'Lịch này đã có khách đặt tour nên không thể xóa trực tiếp.',
      })
      return
    }

    setDeletingDeparture(item || { id: departureId })
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (deleteSubmitting) return

    setDeleteModalOpen(false)
    setDeletingDeparture(null)
  }

  const submitDeleteDeparture = async () => {
    const departureId = deletingDeparture?.id

    if (!departureId) {
      setDeleteModalOpen(false)
      setActionNotice({
        type: 'error',
        title: 'Không thể xóa',
        message: 'Không xác định được lịch khởi hành cần xóa.',
      })
      return
    }

    try {
      setDeleteSubmitting(true)

      await tourDepartureApi.remove(departureId)

      setNewDepartureIds((current) => {
        const next = new Set(current)
        next.delete(String(departureId))
        return next
      })

      setNewAssignmentDepartureIds((current) => {
        const next = new Set(current)
        next.delete(String(departureId))
        return next
      })

      setDeleteModalOpen(false)
      setDeletingDeparture(null)

      setActionNotice({
        type: 'success',
        title: 'Xóa lịch thành công',
        message: 'Lịch khởi hành đã được xóa khỏi hệ thống.',
      })

      await fetchDepartures(selectedTourId)
    } catch (error) {
      console.error(error)

      setDeleteModalOpen(false)
      setDeletingDeparture(null)
      setActionNotice({
        type: 'error',
        title: 'Xóa lịch thất bại',
        message: getRequestErrorMessage(
          error,
          'Không thể xóa lịch khởi hành. Vui lòng thử lại.'
        ),
      })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleChangeTab = (tab) => {
    setActiveTab(tab)
    setFocusedDepartureId(null)
  }

  const openGuideAssignment = (departureId) => {
    const departure = departures.find(
      (item) => String(item.id) === String(departureId)
    )

    if (departure && isLockedDeparture(departure)) {
      toast.warning(
        'Lịch khởi hành đã bắt đầu hoặc đã qua nên không thể phân công HDV.'
      )
      return
    }

    setFocusedDepartureId(departureId)
    setActiveTab('departures')
  }

  const requestEdit = async (departure) => {
    if (!departure?.id) return

    if (isLockedDeparture(departure)) {
      toast.warning(
        'Lịch khởi hành đã bắt đầu hoặc đã qua nên không thể chỉnh sửa.'
      )
      return
    }

    const tourId = selectedTourId || departure.tour_id || departure.tour?.id

    if (!tourId) {
      toast.error('Không xác định được tour của lịch khởi hành này.')
      return
    }

    if (hasActiveBookings(departure)) {
      const bookingCount = getBookingCount(departure)

      const confirmed = await confirmAction(
        `Lịch này đã có ${bookingCount} khách/đơn đặt tour. ` +
          'Bạn có chắc muốn chỉnh sửa không?\n\n' +
          'Sau khi cập nhật, hệ thống sẽ gửi thông báo cho khách hàng và HDV phụ trách.'
      )

      if (!confirmed) return

      navigate(
        `/admin/tour-departures/${tourId}/edit/${departure.id}?confirmBookedChange=1`
      )

      return
    }

    navigate(
      `/admin/tour-departures/${tourId}/edit/${departure.id}`
    )
  }

  const openDepartureDetail = async (departureId) => {
    const departure = departures.find(
      (item) => String(item.id) === String(departureId)
    )

    setDetailDepartureId(departureId)
    setDetailDeparture(departure || null)
    setDetailPayload(null)
    setDetailError('')
    setDetailOpen(true)

    await loadBookedCustomers(departureId)
  }

  const closeDepartureDetail = () => {
    setDetailOpen(false)
    setDetailPayload(null)
    setDetailError('')
    setDetailDepartureId(null)
    setDetailDeparture(null)
  }

  const openAssignmentFromDetail = (departureId) => {
    closeDepartureDetail()
    openGuideAssignment(departureId)
  }

  const handleAssigned = async (payload = null) => {
    const isObjectPayload =
      payload && typeof payload === 'object' && !Array.isArray(payload)

    const targetDepartureId =
      (isObjectPayload ? payload.departureId : payload) ||
      focusedDepartureId ||
      null

    const actionType = isObjectPayload
      ? payload.type || 'assigned'
      : 'assigned'

    /*
     * Chỉ hiện NEW phân công khi vừa tạo/phân công HDV mới.
     * Hoàn tác/hủy phân công vẫn refresh danh sách nhưng không gắn NEW.
     */
    if (targetDepartureId && actionType === 'assigned') {
      setNewAssignmentDepartureIds((current) => {
        const next = new Set(current)
        next.add(String(targetDepartureId))
        return next
      })
    }

    await fetchDepartures(selectedTourId)
  }


  const selectedTour = tours.find(
    (tour) => String(tour.id) === String(selectedTourId)
  )

  const decideReplacementRequest = async (request, status) => {
    const requestId = request?.id || request?.request_id
    if (!requestId) return

    const message = status === 'approved'
      ? 'Hệ thống sẽ tự tìm và phân công HDV thay thế.'
      : 'Bạn có chắc muốn không chấp nhận yêu cầu đổi HDV này?'
    const confirmed = await confirmAction(message, {
      title: status === 'approved' ? 'Chấp nhận đơn đổi HDV' : 'Không chấp nhận đơn đổi HDV',
      confirmLabel: status === 'approved' ? 'Chấp nhận' : 'Không chấp nhận',
      tone: status === 'approved' ? 'primary' : 'danger',
    })
    if (!confirmed) return

    setReplacementBusyId(requestId)
    try {
      if (status === 'approved') await adminGuideReplacementRequestApi.approve(requestId)
      else await adminGuideReplacementRequestApi.reject(requestId, { admin_note: 'Yêu cầu không được chấp nhận.' })
      await fetchReplacementRequests()
      await fetchDepartures(selectedTourId)
      window.dispatchEvent(new Event('admin-guide-replacement:changed'))
      window.dispatchEvent(new Event('admin-notification:changed'))
    } catch (error) {
      toast.error(getRequestErrorMessage(error, 'Cập nhật yêu cầu đổi HDV thất bại.'))
    } finally {
      setReplacementBusyId(null)
    }
  }

  const assignmentWarningCount = useMemo(() => {
    return countNeedAssignment(allDepartures)
  }, [allDepartures])

  const tourAssignmentWarningCounts = useMemo(() => {
    const map = new Map()

    allDepartures.forEach((departure) => {
      if (!isAssignmentWarningTarget(departure) || hasAssignedGuide(departure)) {
        return
      }

      const tourId = getTourIdFromDeparture(departure)

      if (!tourId) return

      const key = String(tourId)

      map.set(key, (map.get(key) || 0) + 1)
    })

    return map
  }, [allDepartures])


  const tourOptions = useMemo(() => {
    const options = tours
      .map((tour) => {
        const tourName = getTourName(tour)
        const warningCount =
          tourAssignmentWarningCounts.get(String(tour.id)) || 0

        return {
          value: String(tour.id),
          label: tourName,
          tourName,
          tourId: tour.id,
          warningCount,
          searchText: normalizeTourSearch(`${tourName} ${tour.id}`),
          isAllToursOption: false,
        }
      })
      .sort((first, second) =>
        first.tourName.localeCompare(second.tourName, 'vi')
      )

    return [
      {
        value: '',
        label: 'Tất cả tour',
        tourName: 'Tất cả tour',
        warningCount: assignmentWarningCount,
        searchText: 'tat ca tour',
        isAllToursOption: true,
      },
      ...options,
    ]
  }, [
    assignmentWarningCount,
    tourAssignmentWarningCounts,
    tours,
  ])

  const selectedTourOption =
    tourOptions.find(
      (option) => option.value === String(selectedTourId)
    ) || tourOptions[0]

  const handleSelectTour = (option) => {
    setSelectedTourId(option?.value ?? '')
    clearFieldError('selectedTourId')
    setFocusedDepartureId(null)
    setActiveTab('departures')
    setScheduleFilter('upcoming')
  }

  const resetTourFilter = () => {
    handleSelectTour(tourOptions[0])
  }

  function clearFieldError(fieldName) {
    setFieldErrors((current) => {
      if (!current[fieldName]) return current

      const next = { ...current }
      delete next[fieldName]

      return next
    })
  }

  function validateBeforeCreateDeparture() {
    if (selectedTourId) {
      clearFieldError('selectedTourId')
      return true
    }

    setFieldErrors((current) => ({
      ...current,
      selectedTourId: 'Vui lòng chọn tour trước khi thêm lịch khởi hành.',
    }))

    return false
  }

  useEffect(() => {
    const urgentCount = assignmentWarningCount + replacementRequests.length
    const label = getMenuBadgeLabel(urgentCount)

    try {
      window.localStorage.setItem(
        'tourDepartureNeedAssignmentCount',
        String(urgentCount)
      )
      window.localStorage.setItem(
        'tourDepartureNeedAssignmentOnlyCount',
        String(assignmentWarningCount)
      )
    } catch (error) {
      console.error(error)
    }

    window.dispatchEvent(
      new CustomEvent('tourDepartureNeedAssignmentCountChanged', {
        detail: {
          count: urgentCount,
          assignmentCount: assignmentWarningCount,
          replacementRequestCount: replacementRequests.length,
          label,
        },
      })
    )
  }, [assignmentWarningCount, replacementRequests.length])

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Quản lý lịch khởi hành
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Phân loại lịch sắp tới, lịch đã qua và phân công hướng dẫn viên.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setReplacementPanelOpen(true)}
            className="relative inline-flex h-10 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-700 shadow-sm transition hover:bg-orange-100"
          >
            Đơn đổi HDV
            {replacementRequests.length > 0 ? (
              <span className="ml-2 rounded-full bg-orange-600 px-1.5 py-0.5 text-[11px] font-black text-white">
                {replacementRequests.length > 99 ? '99+' : replacementRequests.length}
              </span>
            ) : null}
          </button>

          <Link
          to={`/admin/tour-departures/create?tourId=${selectedTourId}`}
          onClick={(event) => {
            if (!validateBeforeCreateDeparture()) {
              event.preventDefault()
            }
          }}
          aria-disabled={!selectedTourId}
          title={
            selectedTourId
              ? 'Thêm lịch khởi hành cho tour đã chọn'
              : 'Vui lòng chọn tour trước khi thêm lịch khởi hành'
          }
          className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold text-white shadow-sm transition ${
            selectedTourId
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'cursor-not-allowed bg-blue-400'
          }`}
        >
          + Thêm lịch khởi hành
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <label
                  htmlFor="tour-departure-tour-filter"
                  className="text-sm font-bold text-slate-800"
                >
                  Tìm và chọn tour
                </label>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Có thể tìm theo tên tour, địa điểm hoặc mã tour. Hỗ trợ tìm không dấu.
                </p>
              </div>

              {assignmentWarningCount > 0 ? (
                <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                  {assignmentWarningCount} lịch chưa phân công HDV
                </span>
              ) : null}
            </div>

            <Select
              inputId="tour-departure-tour-filter"
              aria-label="Tìm và chọn tour"
              value={selectedTourOption}
              options={tourOptions}
              isSearchable
              isClearable={Boolean(selectedTourId)}
              isLoading={tourLoading}
              placeholder="Nhập tên tour, địa điểm hoặc mã tour..."
              noOptionsMessage={({ inputValue }) =>
                inputValue
                  ? `Không tìm thấy tour phù hợp với “${inputValue}”`
                  : 'Không có tour để hiển thị'
              }
              loadingMessage={() => 'Đang tải danh sách tour...'}
              maxMenuHeight={320}
              menuPlacement="auto"
              captureMenuScroll
              filterOption={(candidate, inputValue) => {
                const keyword = normalizeTourSearch(inputValue)

                if (!keyword) return true
                if (candidate.data.isAllToursOption) return false

                return candidate.data.searchText.includes(keyword)
              }}
              formatOptionLabel={(option, meta) => {
                const showDetail = meta.context === 'menu'

                return (
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-inherit">
                        {option.tourName}
                      </p>

                      {showDetail && !option.isAllToursOption ? (
                        <p
                          className={`mt-0.5 text-xs ${
                            meta.selectValue?.some(
                              (item) => item.value === option.value
                            )
                              ? 'text-blue-100'
                              : 'text-slate-400'
                          }`}
                        >
                          Mã tour: #{option.tourId}
                        </p>
                      ) : null}
                    </div>

                    {option.warningCount > 0 ? (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${
                          meta.context === 'menu' &&
                          meta.selectValue?.some(
                            (item) => item.value === option.value
                          )
                            ? 'bg-white/20 text-white'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                        }`}
                      >
                        {option.warningCount} chưa phân công
                      </span>
                    ) : null}
                  </div>
                )
              }}
              onChange={handleSelectTour}
              styles={{
                control: (base, state) => ({
                  ...base,
                  minHeight: 46,
                  borderRadius: 12,
                  borderColor: fieldErrors.selectedTourId
                    ? '#f43f5e'
                    : state.isFocused
                      ? '#3b82f6'
                      : '#cbd5e1',
                  backgroundColor: fieldErrors.selectedTourId
                    ? 'rgba(255, 241, 242, 0.45)'
                    : '#ffffff',
                  boxShadow: state.isFocused
                    ? fieldErrors.selectedTourId
                      ? '0 0 0 4px rgba(255, 228, 230, 1)'
                      : '0 0 0 4px rgba(219, 234, 254, 1)'
                    : 'none',
                  cursor: 'text',
                  '&:hover': {
                    borderColor: fieldErrors.selectedTourId
                      ? '#f43f5e'
                      : '#3b82f6',
                  },
                }),
                valueContainer: (base) => ({
                  ...base,
                  paddingLeft: 14,
                  paddingRight: 8,
                }),
                input: (base) => ({
                  ...base,
                  color: '#1e293b',
                  fontSize: 14,
                }),
                singleValue: (base) => ({
                  ...base,
                  color: fieldErrors.selectedTourId ? '#881337' : '#1e293b',
                  fontSize: 14,
                }),
                placeholder: (base) => ({
                  ...base,
                  color: '#94a3b8',
                  fontSize: 14,
                }),
                clearIndicator: (base) => ({
                  ...base,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  '&:hover': { color: '#475569' },
                }),
                dropdownIndicator: (base, state) => ({
                  ...base,
                  color: state.isFocused ? '#2563eb' : '#64748b',
                  cursor: 'pointer',
                }),
                indicatorSeparator: (base) => ({
                  ...base,
                  backgroundColor: '#e2e8f0',
                }),
                menu: (base) => ({
                  ...base,
                  zIndex: 80,
                  overflow: 'hidden',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  boxShadow:
                    '0 18px 45px -15px rgba(15, 23, 42, 0.30)',
                }),
                menuList: (base) => ({
                  ...base,
                  paddingTop: 6,
                  paddingBottom: 6,
                }),
                option: (base, state) => ({
                  ...base,
                  margin: '2px 6px',
                  width: 'calc(100% - 12px)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 14,
                  cursor: 'pointer',
                  backgroundColor: state.isSelected
                    ? '#2563eb'
                    : state.isFocused
                      ? '#eff6ff'
                      : '#ffffff',
                  color: state.isSelected ? '#ffffff' : '#1e293b',
                  '&:active': {
                    backgroundColor: state.isSelected ? '#1d4ed8' : '#dbeafe',
                  },
                }),
                noOptionsMessage: (base) => ({
                  ...base,
                  padding: 18,
                  color: '#64748b',
                  fontSize: 14,
                }),
              }}
            />

            <FieldError message={fieldErrors.selectedTourId} />
          </div>

          <button
            type="button"
            onClick={resetTourFilter}
            disabled={!selectedTourId}
            className="inline-flex h-[46px] shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 lg:min-w-28"
          >
            Đặt lại
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Đang xem
          </span>

          {selectedTour ? (
            <button
              type="button"
              onClick={resetTourFilter}
              className="inline-flex max-w-full items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100"
              title="Bỏ lọc tour"
            >
              <span className="truncate">{getTourName(selectedTour)}</span>
              <span aria-hidden="true" className="text-base leading-none">
                ×
              </span>
            </button>
          ) : (
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">
              Tất cả lịch khởi hành
            </span>
          )}
        </div>
      </div>

      {showInlineReplacementPanel && replacementRequests.length > 0 ? (
        <section className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 text-orange-950 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-orange-700">Yêu cầu đổi HDV</p>
              <h3 className="mt-1 text-lg font-black">Có {replacementRequests.length} yêu cầu đang chờ duyệt</h3>
            </div>
            <button type="button" onClick={() => setReplacementPanelOpen((current) => !current)} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-black text-white hover:bg-orange-700">
              {replacementPanelOpen ? 'Ẩn yêu cầu' : 'Xem yêu cầu'}
            </button>
          </div>
          {replacementPanelOpen ? <div className="grid gap-3 border-t border-orange-200 bg-white/60 px-5 py-4">{replacementRequests.map((request) => {
            const id = request.id || request.request_id
            const guideName = request.current_guide_name || request.guide_name || request.current_guide?.user?.full_name || request.guide?.user?.full_name || `HDV #${request.current_guide_id || request.guide_id || ''}`
            const tourTitle = request.tour_title || request.tour?.title || `Tour #${request.tour_id || request.tour_departure_id || ''}`
            return <article key={id} className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:justify-between"><div><span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-black uppercase text-orange-700">Chờ duyệt đổi HDV</span><h4 className="mt-3 text-base font-black text-slate-950">{tourTitle}</h4><p className="mt-1 text-sm font-semibold text-slate-600">HDV yêu cầu: {guideName} · Ngày đi {formatReplacementDate(request.departure_date)} · Ngày về {formatReplacementDate(request.return_date || request.departure_date)}</p><div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-xs font-black uppercase text-slate-500">Lý do</p><p className="mt-1 text-sm text-slate-800">{request.reason || request.request_reason || 'Không có lý do.'}</p></div>{request.evidence_path ? <a href={`/storage/${request.evidence_path}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-blue-700">Xem bằng chứng</a> : null}</div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" disabled={replacementBusyId === id} onClick={() => decideReplacementRequest(request, 'approved')} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">Chấp nhận</button><button type="button" disabled={replacementBusyId === id} onClick={() => decideReplacementRequest(request, 'rejected')} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60">Không chấp nhận</button></div></div></article>
          })}</div> : null}
        </section>
      ) : null}

      <TourDepartureTable
        departures={departures}
        loading={loading}
        selectedTourId={selectedTourId}
        activeTab={activeTab}
        scheduleFilter={scheduleFilter}
        onChangeTab={handleChangeTab}
        onChangeScheduleFilter={setScheduleFilter}
        onDelete={handleDelete}
        onOpenAssignment={openGuideAssignment}
        onRequestEdit={requestEdit}
        onViewDetails={openDepartureDetail}
        assignmentWarningCount={assignmentWarningCount}
        newDepartureIds={newDepartureIds}
        newAssignmentDepartureIds={newAssignmentDepartureIds}
        guideContent={
          <GuideAssignmentPanel
            embedded
            selectedTourId={selectedTourId}
            focusedDepartureId={focusedDepartureId}
            onClearFocus={() => setFocusedDepartureId(null)}
            onAssigned={handleAssigned}
          />
        }
      />

      {replacementPanelOpen ? (
        <div
          className="admin-guide-leave-card-backdrop"
          role="presentation"
          onMouseDown={() => setReplacementPanelOpen(false)}
        >
          <div
            className="admin-guide-leave-card-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Quản lý đơn đổi HDV"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <AdminGuideReplacementRequestsPanel
              open={replacementPanelOpen}
              onClose={() => setReplacementPanelOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {focusedDepartureId ? (
        <div
          className="fixed inset-y-0 right-0 z-[70] flex items-start justify-center bg-slate-950/45 px-5 py-8 backdrop-blur-sm md:left-[280px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setFocusedDepartureId(null)
            }
          }}
        >
          <section className="w-full max-w-[1180px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                  Phân công HDV
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  Phân công / đổi hướng dẫn viên
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Đang thao tác ngay trong trang lịch khởi hành. Bấm ra ngoài card hoặc nút Đóng để tắt.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFocusedDepartureId(null)}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>

            <div className="max-h-[calc(100vh-170px)] overflow-y-auto p-5">
              <GuideAssignmentPanel
                embedded
                selectedTourId={selectedTourId}
                focusedDepartureId={focusedDepartureId}
                onClearFocus={() => setFocusedDepartureId(null)}
                onAssigned={handleAssigned}
              />
            </div>
          </section>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div
          className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal()
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-departure-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 bg-rose-50 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-2xl font-black text-rose-700">
                  !
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-rose-600">
                    Xác nhận xóa
                  </p>
                  <h3
                    id="delete-departure-title"
                    className="mt-1 text-xl font-black text-slate-950"
                  >
                    Xóa lịch khởi hành?
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Thao tác này không thể hoàn tác.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              {deletingDeparture ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-900">
                    {deletingDeparture?.tour?.title ||
                      deletingDeparture?.tour_title ||
                      `Lịch khởi hành #${deletingDeparture.id}`}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Ngày đi: {formatReplacementDate(deletingDeparture.departure_date)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Ngày về:{' '}
                    {formatReplacementDate(
                      deletingDeparture.return_date ||
                        deletingDeparture.departure_date
                    )}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-700">
                Bạn có chắc chắn muốn xóa lịch khởi hành này khỏi hệ thống không?
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteSubmitting}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => void submitDeleteDeparture()}
                disabled={deleteSubmitting}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteSubmitting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/*
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRejectModal()
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-replacement-title"
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 bg-rose-50 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-2xl text-rose-700">
                  !
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-rose-600">
                    Xác nhận không duyệt
                  </p>
                  <h3
                    id="reject-replacement-title"
                    className="mt-1 text-xl font-black text-slate-950"
                  >
                    Không chấp nhận yêu cầu đổi HDV
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Hãy nhập lý do để gửi lại cho hướng dẫn viên.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              {rejectingRequest ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-900">
                    {getReplacementTourTitle(rejectingRequest)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    HDV yêu cầu: {getReplacementGuideName(rejectingRequest)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Ngày đi {formatReplacementDate(rejectingRequest.departure_date)}
                    {' · '}
                    Ngày về{' '}
                    {formatReplacementDate(
                      rejectingRequest.return_date ||
                        rejectingRequest.departure_date
                    )}
                  </p>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="reject-replacement-note"
                  className="mb-2 block text-sm font-black text-slate-800"
                >
                  Lý do không duyệt <span className="text-rose-600">*</span>
                </label>

                <textarea
                  id="reject-replacement-note"
                  value={rejectNote}
                  onChange={(event) => {
                    setRejectNote(event.target.value)
                    if (rejectNoteError) setRejectNoteError('')
                  }}
                  disabled={rejectSubmitting}
                  rows={5}
                  maxLength={1000}
                  autoFocus
                  placeholder="Ví dụ: Thời gian tour sắp bắt đầu, hiện chưa có HDV phù hợp để thay thế..."
                  className={`w-full resize-y rounded-2xl border bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                    rejectNoteError
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
                  }`}
                />

                <div className="mt-2 flex items-start justify-between gap-3">
                  <div>
                    {rejectNoteError ? (
                      <p className="text-sm font-bold text-rose-600">
                        {rejectNoteError}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Lý do này sẽ được gửi lại cho HDV.
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    {rejectNote.length}/1000
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={rejectSubmitting}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => void submitRejectReplacementRequest()}
                disabled={rejectSubmitting}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rejectSubmitting
                  ? 'Đang xử lý...'
                  : 'Xác nhận không duyệt'}
              </button>
            </div>
          </section>
        </div>
      */}

      {actionNotice ? (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="px-6 pb-5 pt-6 text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl font-black ${
                  actionNotice.type === 'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {actionNotice.type === 'success' ? '✓' : '!'}
              </div>

              <h3 className="mt-4 text-xl font-black text-slate-950">
                {actionNotice.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {actionNotice.message}
              </p>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setActionNotice(null)}
                className={`w-full rounded-xl px-5 py-2.5 text-sm font-black text-white transition ${
                  actionNotice.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <TourDepartureBookingModal
        open={detailOpen}
        loading={detailLoading}
        error={detailError}
        payload={detailPayload}
        departure={detailDeparture}
        onOpenAssignment={openAssignmentFromDetail}
        onClose={closeDepartureDetail}
        onPageChange={(page) => {
          if (detailDepartureId) {
            void loadBookedCustomers(detailDepartureId, page)
          }
        }}
      />
    </div>
  )
}
