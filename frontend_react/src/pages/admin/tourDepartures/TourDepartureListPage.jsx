import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { tourDepartureApi } from '../../../services/tourDepartureApi'
import TourDepartureTable from '../../../components/admin/tourDepartures/TourDepartureTable'
import { GuideAssignmentPanel } from './GuideAssignmentPage.jsx'
import TourDepartureBookingModal from '../../../components/admin/tourDepartures/TourDepartureBookingModal.jsx'

function getArrayFromResponse(res) {
  if (Array.isArray(res?.data?.data)) return res.data.data
  if (Array.isArray(res?.data?.data?.data)) return res.data.data.data
  if (Array.isArray(res?.data)) return res.data

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

export default function TourDepartureListPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [tours, setTours] = useState([])
  const [selectedTourId, setSelectedTourId] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [departures, setDepartures] = useState([])
  const [allDepartures, setAllDepartures] = useState([])
  const [loading, setLoading] = useState(false)

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

  const fetchTours = useCallback(async () => {
    try {
      const response = await tourDepartureApi.getTours()
      const list = getArrayFromResponse(response)

      setTours(list)
    } catch (error) {
      console.error(error)
      alert(getRequestErrorMessage(error, 'Không tải được danh sách tour'))
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
      alert(
        getRequestErrorMessage(error, 'Không tải được lịch khởi hành')
      )
    } finally {
      setLoading(false)
    }
  }, [tours, normalizeDeparturesForTour, replaceDeparturesForTour])

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

  const handleDelete = async (departure) => {
    const item =
      typeof departure === 'object'
        ? departure
        : departures.find(
            (row) => String(row.id) === String(departure)
          )

    const departureId = item?.id || departure

    if (!departureId) return

    if (item && isLockedDeparture(item)) {
      alert(
        'Lịch khởi hành đã bắt đầu hoặc đã qua nên không thể xóa.'
      )
      return
    }

    if (item && hasActiveBookings(item)) {
      alert(
        'Lịch này đã có khách đặt tour nên không thể xóa trực tiếp.'
      )
      return
    }

    const confirmed = window.confirm(
      'Bạn có chắc muốn xóa lịch khởi hành này không?'
    )

    if (!confirmed) return

    try {
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

      alert('Xóa lịch khởi hành thành công')

      await fetchDepartures(selectedTourId)
    } catch (error) {
      console.error(error)
      alert(
        getRequestErrorMessage(error, 'Xóa lịch khởi hành thất bại')
      )
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
      alert(
        'Lịch khởi hành đã bắt đầu hoặc đã qua nên không thể phân công HDV.'
      )
      return
    }

    setFocusedDepartureId(departureId)
    setActiveTab('guides')
  }

  const requestEdit = (departure) => {
    if (!departure?.id) return

    if (isLockedDeparture(departure)) {
      alert(
        'Lịch khởi hành đã bắt đầu hoặc đã qua nên không thể chỉnh sửa.'
      )
      return
    }

    const tourId = selectedTourId || departure.tour_id || departure.tour?.id

    if (!tourId) {
      alert('Không xác định được tour của lịch khởi hành này.')
      return
    }

    if (hasActiveBookings(departure)) {
      const bookingCount = getBookingCount(departure)

      const confirmed = window.confirm(
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
    setDetailDepartureId(departureId)
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
    const label = getMenuBadgeLabel(assignmentWarningCount)

    try {
      window.localStorage.setItem(
        'tourDepartureNeedAssignmentCount',
        String(assignmentWarningCount)
      )
    } catch (error) {
      console.error(error)
    }

    window.dispatchEvent(
      new CustomEvent('tourDepartureNeedAssignmentCountChanged', {
        detail: {
          count: assignmentWarningCount,
          label,
        },
      })
    )
  }, [assignmentWarningCount])

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

      <TourDepartureBookingModal
        open={detailOpen}
        loading={detailLoading}
        error={detailError}
        payload={detailPayload}
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