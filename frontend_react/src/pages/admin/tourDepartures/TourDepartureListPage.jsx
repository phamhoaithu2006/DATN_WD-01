import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { tourDepartureApi } from '../../../services/tourDepartureApi'
import adminGuideReplacementRequestApi from '../../../services/adminGuideReplacementRequestApi'
import TourDepartureTable from '../../../components/admin/tourDepartures/TourDepartureTable'
import { GuideAssignmentPanel } from './GuideAssignmentPage.jsx'
import TourDepartureBookingModal from '../../../components/admin/tourDepartures/TourDepartureBookingModal.jsx'
import { confirmAction } from '../../../components/common/AppConfirmDialog.jsx'

function getArrayFromResponse(res) {
  if (Array.isArray(res?.data?.data)) return res.data.data
  if (Array.isArray(res?.data?.data?.data)) return res.data.data.data
  if (Array.isArray(res?.data)) return res.data

  return []
}

function getReplacementRequestList(response) {
  const payload = response?.data ?? response
  const data = payload?.data ?? payload

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
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

function formatReplacementDateTime(value) {
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

function getReplacementGuideName(request) {
  return (
    request?.current_guide_name ||
    request?.guide_name ||
    request?.current_guide?.user?.full_name ||
    request?.guide?.user?.full_name ||
    `HDV #${request?.current_guide_id || request?.guide_id || ''}`
  )
}

function getReplacementTourTitle(request) {
  return (
    request?.tour_title ||
    request?.tour?.title ||
    `Tour #${request?.tour_id || request?.tour_departure_id || ''}`
  )
}

function getReplacementReason(request) {
  return request?.reason || request?.request_reason || 'Không có lý do.'
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
  const [replacementRequests, setReplacementRequests] = useState([])
  const [replacementPanelOpen, setReplacementPanelOpen] = useState(false)
  const [highlightedReplacementDepartureId, setHighlightedReplacementDepartureId] = useState(null)

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

  // Modal không duyệt yêu cầu đổi HDV
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectingRequest, setRejectingRequest] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectNoteError, setRejectNoteError] = useState('')
  const [rejectSubmitting, setRejectSubmitting] = useState(false)

  // Card thông báo thay cho alert/prompt của trình duyệt
  const [actionNotice, setActionNotice] = useState(null)

  // Modal xác nhận xóa lịch khởi hành
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingDeparture, setDeletingDeparture] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const fetchTours = useCallback(async () => {
    try {
      const response = await tourDepartureApi.getTours()
      const list = getArrayFromResponse(response)

      setTours(list)
    } catch (error) {
      console.error(error)
      toast.error(getRequestErrorMessage(error, 'Không tải được danh sách tour'))
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

      const response = await tourDepartureApi.getAllDepartures()
      const list = getArrayFromResponse(response)

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
    const response = await adminGuideReplacementRequestApi.list({
      status: 'pending',
      per_page: 100,
    })

    const list = getReplacementRequestList(response)

    setReplacementRequests(list)

    if (list.length > 0) {
      setReplacementPanelOpen(true)
    }

    window.dispatchEvent(
      new CustomEvent('admin-guide-replacement:changed', {
        detail: {
          count: list.length,
        },
      })
    )
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
    // We intentionally omit fetchDepartures from deps because
    // fetchDepartures is stable across renders for this usage,
    // and we only want new fetches when selectedTourId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTourId])

  useEffect(() => {
    void fetchReplacementRequests()
  }, [fetchReplacementRequests])

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


useEffect(() => {
  const params = new URLSearchParams(location.search)
  const shouldOpenReplacement =
    params.get('openReplacementRequests') === '1' ||
    params.get('replacementRequest') === '1'

  if (!shouldOpenReplacement) return

  const departureId =
    params.get('departureId') ||
    params.get('tourDepartureId') ||
    null

  setActiveTab('departures')
  setScheduleFilter('all')
  setReplacementPanelOpen(true)

  if (departureId) {
    setHighlightedReplacementDepartureId(String(departureId))
    setFocusedDepartureId(null)
  }

  void fetchReplacementRequests()
}, [location.search, fetchReplacementRequests])

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


const approveReplacementRequest = async (request) => {
  const requestId = request?.id || request?.request_id

  if (!requestId) return

  const confirmed = await confirmAction(
    'Hệ thống sẽ tự động tìm HDV khác đang trống lịch và phân công thay thế.',
    { title: 'Duyệt yêu cầu đổi hướng dẫn viên', confirmLabel: 'Duyệt yêu cầu' }
  )

  if (!confirmed) return

  try {
    await adminGuideReplacementRequestApi.approve(requestId)
    toast.success('Đã duyệt yêu cầu đổi HDV và phân công HDV thay thế.')
    await fetchReplacementRequests()
    await fetchDepartures(selectedTourId)
    window.dispatchEvent(new Event('admin-notification:changed'))
    window.dispatchEvent(new Event('admin-guide-replacement:changed'))
    window.dispatchEvent(new Event('tourDepartureNeedAssignmentCountChanged'))
  } catch (error) {
    console.error(error)
    toast.error(
      getRequestErrorMessage(
        error,
        'Duyệt yêu cầu đổi HDV thất bại.'
      )
    )
  }
}

const rejectReplacementRequest = (request) => {
  const requestId = request?.id || request?.request_id

  if (!requestId) {
    setActionNotice({
      type: 'error',
      title: 'Không thể thực hiện',
      message: 'Không xác định được yêu cầu đổi HDV cần xử lý.',
    })
    return
  }

  setRejectingRequest(request)
  setRejectNote('')
  setRejectNoteError('')
  setRejectModalOpen(true)
}

const closeRejectModal = () => {
  if (rejectSubmitting) return

  setRejectModalOpen(false)
  setRejectingRequest(null)
  setRejectNote('')
  setRejectNoteError('')
}

const submitRejectReplacementRequest = async () => {
  const requestId =
    rejectingRequest?.id || rejectingRequest?.request_id
  const normalizedNote = rejectNote.trim()

  if (!requestId) {
    setRejectNoteError('Không xác định được yêu cầu đổi HDV.')
    return
  }

  if (!normalizedNote) {
    setRejectNoteError('Vui lòng nhập lý do không duyệt.')
    return
  }

  if (normalizedNote.length < 3) {
    setRejectNoteError('Lý do không duyệt phải có ít nhất 3 ký tự.')
    return
  }

  try {
    setRejectSubmitting(true)
    setRejectNoteError('')

    await adminGuideReplacementRequestApi.reject(requestId, {
      admin_note: normalizedNote,
    })

    setRejectModalOpen(false)
    setRejectingRequest(null)
    setRejectNote('')

    setActionNotice({
      type: 'success',
      title: 'Đã không duyệt yêu cầu',
      message:
        'Yêu cầu đổi HDV đã bị từ chối và lý do đã được gửi lại cho hướng dẫn viên.',
    })

    await fetchReplacementRequests()
    await fetchDepartures(selectedTourId)

    window.dispatchEvent(new Event('admin-notification:changed'))
    window.dispatchEvent(new Event('admin-guide-replacement:changed'))
    window.dispatchEvent(new Event('tourDepartureNeedAssignmentCountChanged'))
  } catch (error) {
    console.error(error)

    setRejectNoteError(
      getRequestErrorMessage(
        error,
        'Từ chối yêu cầu đổi HDV thất bại.'
      )
    )
  } finally {
    setRejectSubmitting(false)
  }
}

  const selectedTour = tours.find(
    (tour) => String(tour.id) === String(selectedTourId)
  )

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
      window.localStorage.setItem(
        'tourDepartureReplacementRequestCount',
        String(replacementRequests.length)
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

        <Link
          to={`/admin/tour-departures/create?tourId=${selectedTourId}`}
          onClick={(event) => {
            if (!validateBeforeCreateDeparture()) {
              event.preventDefault()
            }
          }}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          + Thêm lịch khởi hành
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3">
          <label className="text-sm font-medium text-slate-700">
            Chọn tour
          </label>

          <p className="mt-1 text-sm text-slate-500">
            {selectedTour
              ? `Đang lọc theo tour: ${getTourName(selectedTour)}`
              : 'Đang xem: Tất cả lịch khởi hành.'}

            {assignmentWarningCount > 0 ? (
              <span className="ml-2 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                {assignmentWarningCount} lịch sắp tới/đang diễn ra chưa phân công
              </span>
            ) : null}
          </p>
        </div>

        <select
          value={selectedTourId}
          onChange={(event) => {
            setSelectedTourId(event.target.value)
            clearFieldError('selectedTourId')
            setFocusedDepartureId(null)
            setActiveTab('departures')
            setScheduleFilter('upcoming')
          }}
          className={`h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:ring-2 ${
            fieldErrors.selectedTourId
              ? 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-100'
              : 'border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-blue-100'
          }`}
        >
          <option value="">
            {assignmentWarningCount > 0
              ? `-- Tất cả tour -- (${assignmentWarningCount} chưa phân công)`
              : '-- Tất cả tour --'}
          </option>

          {tours.map((tour) => {
            const warningCount = tourAssignmentWarningCounts.get(String(tour.id)) || 0

            return (
              <option key={tour.id} value={tour.id}>
                {warningCount > 0
                  ? `${getTourName(tour)} (${warningCount} chưa phân công)`
                  : getTourName(tour)}
              </option>
            )
          })}
        </select>
        <FieldError message={fieldErrors.selectedTourId} />
      </div>


{replacementRequests.length > 0 ? (
  <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 text-orange-950 shadow-sm">
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-orange-700">
          Yêu cầu đổi HDV
        </p>
        <h3 className="mt-1 text-lg font-black">
          Có {replacementRequests.length} yêu cầu đổi HDV đang chờ duyệt
        </h3>
        <p className="mt-1 text-sm text-orange-700">
          Các yêu cầu được gom vào danh sách bên dưới. Lý do, bằng chứng và nút Duyệt / Không duyệt nằm trong danh sách này.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          setReplacementPanelOpen((current) => !current)
          setActiveTab('departures')
          setScheduleFilter('all')
        }}
        className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-black text-white transition hover:bg-orange-700"
      >
        {replacementPanelOpen ? 'Ẩn yêu cầu' : 'Xem yêu cầu'}
      </button>
    </div>

    {replacementPanelOpen ? (
      <div className="border-t border-orange-200 bg-white/60 px-5 py-4">
        <div className="grid gap-3">
          {replacementRequests.map((request) => (
            <article
              key={request.id || request.request_id}
              className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-orange-700 ring-1 ring-orange-200">
                      Chờ duyệt đổi HDV
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Gửi lúc {formatReplacementDateTime(request.created_at)}
                    </span>
                  </div>

                  <h4 className="mt-2 text-base font-black text-slate-950">
                    {getReplacementTourTitle(request)}
                  </h4>

                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    HDV yêu cầu: {getReplacementGuideName(request)} · Ngày đi {formatReplacementDate(request.departure_date)} · Ngày về {formatReplacementDate(request.return_date || request.departure_date)}
                  </p>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Lý do
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800">
                      {getReplacementReason(request)}
                    </p>
                  </div>

                  {request.evidence_path ? (
                    <a
                      href={`/storage/${request.evidence_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-bold text-blue-700 hover:text-blue-800"
                    >
                      Xem bằng chứng
                    </a>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => approveReplacementRequest(request)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700"
                  >
                    Chấp nhận
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectReplacementRequest(request)}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-700"
                  >
                    Không chấp nhận
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    ) : null}
  </div>
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
        replacementRequests={replacementRequests}
        highlightedReplacementDepartureId={highlightedReplacementDepartureId}
        onApproveReplacementRequest={approveReplacementRequest}
        onRejectReplacementRequest={rejectReplacementRequest}
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

      {rejectModalOpen ? (
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
      ) : null}

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
