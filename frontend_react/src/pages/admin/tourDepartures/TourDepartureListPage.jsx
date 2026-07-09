import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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

export default function TourDepartureListPage() {
  const navigate = useNavigate()

  const [tours, setTours] = useState([])
  const [selectedTourId, setSelectedTourId] = useState('')
  const [departures, setDepartures] = useState([])
  const [loading, setLoading] = useState(false)

  const [activeTab, setActiveTab] = useState('departures')
  const [scheduleFilter, setScheduleFilter] = useState('upcoming')
  const [focusedDepartureId, setFocusedDepartureId] = useState(null)

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

  const fetchDepartures = useCallback(async (tourId) => {
    if (!tourId) {
      setDepartures([])
      return
    }

    try {
      setLoading(true)

      const response = await tourDepartureApi.getByTour(tourId)

      setDepartures(getArrayFromResponse(response))
    } catch (error) {
      console.error(error)
      alert(
        getRequestErrorMessage(error, 'Không tải được lịch khởi hành')
      )
    } finally {
      setLoading(false)
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
    if (selectedTourId) {
      void fetchDepartures(selectedTourId)
      return
    }

    setDepartures([])
  }, [selectedTourId, fetchDepartures])

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

    if (hasActiveBookings(departure)) {
      const bookingCount = getBookingCount(departure)

      const confirmed = window.confirm(
        `Lịch này đã có ${bookingCount} khách/đơn đặt tour. ` +
          'Bạn có chắc muốn chỉnh sửa không?\n\n' +
          'Sau khi cập nhật, hệ thống sẽ gửi thông báo cho khách hàng và HDV phụ trách.'
      )

      if (!confirmed) return

      navigate(
        `/admin/tour-departures/${selectedTourId}/edit/${departure.id}?confirmBookedChange=1`
      )

      return
    }

    navigate(
      `/admin/tour-departures/${selectedTourId}/edit/${departure.id}`
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

  const selectedTour = tours.find(
    (tour) => String(tour.id) === String(selectedTourId)
  )

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
            if (!selectedTourId) {
              event.preventDefault()
              toast.error('Vui lòng chọn tour trước khi thêm lịch khởi hành.', {
                position: 'top-right',
              })
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
              ? `Đang xem: ${getTourName(selectedTour)}`
              : 'Chọn một tour để xem lịch khởi hành.'}
          </p>
        </div>

        <select
          value={selectedTourId}
          onChange={(event) => {
            setSelectedTourId(event.target.value)
            setFocusedDepartureId(null)
            setActiveTab('departures')
            setScheduleFilter('upcoming')
          }}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">-- Chọn tour --</option>

          {tours.map((tour) => (
            <option key={tour.id} value={tour.id}>
              {getTourName(tour)}
            </option>
          ))}
        </select>
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
        guideContent={
          <GuideAssignmentPanel
            embedded
            selectedTourId={selectedTourId}
            focusedDepartureId={focusedDepartureId}
            onClearFocus={() => setFocusedDepartureId(null)}
            onAssigned={() => fetchDepartures(selectedTourId)}
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
