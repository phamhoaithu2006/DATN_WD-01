import { useEffect, useMemo, useState } from 'react'
import { tourDepartureApi } from '../../../services/tourDepartureApi'
import { TourDetailCard } from '../../../pages/admin/tourDepartures/TourDepartureCreatePage.jsx'
import Icon from '../../customer/Icon'
import { mediaUrl } from '../../../utils/mediaUrl'
import '../../../styles/itinerary-activity.css'

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
  const isCancelled = ['cancelled', 'canceled'].includes(String(departure?.status || '').toLowerCase())
    || String(departure?.schedule_group || '').toLowerCase() === 'cancelled'
  const activeAssignments = getAssignments(departure).filter((assignment) =>
    isCancelled
      ? assignment.status === 'cancelled'
      : !assignment.status || ['assigned', 'confirmed'].includes(assignment.status),
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

function getGuideEmail(assignment) {
  if (!assignment) return ''

  return (
    assignment?.guide?.user?.email ||
    assignment?.guide?.email ||
    assignment?.guide_email ||
    assignment?.user?.email ||
    assignment?.email ||
    ''
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

  if (value === 'awaiting_payment') return 'Chờ thanh toán'
  if (value === 'paid') return 'Đã thanh toán'
  if (value === 'confirmed') return 'Sắp diễn ra'
  if (value === 'upcoming') return 'Sắp diễn ra'
  if (value === 'departed') return 'Đang diễn ra'
  if (value === 'completed') return 'Đã kết thúc'
  if (value === 'pending') return 'Chờ xử lý'
  if (value === 'cancelled' || value === 'canceled') return 'Đã hủy'
  if (value === 'cancelled_by_tour') return 'Đã hủy'

  return status || '—'
}

function getStatusClass(status) {
  const value = String(status || '').toLowerCase()

  if (['paid', 'confirmed', 'completed'].includes(value)) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  }

  if (value === 'upcoming') {
    return 'bg-indigo-50 text-indigo-700 ring-indigo-100'
  }

  if (value === 'departed') {
    return 'bg-amber-50 text-amber-700 ring-amber-100'
  }

  if (['cancelled', 'canceled', 'cancelled_by_tour'].includes(value)) {
    return 'bg-rose-50 text-rose-700 ring-rose-100'
  }

  return 'bg-amber-50 text-amber-700 ring-amber-100'
}

function getAttendanceText(status) {
  return {
    checked_in: 'Đã điểm danh',
    checked_out: 'Đã trả khách',
    absent: 'Vắng mặt',
    not_checked_in: 'Chưa điểm danh',
  }[status] || 'Chưa điểm danh'
}

function formatTime(value) {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatTimelineDateTime(value) {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date)
}

function getItineraryStatusMeta(status) {
  return {
    completed: { label: 'Đã hoàn thành', activityClassName: 'is-confirmed', statusClassName: 'is-completed' },
    in_progress: { label: 'Đang thực hiện', activityClassName: 'is-in-progress', statusClassName: 'is-in-progress' },
    pending: { label: 'Chưa thực hiện', activityClassName: 'is-pending', statusClassName: 'is-pending' },
    skipped: { label: 'Đã bỏ qua', activityClassName: 'is-unconfirmed', statusClassName: 'is-skipped' },
  }[status] || { label: 'Chưa cập nhật', activityClassName: 'is-unknown', statusClassName: 'is-unknown' }
}

function addDays(value, offset) {
  const raw = String(value || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!raw) return null
  const [year, month, day] = raw.split('-').map(Number)
  const date = new Date(year, month - 1, day + Number(offset || 0))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
  const [tourDetail, setTourDetail] = useState(null)
  const [listMode, setListMode] = useState('bookings')
  const [expandedBookingId, setExpandedBookingId] = useState(null)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [selectedItineraryDay, setSelectedItineraryDay] = useState(1)

  useEffect(() => {
    let cancelled = false
    const tourId = departure?.tour_id || departure?.tour?.id || payload?.tour_id || payload?.tour?.id

    if (!open || !tourId) {
      setTourDetail(null)
      return undefined
    }

    setTourDetail(departure?.tour || payload?.tour || null)

    tourDepartureApi.getTourDetail(tourId)
      .then((response) => {
        const detail = response?.data?.data?.tour || response?.data?.data || response?.data

        if (!cancelled && detail && !Array.isArray(detail)) setTourDetail(detail)
      })
      .catch((requestError) => {
        console.warn('Không tải được chi tiết tour của lịch khởi hành.', requestError)
      })

    return () => {
      cancelled = true
    }
  }, [departure, open, payload])

  const departureId = getDepartureId(departure, payload)
  const totalSlots = Number(departure?.total_slots || payload?.total_slots || 0)
  const bookedSlots = Number(
    departure?.booked_slots ??
      payload?.booked_slots ??
      meta?.total ??
      customers.length ??
      0,
  )
  const bookingCount = Number(payload?.summary?.booking_count ?? meta?.total ?? customers.length)
  const guestCount = Number(payload?.summary?.guest_count ?? bookedSlots)
  const attendanceSessions = Array.isArray(payload?.attendance_sessions)
    ? payload.attendance_sessions
    : []
  const stages = Array.isArray(payload?.stages) ? payload.stages : []
  const itineraries = Array.isArray(tourDetail?.itineraries)
    ? tourDetail.itineraries
    : Array.isArray(tourDetail?.itinerary) ? tourDetail.itinerary : []
  const itineraryDayCount = Math.max(
    attendanceSessions.length,
    stages.reduce((max, item) => Math.max(max, Number(item?.day_number || 1)), 1),
    itineraries.reduce((max, item) => Math.max(max, Number(item?.day_number || 1)), 1),
  )
  const selectedDayActivities = (stages.length ? stages : itineraries)
    .filter((item, index) => Number(item?.day_number || index + 1) === Number(selectedItineraryDay))
    .sort((a, b) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0))
  const selectedSession = attendanceSessions.find(
    (session) => String(session.id) === String(selectedSessionId),
  ) || attendanceSessions[0] || null
  const participants = customers.flatMap((booking) =>
    (Array.isArray(booking?.participants) ? booking.participants : []).map((participant) => ({
      ...participant,
      booking_code: booking.booking_code,
    })),
  )
  const selectedTimeline = Array.isArray(selectedSession?.timeline) && selectedSession.timeline.length
    ? selectedSession.timeline
    : [
        ...(selectedSession?.photos || []).map((photo) => ({
          id: `photo-${photo.id}`,
          action: 'photos_uploaded',
          description: `Đã thêm ảnh ${photo.original_name || 'check-in'}.`,
          created_at: photo.created_at,
        })),
        ...participants.flatMap((participant) =>
          (participant.attendances || [])
            .filter((attendance) => String(attendance.attendance_session_id) === String(selectedSession?.id) && attendance.checked_in_at)
            .map((attendance) => ({
              id: `attendance-${attendance.id}`,
              action: 'checked_in',
              description: `Đã điểm danh ${participant.full_name}.`,
              created_at: attendance.checked_in_at,
            })),
        ),
      ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
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

          {tourDetail ? <TourDetailCard tour={tourDetail} /> : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailStat label="Tổng chỗ" value={totalSlots || '—'} tone="blue" />
            <DetailStat label="Số lượng khách" value={guestCount} tone="emerald" />
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
                  <span className="font-bold text-slate-800">Thời gian đặt:</span>{' '}
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
                  {getGuideEmail(leadAssignment) ? (
                    <p className="mt-1 break-all text-xs font-semibold text-slate-600">
                      {getGuideEmail(leadAssignment)}
                    </p>
                  ) : null}
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
                <h3 className="font-black text-slate-950">
                  {listMode === 'bookings' ? 'Danh sách booking' : listMode === 'participants' ? 'Danh sách người đi tour' : 'Theo dõi lịch trình tour'}
                </h3>
                <p className="text-sm text-slate-500">
                  {listMode === 'bookings'
                    ? 'Bấm “Xem chi tiết” để xem toàn bộ hành khách trong booking.'
                    : listMode === 'participants'
                      ? 'Theo dõi giờ điểm danh và ảnh check-in HDV đã tải lên.'
                      : 'Theo dõi trạng thái từng hoạt động hằng ngày do HDV xác nhận.'}
                </p>
              </div>
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-black">
                <button type="button" onClick={() => setListMode('bookings')} className={`rounded-lg px-3 py-2 transition ${listMode === 'bookings' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                  Booking ({bookingCount})
                </button>
                <button type="button" onClick={() => setListMode('participants')} className={`rounded-lg px-3 py-2 transition ${listMode === 'participants' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                  Người đi tour ({guestCount})
                </button>
                <button type="button" onClick={() => setListMode('itinerary')} className={`rounded-lg px-3 py-2 transition ${listMode === 'itinerary' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                  Lịch trình
                </button>
              </div>
            </div>

            {listMode === 'itinerary' ? (
              <div className="vg-itinerary-content vg-itinerary-admin-content">
                <div className="vg-itinerary-days" role="tablist" aria-label="Chọn ngày lịch trình">
                  {Array.from({ length: itineraryDayCount }).map((_, index) => {
                    const dayNumber = index + 1
                    const session = attendanceSessions[index]
                    const scheduledDate = session?.scheduled_date || addDays(departure?.departure_date || payload?.departure_date, index)
                    return (
                      <button key={dayNumber} type="button" role="tab" aria-selected={selectedItineraryDay === dayNumber} onClick={() => setSelectedItineraryDay(dayNumber)} className={selectedItineraryDay === dayNumber ? 'is-active' : ''}>
                        <span>Ngày {dayNumber}</span>
                        <strong>{formatDate(scheduledDate)}</strong>
                      </button>
                    )
                  })}
                </div>

                {selectedDayActivities.length ? (
                  <div className="vg-itinerary-list">
                    {selectedDayActivities.map((activity, index) => {
                      const itinerary = activity?.itinerary || activity
                      const destination = itinerary?.destination_place || itinerary?.destinationPlace
                      const statusMeta = getItineraryStatusMeta(activity?.status)
                      return (
                        <article key={activity?.id || itinerary?.id || index} className={`vg-itinerary-activity ${statusMeta.activityClassName}`}>
                          <span className="vg-itinerary-number">{index + 1}</span>
                          <div className="vg-itinerary-activity-main">
                            <div className="vg-itinerary-activity-head">
                              <span className="vg-itinerary-time"><Icon name="clock" size={13} /> {String(activity?.start_time || itinerary?.start_time || '').slice(0, 5) || '--:--'}{activity?.end_time || itinerary?.end_time ? ` – ${String(activity?.end_time || itinerary?.end_time).slice(0, 5)}` : ''}</span>
                              <strong>{activity?.title || itinerary?.title || `Hoạt động ${index + 1}`}</strong>
                              <span className={`vg-itinerary-status ${statusMeta.statusClassName}`}>{statusMeta.label}</span>
                            </div>
                            {destination?.name ? <p className="vg-itinerary-destination"><Icon name="mapPin" size={14} /> <strong>{destination.name}</strong>{destination.address ? ` · ${destination.address}` : ''}</p> : null}
                            {itinerary?.description ? <p className="vg-itinerary-description">{String(itinerary.description).replace(/<[^>]*>/g, '')}</p> : null}
                            {(activity?.started_at || activity?.completed_at) ? (
                              <div className="vg-itinerary-updated">
                                {activity?.started_at ? <span>Bắt đầu: {formatTimelineDateTime(activity.started_at)}</span> : null}
                                {activity?.completed_at ? <span>Hoàn thành: {formatTimelineDateTime(activity.completed_at)}</span> : null}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : <div className="vg-itinerary-empty">Chưa có lịch trình cho ngày {selectedItineraryDay}.</div>}
              </div>
            ) : loading ? (
              <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                Đang tải danh sách khách đặt...
              </div>
            ) : customers.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                Chưa có khách đặt tour này.
              </div>
            ) : listMode === 'bookings' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Liên hệ</th>
                      <th className="px-4 py-3">Mã đặt</th>
                      <th className="px-4 py-3">Số khách</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((item, index) => {
                      const status =
                        item?.booking?.display_status ||
                        item?.display_status ||
                        item?.booking?.status ||
                        item?.status ||
                        item?.payment_status ||
                        ''

                      const rowId = item?.booking_id || item?.id || index
                      const isExpanded = String(expandedBookingId) === String(rowId)
                      const bookingParticipants = Array.isArray(item?.participants) ? item.participants : []

                      return [
                        <tr key={`booking-${rowId}`}>
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
                          <td className="px-4 py-3 font-black text-slate-700">
                            {item?.participants_count ?? item?.number_of_people ?? bookingParticipants.length}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${getStatusClass(status)}`}
                            >
                              {item?.display_status_label || item?.booking?.display_status_label || getStatusText(status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => setExpandedBookingId(isExpanded ? null : rowId)} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">
                              {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                            </button>
                          </td>
                        </tr>
                        , isExpanded ? (
                          <tr key={`detail-${rowId}`}>
                            <td colSpan={6} className="bg-slate-50 px-4 py-4">
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="mb-3 text-sm font-black text-slate-800">Thông tin khách trong booking {getBookingCode(item)}</p>
                                {bookingParticipants.length ? (
                                  <div className="grid gap-2 md:grid-cols-2">
                                    {bookingParticipants.map((participant, participantIndex) => (
                                      <div key={participant.id || participantIndex} className="rounded-lg border border-slate-100 p-3 text-sm">
                                        <p className="font-black text-slate-900">{participant.full_name}</p>
                                        <p className="mt-1 text-slate-500">{participant.phone || 'Chưa có SĐT'} · {participant.participant_type || 'Khách'}</p>
                                        <p className="mt-1 text-xs text-slate-400">Ngày sinh: {formatDate(participant.birth_date)}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-sm text-slate-500">Booking chưa có thông tin hành khách.</p>}
                              </div>
                            </td>
                          </tr>
                        ) : null,
                      ]
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                {attendanceSessions.length ? (
                  <>
                    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                      {attendanceSessions.map((session, index) => (
                        <button key={session.id} type="button" onClick={() => setSelectedSessionId(session.id)} className={`min-w-max rounded-xl border px-4 py-2 text-left text-xs font-bold ${String(selectedSession?.id) === String(session.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
                          <span className="block">{session.name || `Ngày ${index + 1}`}</span>
                          <span className="mt-1 block font-normal">{formatDate(session.scheduled_date)}</span>
                        </button>
                      ))}
                    </div>
                    {Array.isArray(selectedSession?.photos) && selectedSession.photos.length ? (
                      <div className="mb-4 rounded-xl bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-black uppercase text-slate-500">Ảnh check-in của HDV</p>
                        <div className="flex gap-3 overflow-x-auto">
                          {selectedSession.photos.map((photo) => (
                            <a key={photo.id} href={mediaUrl(photo.url)} target="_blank" rel="noreferrer" className="shrink-0">
                              <img src={mediaUrl(photo.url)} alt={photo.original_name || 'Ảnh check-in'} className="h-24 w-32 rounded-xl object-cover ring-1 ring-slate-200" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">HDV chưa tải ảnh check-in cho ngày này.</div>}
                    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">Timeline hoạt động HDV</p>
                          <p className="text-xs text-slate-500">Lịch sử điểm danh, chỉnh sửa và cập nhật ảnh của ngày này.</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{selectedTimeline.length} hoạt động</span>
                          <button
                            type="button"
                            onClick={() => setTimelineOpen((current) => !current)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                            aria-expanded={timelineOpen}
                          >
                            {timelineOpen ? 'Ẩn' : 'Hiện'}
                          </button>
                        </div>
                      </div>
                      {timelineOpen && selectedTimeline.length ? (
                        <div className="max-h-64 space-y-0 overflow-y-auto pr-1">
                          {selectedTimeline.map((activity, index) => (
                            <div key={activity.id || index} className="relative flex gap-3 pb-4 last:pb-0">
                              {index < selectedTimeline.length - 1 ? <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200" /> : null}
                              <span className={`relative mt-1 h-4 w-4 shrink-0 rounded-full ring-4 ring-white ${activity.action?.includes('photo') ? 'bg-violet-500' : activity.action?.includes('undo') || activity.action === 'attendance_updated' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800">{activity.description}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {activity.actor?.full_name || 'Hướng dẫn viên'} · {formatTimelineDateTime(activity.created_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : timelineOpen ? <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">Chưa có hoạt động trong ngày này.</p> : null}
                    </div>
                  </>
                ) : <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">Chưa có phiên điểm danh cho lịch khởi hành này.</div>}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500"><tr><th className="px-4 py-3">Hành khách</th><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Giờ điểm danh</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {participants.map((participant, index) => {
                        const attendance = (participant.attendances || []).find((item) => String(item.attendance_session_id) === String(selectedSession?.id))
                        const attendanceStatus = attendance?.status || 'not_checked_in'
                        return <tr key={participant.id || index}><td className="px-4 py-3"><p className="font-black text-slate-900">{participant.full_name}</p><p className="text-xs text-slate-400">{participant.phone || 'Chưa có SĐT'}</p></td><td className="px-4 py-3 font-bold text-slate-600">{participant.booking_code}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${attendanceStatus === 'checked_in' || attendanceStatus === 'checked_out' ? 'bg-emerald-50 text-emerald-700' : attendanceStatus === 'absent' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{getAttendanceText(attendanceStatus)}</span></td><td className="px-4 py-3 font-bold text-slate-600">{formatTime(attendance?.checked_in_at)}</td></tr>
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {listMode === 'bookings' && lastPage > 1 ? (
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
