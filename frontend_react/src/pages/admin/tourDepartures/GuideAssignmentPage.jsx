import { useCallback, useEffect, useMemo, useState } from 'react'
import { tourDepartureApi } from '../../../services/tourDepartureApi'

import { formatDateDdMmYyyy, formatDateTimeDdMmYyyy } from '../../../utils/dateFormat'
function unwrapList(response) {
  const payload = response?.data

  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload)) return payload

  return []
}

function getError(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  if (error?.response?.status === 401) {
    return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  }

  if (error?.response?.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.'
  }

  return error?.response?.data?.message || fallback
}

function isDateRangeInvalid(from, to) {
  return Boolean(from && to && to < from)
}

function fieldInputClass(hasError, baseClass = '') {
  const normalClass = 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
  const errorClass = 'border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-100'

  return `${baseClass} ${hasError ? errorClass : normalClass}`
}

function FieldError({ message }) {
  if (!message) return null

  return (
    <p className="mt-1 text-xs font-bold text-rose-600">
      {message}
    </p>
  )
}

function toDateInputValue(value) {
  if (!value) return ''

  const matchedDate = String(value).match(/^\d{4}-\d{2}-\d{2}/)

  return matchedDate ? matchedDate[0] : ''
}

// Không dùng new Date()/Intl cho ngày dạng YYYY-MM-DD để tránh lệch timezone.
function formatDate(value) {
  const rawDate = toDateInputValue(value)

  if (!rawDate) return '—'

  const [year, month, day] = rawDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(date)
}

// Không dùng new Date()/Intl cho ngày dạng YYYY-MM-DD để tránh lệch timezone.
function formatDateShort(value) {
  const rawDate = toDateInputValue(value)

  if (!rawDate) return '—'

  const [year, month, day] = rawDate.split('-')

  if (!year || !month || !day) return '—'

  return `${day}/${month}/${year}`
}


const ALL_PLANNING_FROM = '1900-01-01'
const ALL_PLANNING_TO = '2099-12-31'

function getMonthKey(value) {
  const rawDate = toDateInputValue(value)

  return rawDate ? rawDate.slice(0, 7) : ''
}

function formatMonthLabel(monthKey) {
  if (!monthKey) return 'Không rõ tháng'

  const [year, month] = String(monthKey).split('-')

  if (!year || !month) return monthKey

  return `Tháng ${Number(month)}/${year}`
}

function getMonthRange(monthKey) {
  if (!monthKey || monthKey === 'all') return null

  const [year, month] = String(monthKey).split('-').map(Number)

  if (!year || !month) return null

  const firstDate = new Date(year, month - 1, 1)
  const lastDate = new Date(year, month, 0)

  if (Number.isNaN(firstDate.getTime()) || Number.isNaN(lastDate.getTime())) {
    return null
  }

  const toKey = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')

    return `${y}-${m}-${d}`
  }

  return {
    from: toKey(firstDate),
    to: toKey(lastDate),
  }
}

function getYearKey(value) {
  const rawDate = toDateInputValue(value)

  return rawDate ? rawDate.slice(0, 4) : ''
}

function getMonthNumberKey(value) {
  const rawDate = toDateInputValue(value)

  return rawDate ? rawDate.slice(5, 7) : ''
}

function getDepartureScheduleGroup(item) {
  const scheduleGroup = item?.schedule_group

  if (['upcoming', 'ongoing', 'past'].includes(scheduleGroup)) {
    return scheduleGroup
  }

  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const todayKey = `${year}-${month}-${day}`

  const departureDate = toDateInputValue(item?.departure_date)
  const returnDate = toDateInputValue(item?.return_date) || departureDate

  if (!departureDate) return 'upcoming'

  if (todayKey < departureDate) return 'upcoming'

  if (todayKey >= departureDate && todayKey <= returnDate) {
    return 'ongoing'
  }

  return 'past'
}

function isDepartureActionable(item) {
  return ['upcoming', 'ongoing'].includes(getDepartureScheduleGroup(item))
}

function getAssignmentRowClass(item) {
  if (!isDepartureActionable(item)) {
    return 'border-l-4 border-slate-300 bg-slate-50/80 hover:bg-slate-50'
  }

  if (isDepartureAssigned(item)) {
    return 'border-l-4 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-50'
  }

  return 'border-l-4 border-rose-300 bg-rose-50/75 hover:bg-rose-50'
}

function getAssignmentCellClass(item) {
  if (isDepartureAssigned(item)) {
    return 'font-bold text-emerald-800'
  }

  return 'font-bold text-rose-700'
}

function stateMeta(state) {
  if (state === 'assigned') {
    return {
      label: 'Đã phân công',
      className: 'bg-emerald-100 text-emerald-700',
    }
  }

  if (state === 'blocked') {
    return {
      label: 'Hết HDV đang trống lịch',
      className: 'bg-red-100 text-red-700',
    }
  }

  return {
    label: 'Chưa phân công',
    className: 'bg-amber-100 text-amber-700',
  }
}

function getTourId(item) {
  return item?.tour_id || item?.tour?.id || item?.tourId || null
}

function getAssignments(item) {
  if (Array.isArray(item?.assigned_guides)) {
    return item.assigned_guides
  }

  if (Array.isArray(item?.guide_assignments)) {
    return item.guide_assignments
  }

  if (Array.isArray(item?.guideAssignments)) {
    return item.guideAssignments
  }

  return []
}

function getActiveAssignments(item) {
  return getAssignments(item).filter(
    (assignment) =>
      !assignment.status || assignment.status === 'assigned'
  )
}

function getActiveAssignment(item) {
  const assignments = getActiveAssignments(item)

  return (
    assignments.find(
      (assignment) => assignment.role === 'lead' || !assignment.role
    ) ||
    assignments[0] ||
    null
  )
}

function isDepartureAssigned(item) {
  return (
    item?.assignment_state === 'assigned' ||
    getActiveAssignments(item).length > 0
  )
}

function compareDeparturesForAssignment(a, b) {
  const aAssigned = isDepartureAssigned(a) ? 1 : 0
  const bAssigned = isDepartureAssigned(b) ? 1 : 0

  if (aAssigned !== bAssigned) {
    return aAssigned - bAssigned
  }

  const aDate = toDateInputValue(a?.departure_date) || '9999-12-31'
  const bDate = toDateInputValue(b?.departure_date) || '9999-12-31'

  if (aDate !== bDate) {
    return aDate.localeCompare(bDate)
  }

  return Number(a?.id || 0) - Number(b?.id || 0)
}

function getGuideName(assignment) {
  return (
    assignment?.guide?.user?.full_name ||
    assignment?.guide?.user?.name ||
    assignment?.user?.full_name ||
    assignment?.user?.name ||
    assignment?.guide_name ||
    assignment?.guide?.guide_code ||
    `HDV #${assignment?.guide_id || assignment?.guide?.id || ''}`
  )
}

function getAssignmentGuideEmail(assignment) {
  return assignment?.guide?.user?.email || assignment?.user?.email || ''
}

function getAssignmentGuidePhone(assignment) {
  return assignment?.guide?.user?.phone || assignment?.user?.phone || ''
}

function getAssignmentGuideCode(assignment) {
  return (
    assignment?.guide?.guide_code ||
    assignment?.guide_code ||
    assignment?.guide_id ||
    assignment?.guide?.id ||
    ''
  )
}

function getAssignmentGuideId(assignment) {
  const id = assignment?.guide_id || assignment?.guide?.id || null

  return id ? String(id) : ''
}

function getAssignmentGuideFilterValue(assignment) {
  const id = getAssignmentGuideId(assignment)

  if (id) return `id:${id}`

  const name = getGuideName(assignment)

  return name ? `name:${String(name).trim().toLowerCase()}` : ''
}

function getGuideCandidateId(guide) {
  const id = guide?.id || guide?.guide_id || null

  return id ? String(id) : ''
}

function sortGuidesByAvailability(items = []) {
  return [...items].sort((a, b) => {
    const aAvailable = a?.is_available !== false ? 1 : 0
    const bAvailable = b?.is_available !== false ? 1 : 0

    if (aAvailable !== bAvailable) {
      return bAvailable - aAvailable
    }

    const aEligible = a?.is_eligible ? 1 : 0
    const bEligible = b?.is_eligible ? 1 : 0

    if (aEligible !== bEligible) {
      return bEligible - aEligible
    }

    const aAreaMatch = a?.is_area_match ? 1 : 0
    const bAreaMatch = b?.is_area_match ? 1 : 0

    if (aAreaMatch !== bAreaMatch) {
      return bAreaMatch - aAreaMatch
    }

    return getGuideDisplayName(a).localeCompare(getGuideDisplayName(b), 'vi')
  })
}

function getAssignmentGuideAvatar(assignment) {
  const avatar =
    assignment?.guide?.user?.avatar_url ||
    assignment?.user?.avatar_url ||
    assignment?.guide?.avatar_url ||
    assignment?.avatar_url ||
    ''

  if (!avatar) return ''

  const value = String(avatar).trim()

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value
  }

  if (value.startsWith('/storage/')) {
    return `http://127.0.0.1:8000${value}`
  }

  if (value.startsWith('storage/')) {
    return `http://127.0.0.1:8000/${value}`
  }

  return `http://127.0.0.1:8000/storage/${value}`
}

function getGuideDisplayName(guide) {
  return (
    guide?.user?.full_name ||
    guide?.user?.name ||
    guide?.full_name ||
    guide?.name ||
    guide?.guide_name ||
    guide?.guide_code ||
    `HDV #${guide?.id || ''}`
  )
}

function getGuideEmail(guide) {
  return guide?.user?.email || guide?.email || 'Chưa có email'
}

function getGuidePhone(guide) {
  return guide?.user?.phone || guide?.phone || 'Chưa có SĐT'
}

function getGuideLanguages(guide) {
  const languages = guide?.languages || guide?.language || guide?.guide_languages

  if (Array.isArray(languages)) {
    return languages
      .map((language) =>
        typeof language === 'string'
          ? language
          : language?.name || language?.language_name || ''
      )
      .filter(Boolean)
      .join(', ')
  }

  return languages || 'Chưa cập nhật'
}

function getDepartureTitle(item) {
  return item?.tour_title || item?.tour?.title || `Tour #${getTourId(item) || ''}`
}

function getGuideAvatar(guide) {
  const avatar =
    guide?.avatar_url ||
    guide?.user?.avatar_url ||
    guide?.avatar ||
    guide?.image ||
    ''

  if (!avatar) return ''

  const value = String(avatar).trim()

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value
  }

  if (value.startsWith('/storage/')) {
    return `http://127.0.0.1:8000${value}`
  }

  if (value.startsWith('storage/')) {
    return `http://127.0.0.1:8000/${value}`
  }

  return `http://127.0.0.1:8000/storage/${value}`
}

function getAvatarFallback(name) {
  return String(name || 'HDV')
    .trim()
    .charAt(0)
    .toUpperCase()
}

function getDepartureDateRange(item) {
  return `${formatDate(item?.departure_date)} – ${formatDate(
    item?.return_date || item?.departure_date
  )}`
}


function hasDepartureAssignedGuide(item) {
  return getActiveAssignments(item).length > 0 || item?.assignment_state === 'assigned'
}

function getDepartureSortDateKey(item) {
  return toDateInputValue(item?.departure_date) || '9999-12-31'
}

function sortDirectDepartureOptions(items = [], selectedId = '') {
  const selectedValue = selectedId ? String(selectedId) : ''

  return [...items].sort((a, b) => {
    const aSelected = selectedValue && String(a?.id) === selectedValue ? 1 : 0
    const bSelected = selectedValue && String(b?.id) === selectedValue ? 1 : 0

    if (aSelected !== bSelected) return bSelected - aSelected

    const aAssigned = hasDepartureAssignedGuide(a) ? 1 : 0
    const bAssigned = hasDepartureAssignedGuide(b) ? 1 : 0

    if (aAssigned !== bAssigned) return aAssigned - bAssigned

    const dateCompare = getDepartureSortDateKey(a).localeCompare(
      getDepartureSortDateKey(b)
    )

    if (dateCompare !== 0) return dateCompare

    return Number(a?.id || 0) - Number(b?.id || 0)
  })
}

function getDirectDepartureCardTone(item, isSelected = false) {
  if (isSelected) {
    return {
      card: 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-100',
      title: 'text-emerald-950',
      meta: 'text-emerald-700',
      badge: 'bg-emerald-600 text-white ring-emerald-200',
      badgeText: 'Đang chọn',
    }
  }

  if (!hasDepartureAssignedGuide(item)) {
    return {
      card: 'border-rose-200 bg-rose-50/80 text-rose-950 hover:border-rose-300 hover:bg-rose-50',
      title: 'text-rose-900',
      meta: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-700 ring-rose-200',
      badgeText: 'Chưa phân công',
    }
  }

  return {
    card: 'border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50/40',
    title: 'text-slate-900',
    meta: 'text-slate-500',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    badgeText: 'Đã phân công',
  }
}

function getDestinationNames(destinations = []) {
  if (!Array.isArray(destinations) || destinations.length === 0) {
    return 'Chưa gắn điểm đến'
  }

  return destinations
    .map((destination) => destination?.name)
    .filter(Boolean)
    .join(', ') || 'Chưa gắn điểm đến'
}

function getUniqueDestinations(items = []) {
  const map = new Map()

  items.forEach((item) => {
    ;(item.destinations || []).forEach((destination) => {
      if (destination?.id && !map.has(String(destination.id))) {
        map.set(String(destination.id), destination)
      }
    })
  })

  return Array.from(map.values())
}

function parseDateKey(value) {
  const rawDate = toDateInputValue(value)

  if (!rawDate) return null

  const [year, month, day] = rawDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return Number.isNaN(date.getTime()) ? null : date
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addMonths(date, amount) {
  const nextDate = new Date(date)
  nextDate.setMonth(nextDate.getMonth() + amount)

  return nextDate
}

function getMonthTitle(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function buildCalendarDays(cursor) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDate = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0)
  const days = []

  /* Monday-first calendar. */
  const firstDayIndex = (firstDate.getDay() + 6) % 7

  for (let i = 0; i < firstDayIndex; i += 1) {
    days.push(null)
  }

  for (let day = 1; day <= lastDate.getDate(); day += 1) {
    days.push(new Date(year, month, day))
  }

  return days
}

function isDateInRange(dateKey, from, to) {
  if (!dateKey || !from) return false

  const endDate = to || from

  return dateKey >= from && dateKey <= endDate
}

function CalendarFilter({ from, to, onChangeFrom, onChangeTo, selectedDeparture }) {
  const defaultDate =
    parseDateKey(from) ||
    parseDateKey(selectedDeparture?.departure_date) ||
    new Date()

  const [cursor, setCursor] = useState(
    () => new Date(defaultDate.getFullYear(), defaultDate.getMonth(), 1)
  )

  useEffect(() => {
    const nextDate =
      parseDateKey(from) || parseDateKey(selectedDeparture?.departure_date)

    if (nextDate) {
      setCursor(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
    }
  }, [from, selectedDeparture?.departure_date])

  const days = useMemo(() => buildCalendarDays(cursor), [cursor])
  const departureFrom = toDateInputValue(selectedDeparture?.departure_date)
  const departureTo =
    toDateInputValue(selectedDeparture?.return_date) || departureFrom

  const handleChooseDate = (date) => {
    const dateKey = toDateKey(date)

    if (!from || (from && to) || dateKey < from) {
      onChangeFrom(dateKey)
      onChangeTo('')
      return
    }

    onChangeTo(dateKey)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCursor((current) => addMonths(current, -1))}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
        >
          ‹
        </button>

        <strong className="text-sm capitalize text-slate-900">
          {getMonthTitle(cursor)}
        </strong>

        <button
          type="button"
          onClick={() => setCursor((current) => addMonths(current, 1))}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <span key={`empty-${index}`} className="h-9" />
          }

          const dateKey = toDateKey(date)
          const selected = isDateInRange(dateKey, from, to)
          const inDepartureRange = isDateInRange(
            dateKey,
            departureFrom,
            departureTo
          )

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => handleChooseDate(date)}
              className={`h-9 rounded-lg text-sm font-bold transition ${
                selected
                  ? 'bg-blue-600 text-white'
                  : inDepartureRange
                    ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
              title={inDepartureRange ? 'Ngày thuộc lịch tour đang chọn' : ''}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
          Đang lọc
        </span>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
          Ngày tour
        </span>
      </div>
    </div>
  )
}


function InlineTourDetailCard({ tour = {}, departure = {} }) {
  const tourId = tour?.id || departure?.tour_id || null
  const title = tour?.title || `Tour #${tourId || ''}`
  const description =
    tour?.description ||
    tour?.short_description ||
    tour?.summary ||
    tour?.overview ||
    ''

  const destinationName =
    tour?.destination?.name ||
    getDestinationNames(tour?.destinations || departure?.destinations || [])

  const price =
    tour?.price ||
    tour?.adult_price ||
    tour?.base_price ||
    tour?.selling_price ||
    ''

  const duration =
    tour?.duration ||
    tour?.duration_days ||
    tour?.number_of_days ||
    tour?.days ||
    ''

  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
            Chi tiết tour
          </p>

          <h4 className="mt-1 break-words font-black text-slate-900">
            {title}
          </h4>
        </div>

        {tourId ? (
          <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-blue-700">
            #{tourId}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 text-slate-600 sm:grid-cols-2">
        <p>
          <span className="font-bold text-slate-800">Ngày đi:</span>{' '}
          {formatDateShort(departure?.departure_date)}
        </p>

        <p>
          <span className="font-bold text-slate-800">Ngày về:</span>{' '}
          {formatDateShort(departure?.return_date || departure?.departure_date)}
        </p>

        {destinationName && destinationName !== 'Chưa gắn điểm đến' ? (
          <p>
            <span className="font-bold text-slate-800">Điểm đến:</span>{' '}
            {destinationName}
          </p>
        ) : null}

        {duration ? (
          <p>
            <span className="font-bold text-slate-800">Thời lượng:</span>{' '}
            {duration}
          </p>
        ) : null}

        {price ? (
          <p>
            <span className="font-bold text-slate-800">Giá:</span>{' '}
            {typeof price === 'number' ? price.toLocaleString('vi-VN') : price}
          </p>
        ) : null}

        {departure?.status ? (
          <p>
            <span className="font-bold text-slate-800">Trạng thái lịch:</span>{' '}
            {departure.status}
          </p>
        ) : null}
      </div>

      {description ? (
        <div className="mt-3 rounded-lg bg-white/80 p-3 text-slate-600">
          <p className="font-bold text-slate-800">Mô tả</p>
          <p className="mt-1 whitespace-pre-line">{description}</p>
        </div>
      ) : null}
    </div>
  )
}

function DirectGuideAssignmentPanel({
  departureOptions = [],
  focusedDepartureId = null,
  onAssigned,
  onRefreshPlanning,
}) {
  const [departureId, setDepartureId] = useState(focusedDepartureId || '')
  const [mode, setMode] = useState('available')
  const [keyword, setKeyword] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [languageIds, setLanguageIds] = useState([])
  const [languageOptions, setLanguageOptions] = useState([])
  const [loadingLanguages, setLoadingLanguages] = useState(false)
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyGuideId, setBusyGuideId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [openedTourCardKey, setOpenedTourCardKey] = useState(null)
  const [departureDropdownOpen, setDepartureDropdownOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const selectedDeparture = useMemo(() => {
    return departureOptions.find(
      (item) => String(item.id) === String(departureId)
    )
  }, [departureOptions, departureId])

  const selectedDepartureAssignments = useMemo(() => {
    return getActiveAssignments(selectedDeparture)
  }, [selectedDeparture])

  const sortedDepartureOptions = useMemo(() => {
    return sortDirectDepartureOptions(departureOptions, departureId)
  }, [departureOptions, departureId])

  const selectedDepartureHasAssignedGuide = selectedDepartureAssignments.length > 0
  const selectedDepartureTone = selectedDeparture
    ? getDirectDepartureCardTone(selectedDeparture, true)
    : null

  const selectedDepartureAssignedGuideIds = useMemo(() => {
    return new Set(
      selectedDepartureAssignments
        .map((assignment) => getAssignmentGuideId(assignment))
        .filter(Boolean)
    )
  }, [selectedDepartureAssignments])

  const visibleGuides = useMemo(() => {
    const filteredGuides = guides.filter((guide) => {
      const guideId = getGuideCandidateId(guide)
      const isFree = guide?.is_available !== false

      if (!guideId || selectedDepartureAssignedGuideIds.has(guideId)) {
        return false
      }

      if (mode === 'available') {
        return isFree
      }

      return true
    })

    return sortGuidesByAvailability(filteredGuides)
  }, [guides, mode, selectedDepartureAssignedGuideIds])

  function clearFieldError(fieldName) {
    setFieldErrors((current) => {
      if (!current[fieldName]) return current

      const next = { ...current }
      delete next[fieldName]

      return next
    })
  }

  function validateDirectFilters(options = {}) {
    const { requireDeparture = false } = options
    const nextErrors = {}

    if (requireDeparture && !departureId) {
      nextErrors.departureId = 'Vui lòng chọn lịch khởi hành.'
    }

    if (isDateRangeInvalid(from, to)) {
      nextErrors.to = 'Đến ngày phải lớn hơn hoặc bằng Từ ngày.'
    }

    setFieldErrors(nextErrors)

    const firstError = Object.values(nextErrors)[0]

    if (firstError) {
      setError(firstError)
      return false
    }

    return true
  }

  const fetchLanguageOptions = useCallback(async () => {
    if (typeof tourDepartureApi.getLanguages !== 'function') {
      setLanguageOptions([])
      return
    }

    try {
      setLoadingLanguages(true)

      const response = await tourDepartureApi.getLanguages()

      setLanguageOptions(unwrapList(response))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingLanguages(false)
    }
  }, [])

  useEffect(() => {
    void fetchLanguageOptions()
  }, [fetchLanguageOptions])

  function toggleLanguageId(languageId) {
    const value = String(languageId)

    setLanguageIds((current) =>
      current.includes(value)
        ? current.filter((id) => id !== value)
        : [...current, value]
    )
  }

  useEffect(() => {
    if (focusedDepartureId) {
      setDepartureId(String(focusedDepartureId))
      clearFieldError('departureId')
      setDepartureDropdownOpen(false)
      return
    }

    if (!departureId && sortedDepartureOptions.length > 0) {
      setDepartureId(String(sortedDepartureOptions[0].id))
      clearFieldError('departureId')
    }
  }, [focusedDepartureId, departureId, sortedDepartureOptions])

  useEffect(() => {
    if (!selectedDeparture) return

    setFrom((current) => current || toDateInputValue(selectedDeparture.departure_date))
    setTo((current) =>
      current ||
      toDateInputValue(selectedDeparture.return_date) ||
      toDateInputValue(selectedDeparture.departure_date)
    )
  }, [selectedDeparture])

  const fetchGuides = useCallback(async (extraHiddenGuideIds = []) => {
    if (!departureId) {
      setGuides([])
      return
    }

    if (isDateRangeInvalid(from, to)) {
      setGuides([])
      setFieldErrors((current) => ({
        ...current,
        to: 'Đến ngày phải lớn hơn hoặc bằng Từ ngày.',
      }))
      setError('Đến ngày phải lớn hơn hoặc bằng Từ ngày.')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await tourDepartureApi.getDirectGuideCandidates(
        departureId,
        {
          mode: 'all',
          keyword: keyword.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
          language_ids: languageIds.length > 0 ? languageIds : undefined,
          per_page: 50,
        }
      )

      const hiddenGuideIds = new Set(
        extraHiddenGuideIds
          .map((id) => String(id))
          .filter(Boolean)
      )

      setGuides(
        sortGuidesByAvailability(unwrapList(response)).filter((candidate) => {
          const candidateId = getGuideCandidateId(candidate)

          return candidateId && !hiddenGuideIds.has(candidateId)
        })
      )
    } catch (err) {
      setError(getError(err, 'Không tải được danh sách HDV.'))
    } finally {
      setLoading(false)
    }
  }, [departureId, mode, keyword, from, to, languageIds])

  useEffect(() => {
    void fetchGuides()
  }, [fetchGuides])

  async function assignGuide(guide, forceAreaMismatch = false) {
    if (!validateDirectFilters({ requireDeparture: true })) {
      return
    }

    if (!guide?.id) {
      setError('Vui lòng chọn HDV cần phân công.')
      return
    }

    try {
      setBusyGuideId(guide.id)
      setMessage('')
      setError('')

      const response = await tourDepartureApi.directAssignGuide(
        departureId,
        guide.id,
        {
          // Không chia HDV theo khu vực nữa, nên cho phép phân công khác khu vực.
          forceAreaMismatch: true,
        }
      )

      setMessage(response.data?.message || 'Đã phân công HDV.')
      setGuides((current) =>
        current.filter(
          (item) => getGuideCandidateId(item) !== String(guide.id)
        )
      )
      await onRefreshPlanning?.()
      await onAssigned?.({ departureId, type: 'assigned' })
      await fetchGuides([guide.id])
    } catch (err) {
      const code = err?.response?.data?.code

      if (code === 'AREA_MISMATCH_CONFIRM_REQUIRED') {
        setError('Backend vẫn đang chặn theo khu vực. Hãy kiểm tra hàm directAssignGuide để gửi force_area_mismatch = true.')
        return
      }

      setError(getError(err, 'Không thể phân công HDV.'))
    } finally {
      setBusyGuideId(null)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-black text-slate-900">
            Lịch khởi hành
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Chọn lịch và khoảng thời gian để kiểm tra HDV còn trống lịch.
          </p>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700">
                Chọn lịch
              </span>

              <span className="text-xs font-bold text-slate-500">
                {sortedDepartureOptions.filter((item) => !hasDepartureAssignedGuide(item)).length} chưa phân công
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDepartureDropdownOpen((current) => !current)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm outline-none transition focus:ring-2 ${
                  fieldErrors.departureId
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:border-rose-500 focus:ring-rose-100'
                    : selectedDepartureTone?.card || 'border-slate-300 bg-white text-slate-800 focus:border-blue-500 focus:ring-blue-100'
                }`}
              >
                <span className="min-w-0">
                  {selectedDeparture ? (
                    <>
                      <span className={`block truncate font-black ${selectedDepartureTone?.title || 'text-slate-900'}`}>
                        {selectedDepartureHasAssignedGuide ? 'Đã phân công' : 'Chưa phân công'} · {getDepartureTitle(selectedDeparture)}
                      </span>
                      <span className={`mt-0.5 block truncate text-xs font-semibold ${selectedDepartureTone?.meta || 'text-slate-500'}`}>
                        {getDepartureDateRange(selectedDeparture)}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500">-- Chọn lịch khởi hành --</span>
                  )}
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  {selectedDeparture ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${selectedDepartureTone?.badge || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                      {selectedDepartureTone?.badgeText || 'Đang chọn'}
                    </span>
                  ) : null}

                  <svg
                    viewBox="0 0 20 20"
                    className={`h-4 w-4 text-slate-500 transition ${departureDropdownOpen ? 'rotate-180' : ''}`}
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>

              <FieldError message={fieldErrors.departureId} />

              {departureDropdownOpen ? (
                <div className="absolute left-0 right-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {sortedDepartureOptions.length === 0 ? (
                    <div className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                      Chưa có lịch khởi hành.
                    </div>
                  ) : (
                    sortedDepartureOptions.map((item) => {
                      const isSelected = String(item.id) === String(departureId)
                      const tone = getDirectDepartureCardTone(item, isSelected)

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setDepartureId(String(item.id))
                            clearFieldError('departureId')
                            setGuides([])
                            setMessage('')
                            setError('')
                            setOpenedTourCardKey(null)
                            setDepartureDropdownOpen(false)
                          }}
                          className={`relative mb-2 w-full rounded-xl border px-3 py-3 text-left transition last:mb-0 ${tone.card}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-black ${tone.title}`}>
                                {getDepartureTitle(item)}
                              </p>

                              <p className={`mt-1 text-xs font-semibold ${tone.meta}`}>
                                {getDepartureDateRange(item)}
                              </p>
                            </div>

                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${tone.badge}`}>
                              {tone.badgeText}
                            </span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              ) : null}
            </div>

            {departureDropdownOpen ? (
              <p className="mt-2 text-xs text-slate-500">
                Danh sách đã được ẩn trong ô chọn lịch. Lịch chưa phân công được đưa lên trước để dễ chọn.
              </p>
            ) : null}
          </div>

          {selectedDeparture ? (
            <div className={`mt-4 rounded-lg border p-3 text-sm ${selectedDepartureTone?.card || 'border-blue-100 bg-blue-50 text-blue-800'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-bold ${selectedDepartureTone?.title || 'text-blue-900'}`}>
                    {getDepartureTitle(selectedDeparture)}
                  </p>

                  <p className={`mt-1 ${selectedDepartureTone?.meta || 'text-blue-700'}`}>
                    {getDepartureDateRange(selectedDeparture)}
                  </p>
                </div>

                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${selectedDepartureTone?.badge || 'bg-blue-100 text-blue-700 ring-blue-200'}`}>
                  {selectedDepartureHasAssignedGuide
                    ? 'Đang đổi / cập nhật'
                    : 'Đang chọn để phân công'}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-700">
                Điểm đến: {getDestinationNames(selectedDeparture.destinations)}
              </p>

              {!selectedDepartureHasAssignedGuide ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-white/80 p-2 text-sm font-bold text-rose-700">
                  Lịch này chưa được phân công HDV. Danh sách HDV bên phải đang dùng để phân công mới.
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-white/80 p-2 text-sm font-bold text-emerald-700">
                  Lịch này đã có HDV. Khi chọn HDV bên phải, hệ thống sẽ đổi/cập nhật HDV phụ trách.
                </div>
              )}

              <div className="mt-3 rounded-lg bg-white/80 p-3 text-slate-700">
                <p className="font-bold text-slate-900">
                  HDV đã phân công
                </p>

                {selectedDepartureAssignments.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedDepartureAssignments.map((assignment) => {
                      const guideName = getGuideName(assignment)
                      const email = getAssignmentGuideEmail(assignment)
                      const phone = getAssignmentGuidePhone(assignment)
                      const guideCode = getAssignmentGuideCode(assignment)
                      const avatar = getAssignmentGuideAvatar(assignment)

                      return (
                        <div
                          key={assignment.id || assignment.guide_id}
                          className="rounded-lg border border-blue-100 bg-white p-2"
                        >
                          <div className="flex items-start gap-2">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={guideName}
                                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-blue-50"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700 ring-2 ring-blue-50">
                                {getAvatarFallback(guideName)}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900">
                                {guideName}
                              </p>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                {guideCode ? (
                                  <span>Mã HDV: {guideCode}</span>
                                ) : null}

                                {email ? (
                                  <span>Email: {email}</span>
                                ) : null}

                                {phone ? (
                                  <span>SĐT: {phone}</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-slate-500">
                    Lịch này chưa có HDV được phân công.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <CalendarFilter
          from={from}
          to={to}
          onChangeFrom={setFrom}
          onChangeTo={setTo}
          selectedDeparture={selectedDeparture}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="font-black text-slate-900">Bộ lọc</h4>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-700">
                Từ ngày
                <input
                  type="date"
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value)
                    clearFieldError('from')
                    clearFieldError('to')
                  }}
                  className={fieldInputClass(
                    fieldErrors.from,
                    'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2'
                  )}
                />
                <FieldError message={fieldErrors.from} />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Đến ngày
                <input
                  type="date"
                  value={to}
                  onChange={(event) => {
                    setTo(event.target.value)
                    clearFieldError('to')
                  }}
                  className={fieldInputClass(
                    fieldErrors.to,
                    'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2'
                  )}
                />
                <FieldError message={fieldErrors.to} />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                if (validateDirectFilters({ requireDeparture: true })) {
                  void fetchGuides()
                }
              }}
              disabled={!departureId || loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Đang lọc...' : 'Lọc HDV'}
            </button>
          </div>
        </div>
      </aside>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Danh sách HDV
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Mặc định hiển thị HDV đang trống lịch. Có thể chuyển sang tất cả HDV để xem cả HDV đang bận.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('available')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                mode === 'available'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              HDV đang trống lịch
            </button>

            <button
              type="button"
              onClick={() => setMode('all')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                mode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả HDV
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Tìm theo tên, SĐT, email..."
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setLanguageDropdownOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <span
                className={
                  languageIds.length > 0 ? 'text-slate-900' : 'text-slate-400'
                }
              >
                {languageIds.length > 0
                  ? `Đã chọn ${languageIds.length} ngôn ngữ`
                  : 'Lọc theo ngôn ngữ'}
              </span>

              <span className="text-xs text-slate-400">
                {languageDropdownOpen ? '▲' : '▼'}
              </span>
            </button>

            {languageDropdownOpen ? (
              <div className="absolute left-0 right-0 z-30 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Chọn ngôn ngữ
                  </span>

                  {languageIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setLanguageIds([])}
                      className="text-xs font-bold text-blue-600 transition hover:text-blue-700"
                    >
                      Bỏ chọn
                    </button>
                  ) : null}
                </div>

                {loadingLanguages ? (
                  <p className="text-sm text-slate-500">
                    Đang tải ngôn ngữ...
                  </p>
                ) : languageOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Chưa có dữ liệu ngôn ngữ.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {languageOptions.map((languageItem) => {
                      const value = String(languageItem.id)
                      const checked = languageIds.includes(value)
                      const label =
                        languageItem.name ||
                        languageItem.language_name ||
                        `Ngôn ngữ #${languageItem.id}`

                      return (
                        <label
                          key={languageItem.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                            checked
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLanguageId(languageItem.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />

                          <span>{label}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 2xl:grid-cols-2">
          {loading ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Đang tải danh sách HDV...
            </div>
          ) : visibleGuides.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Không có HDV đang trống lịch với bộ lọc.
            </div>
          ) : (
            visibleGuides.map((guide) => {
              const isAvailable = guide.is_available !== false
              const assignedTours = Array.isArray(guide.assigned_tours)
                ? guide.assigned_tours
                : []

              return (
                <article
                  key={guide.id}
                  className="rounded-xl border border-slate-200 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {getGuideAvatar(guide) ? (
                        <img
                          src={getGuideAvatar(guide)}
                          alt={getGuideDisplayName(guide)}
                          className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-black text-blue-700 ring-2 ring-slate-100">
                          {getAvatarFallback(getGuideDisplayName(guide))}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="truncate font-black text-slate-900">
                          {getGuideDisplayName(guide)}
                        </h4>

                        <p className="mt-1 break-words text-sm text-slate-500">
                          {getGuideEmail(guide)} · {getGuidePhone(guide)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Ngôn ngữ: {getGuideLanguages(guide)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {isAvailable ? 'Trống lịch' : 'Bận lịch'}
                      </span>

                    </div>
                  </div>

                  {Array.isArray(guide.blocking_reasons) &&
                  guide.blocking_reasons.length > 0 ? (
                    <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                      {guide.blocking_reasons.map((reason) => (
                        <p key={reason}>• {reason}</p>
                      ))}
                    </div>
                  ) : null}

                  <details className="mt-3 rounded-lg bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-bold text-slate-700">
                      Xem chi tiết HDV
                    </summary>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <p>
                        <span className="font-bold text-slate-800">Mã HDV:</span>{' '}
                        {guide.guide_code || `HDV #${guide.id}`}
                      </p>
                      <p>
                        <span className="font-bold text-slate-800">Email:</span>{' '}
                        {getGuideEmail(guide)}
                      </p>
                      <p>
                        <span className="font-bold text-slate-800">SĐT:</span>{' '}
                        {getGuidePhone(guide)}
                      </p>
                    </div>
                  </details>

                  <details className="mt-3 rounded-lg bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-bold text-slate-700">
                      Xem tour đang được phân công
                    </summary>

                    <div className="mt-3 space-y-2">
                      {assignedTours.length > 0 ? (
                        assignedTours.map((assignment, assignmentIndex) => {
                          const departure = assignment.departure || {}
                          const tour = departure.tour || {}
                          const tourId = tour.id || departure.tour_id
                          const tourCardKey = `${guide.id}-${
                            assignment.id || tourId || assignmentIndex
                          }`

                          return (
                            <div
                              key={assignment.id || tourCardKey}
                              className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                            >
                              <p className="font-bold text-slate-900">
                                {tour.title || `Tour #${tourId || ''}`}
                              </p>

                              <p className="mt-1 text-slate-500">
                                {formatDateShort(departure.departure_date)} –{' '}
                                {formatDateShort(
                                  departure.return_date || departure.departure_date
                                )}
                              </p>

                              {tourId ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenedTourCardKey((current) =>
                                      current === tourCardKey ? null : tourCardKey
                                    )
                                  }
                                  className="mt-2 inline-flex text-sm font-bold text-blue-600 hover:text-blue-700"
                                >
                                  {openedTourCardKey === tourCardKey
                                    ? 'Ẩn chi tiết tour'
                                    : 'Xem chi tiết tour'}
                                </button>
                              ) : null}

                              {openedTourCardKey === tourCardKey ? (
                                <InlineTourDetailCard
                                  tour={tour}
                                  departure={departure}
                                />
                              ) : null}
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-sm text-slate-500">
                          HDV chưa có tour nào trong khoảng thời gian này.
                        </p>
                      )}
                    </div>
                  </details>

                  <button
                    type="button"
                    disabled={
                      !isAvailable ||
                      !departureId ||
                      isDateRangeInvalid(from, to) ||
                      busyGuideId === guide.id
                    }
                    onClick={() => assignGuide(guide)}
                    className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyGuideId === guide.id ? 'Đang phân công...' : 'Phân công'}
                  </button>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

export function GuideAssignmentPanel({
  selectedTourId = '',
  focusedDepartureId = null,
  onAssigned,
  onClearFocus,
  embedded = false,
}) {
  const [assignMode, setAssignMode] = useState('direct')
  const [directDepartureId, setDirectDepartureId] = useState(
    focusedDepartureId || ''
  )
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [scheduleTimeFilter, setScheduleTimeFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [guideFilter, setGuideFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [autoValidationErrors, setAutoValidationErrors] = useState({})

  function clearAutoValidationError(fieldName) {
    setAutoValidationErrors((current) => {
      if (!current[fieldName]) return current

      const next = { ...current }
      delete next[fieldName]

      return next
    })
  }

  function validateAutoFilters() {
    const nextErrors = {}

    if (isDateRangeInvalid(from, to)) {
      nextErrors.to = 'Đến ngày phải lớn hơn hoặc bằng Từ ngày.'
    }

    setAutoValidationErrors(nextErrors)

    const firstError = Object.values(nextErrors)[0]

    if (firstError) {
      setError(firstError)
      return false
    }

    return true
  }

  const fetchPlanning = useCallback(async () => {
    if (isDateRangeInvalid(from, to)) {
      setAutoValidationErrors((current) => ({
        ...current,
        to: 'Đến ngày phải lớn hơn hoặc bằng Từ ngày.',
      }))
      setError('Đến ngày phải lớn hơn hoặc bằng Từ ngày.')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await tourDepartureApi.getGuidePlanning({
        from: from || ALL_PLANNING_FROM,
        to: to || ALL_PLANNING_TO,
        tour_id: selectedTourId || undefined,
        per_page: 100,
      })

      setRows(unwrapList(response))
    } catch (err) {
      setError(getError(err, 'Không tải được danh sách phân công.'))
    } finally {
      setLoading(false)
    }
  }, [from, to, selectedTourId])

  useEffect(() => {
    void fetchPlanning()
  }, [fetchPlanning])

  useEffect(() => {
    if (focusedDepartureId) {
      setDirectDepartureId(String(focusedDepartureId))
    }
  }, [focusedDepartureId])

  const scopedRows = useMemo(() => {
    return rows.filter((item) => {
      if (focusedDepartureId) {
        return String(item.id) === String(focusedDepartureId)
      }

      if (selectedTourId) {
        return String(getTourId(item)) === String(selectedTourId)
      }

      return true
    })
  }, [rows, selectedTourId, focusedDepartureId])

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const value = String(index + 1).padStart(2, '0')

      return {
        key: value,
        label: `Tháng ${index + 1}`,
      }
    })
  }, [])

  const yearOptions = useMemo(() => {
    const years = new Set()

    scopedRows.forEach((item) => {
      const year = getYearKey(item?.departure_date)

      if (year) {
        years.add(year)
      }
    })

    return Array.from(years)
      .sort((a, b) => Number(b) - Number(a))
      .map((year) => ({
        key: year,
        label: `Năm ${year}`,
      }))
  }, [scopedRows])

  const monthYearFilteredRows = useMemo(() => {
    return scopedRows.filter((item) => {
      const month = getMonthNumberKey(item?.departure_date)
      const year = getYearKey(item?.departure_date)

      if (monthFilter !== 'all' && month !== monthFilter) {
        return false
      }

      if (yearFilter !== 'all' && year !== yearFilter) {
        return false
      }

      return true
    })
  }, [scopedRows, monthFilter, yearFilter])

  const guideFilterOptions = useMemo(() => {
    const guides = new Map()

    monthYearFilteredRows.forEach((item) => {
      getActiveAssignments(item).forEach((assignment) => {
        const value = getAssignmentGuideFilterValue(assignment)
        const label = getGuideName(assignment)

        if (value && label && !guides.has(value)) {
          guides.set(value, label)
        }
      })
    })

    return Array.from(guides.entries())
      .sort(([, aLabel], [, bLabel]) =>
        String(aLabel).localeCompare(String(bLabel), 'vi')
      )
      .map(([value, label]) => ({
        value,
        label,
      }))
  }, [monthYearFilteredRows])

  const scheduleFilterCounts = useMemo(() => {
    return monthYearFilteredRows.reduce(
      (acc, item) => {
        const group = getDepartureScheduleGroup(item)

        if (group === 'upcoming') acc.upcoming += 1
        if (group === 'ongoing') acc.ongoing += 1
        if (group === 'past') acc.past += 1

        acc.all += 1

        return acc
      },
      {
        upcoming: 0,
        ongoing: 0,
        past: 0,
        all: 0,
      }
    )
  }, [monthYearFilteredRows])

  const scheduleFilterTabs = useMemo(() => {
    return [
      {
        key: 'upcoming',
        label: 'Sắp tới',
        count: scheduleFilterCounts.upcoming,
      },
      {
        key: 'ongoing',
        label: 'Đang diễn ra',
        count: scheduleFilterCounts.ongoing,
      },
      {
        key: 'past',
        label: 'Đã qua',
        count: scheduleFilterCounts.past,
      },
      {
        key: 'all',
        label: 'Tất cả',
        count: scheduleFilterCounts.all,
      },
    ]
  }, [scheduleFilterCounts])

  const baseDisplayedRows = useMemo(() => {
    return monthYearFilteredRows.filter((item) => {
      const group = getDepartureScheduleGroup(item)

      if (scheduleTimeFilter === 'all') {
        return true
      }

      return group === scheduleTimeFilter
    })
  }, [monthYearFilteredRows, scheduleTimeFilter])

  const guideFilteredRows = useMemo(() => {
    if (guideFilter === 'all') {
      return baseDisplayedRows
    }

    if (guideFilter === 'none') {
      return baseDisplayedRows.filter((item) => !isDepartureAssigned(item))
    }

    return baseDisplayedRows.filter((item) =>
      getActiveAssignments(item).some(
        (assignment) => getAssignmentGuideFilterValue(assignment) === guideFilter
      )
    )
  }, [baseDisplayedRows, guideFilter])

  const assignmentFilterCounts = useMemo(() => {
    return guideFilteredRows.reduce(
      (acc, item) => {
        if (isDepartureAssigned(item)) {
          acc.assigned += 1
        } else {
          acc.unassigned += 1
        }

        acc.all += 1

        return acc
      },
      {
        all: 0,
        unassigned: 0,
        assigned: 0,
      }
    )
  }, [guideFilteredRows])

  const assignmentFilterTabs = useMemo(() => {
    return [
      { key: 'all', label: 'Tất cả', count: assignmentFilterCounts.all },
      {
        key: 'unassigned',
        label: 'Chưa phân công',
        count: assignmentFilterCounts.unassigned,
      },
      {
        key: 'assigned',
        label: 'Đã phân công',
        count: assignmentFilterCounts.assigned,
      },
    ]
  }, [assignmentFilterCounts])

  const displayedRows = useMemo(() => {
    return guideFilteredRows
      .filter((item) => {
        if (assignmentFilter === 'assigned') {
          return isDepartureAssigned(item)
        }

        if (assignmentFilter === 'unassigned') {
          return !isDepartureAssigned(item)
        }

        return true
      })
      .sort(compareDeparturesForAssignment)
  }, [guideFilteredRows, assignmentFilter])

  const actionableDirectDepartureOptions = useMemo(() => {
    return displayedRows.filter((item) => isDepartureActionable(item))
  }, [displayedRows])

  async function autoAssign(departureId) {
    const departure = rows.find((item) => String(item.id) === String(departureId))

    if (departure && !isDepartureActionable(departure)) {
      setError('Lịch khởi hành đã qua nên chỉ được xem, không thể phân công HDV.')
      return
    }

    try {
      setBusyId(departureId)
      setMessage('')
      setError('')

      const response = await tourDepartureApi.autoAssignGuide(departureId)

      setMessage(
        response.data?.message || 'Đã tự động phân công HDV.'
      )

      await fetchPlanning()
      await onAssigned?.({ departureId, type: 'assigned' })
    } catch (err) {
      setError(getError(err, 'Không thể tự động phân công HDV.'))
    } finally {
      setBusyId(null)
    }
  }

  async function undoAssignment(item) {
    if (!isDepartureActionable(item)) {
      setError('Lịch khởi hành đã qua nên chỉ được xem, không thể hoàn tác phân công.')
      return
    }

    const assignment = getActiveAssignment(item)

    if (!assignment?.id) {
      setError('Không tìm thấy phân công HDV để hoàn tác.')
      return
    }

    const confirmed = window.confirm(
      'Bạn có chắc muốn hoàn tác phân công HDV cho lịch này không?'
    )

    if (!confirmed) return

    try {
      setBusyId(item.id)
      setMessage('')
      setError('')

      const response = await tourDepartureApi.cancelGuideAssignment(
        item.id,
        assignment.id
      )

      setMessage(
        response.data?.message || 'Đã hoàn tác phân công HDV.'
      )

      await fetchPlanning()
      await onAssigned?.({ departureId: item.id, type: 'cancelled' })
    } catch (err) {
      setError(getError(err, 'Không thể hoàn tác phân công HDV.'))
    } finally {
      setBusyId(null)
    }
  }

  function openDirectAssignment(item) {
    if (!isDepartureActionable(item)) {
      setMessage('Lịch khởi hành đã qua nên chỉ được xem, không thể phân công HDV.')
      return
    }

    setDirectDepartureId(String(item.id))
    setAssignMode('direct')
    setMessage(
      `Đang phân công trực tiếp cho ${getDepartureTitle(item)} - ${formatDateShort(
        item.departure_date
      )}.`
    )
    setError('')
  }

  const autoAssignmentContent = (
    <>
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <span className="font-bold">Lưu ý:</span>{' '}
        Chọn nhanh trạng thái lịch bằng các nút Sắp tới, Đang diễn ra, Đã qua hoặc Tất cả bên dưới.
      </div>

      <div className="mb-5 rounded-xl bg-slate-50 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,240px)_minmax(180px,220px)_minmax(180px,220px)_auto_auto]">
          <label className="text-sm font-medium text-slate-700">
            HDV

            <select
              value={guideFilter}
              onChange={(event) => setGuideFilter(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Tất cả HDV</option>
              <option value="none">Chưa có HDV</option>

              {guideFilterOptions.map((guide) => (
                <option key={guide.value} value={guide.value}>
                  {guide.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Từ ngày

            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                clearAutoValidationError('from')
                clearAutoValidationError('to')
              }}
              className={fieldInputClass(
                autoValidationErrors.from,
                'mt-1 block w-full rounded-lg border bg-white px-3 py-2 font-normal outline-none transition focus:ring-2'
              )}
            />
            <FieldError message={autoValidationErrors.from} />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Đến ngày

            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value)
                clearAutoValidationError('to')
              }}
              className={fieldInputClass(
                autoValidationErrors.to,
                'mt-1 block w-full rounded-lg border bg-white px-3 py-2 font-normal outline-none transition focus:ring-2'
              )}
            />
            <FieldError message={autoValidationErrors.to} />
          </label>

          <button
            type="button"
            onClick={() => {
              if (validateAutoFilters()) {
                void fetchPlanning()
              }
            }}
            className="self-end rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700"
          >
            Lọc lịch
          </button>

          <button
            type="button"
            onClick={() => {
              setScheduleTimeFilter('all')
              setMonthFilter('all')
              setYearFilter('all')
              setAssignmentFilter('all')
              setGuideFilter('all')
              setFrom('')
              setTo('')
            }}
            className="self-end rounded-lg bg-white px-4 py-2 font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            Xem tất cả
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {scheduleFilterTabs.map((tab) => {
          const isActive = scheduleTimeFilter === tab.key

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setScheduleTimeFilter(tab.key)}
              className={`rounded-lg px-4 py-2.5 text-[15px] font-medium whitespace-nowrap transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <select
          value={assignmentFilter}
          onChange={(event) => setAssignmentFilter(event.target.value)}
          className="min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {assignmentFilterTabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label} ({tab.count})
            </option>
          ))}
        </select>

        <p className="text-sm font-medium text-slate-500">
          Ưu tiên hiển thị lịch chưa phân công trước.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Tour / lịch khởi hành</th>
              <th className="p-3">Điểm đến</th>
              <th className="p-3">HDV</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500">
                  Đang tải...
                </td>
              </tr>
            ) : displayedRows.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500">
                  {assignmentFilter === 'assigned'
                    ? 'Không có lịch đã phân công trong khoảng đã chọn.'
                    : assignmentFilter === 'unassigned'
                      ? 'Không có lịch chưa phân công trong khoảng đã chọn.'
                      : scheduleTimeFilter === 'past'
                        ? 'Không có lịch đã qua trong bộ lọc hiện tại.'
                        : 'Không có lịch trong bộ lọc hiện tại.'}
                </td>
              </tr>
            ) : (
              displayedRows.map((item) => {
                const activeAssignments = getActiveAssignments(item)
                const hasAssignedGuide = isDepartureAssigned(item)
                const actionable = isDepartureActionable(item)

                const meta = stateMeta(
                  hasAssignedGuide ? 'assigned' : item.assignment_state
                )

                return (
                  <tr
                    key={item.id}
                    className={`border-t transition ${getAssignmentRowClass(item)}`}
                  >
                    <td className="p-3">
                      <strong className="block">
                        {getDepartureTitle(item)}
                      </strong>

                      <span className="text-slate-500">
                        {getDepartureDateRange(item)}
                      </span>

                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          getDepartureScheduleGroup(item) === 'past'
                            ? 'bg-slate-200 text-slate-600'
                            : getDepartureScheduleGroup(item) === 'ongoing'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {getDepartureScheduleGroup(item) === 'past'
                          ? 'Đã qua'
                          : getDepartureScheduleGroup(item) === 'ongoing'
                            ? 'Đang diễn ra'
                            : 'Sắp tới'}
                      </span>
                    </td>

                    <td className="p-3">
                      {getDestinationNames(item.destinations)}
                    </td>

                    <td className="p-3">
                      {activeAssignments.length > 0 ? (
                        <span className={getAssignmentCellClass(item)}>
                          {activeAssignments
                            .map((assignment) => getGuideName(assignment))
                            .join(', ')}
                        </span>
                      ) : (
                        <span className={getAssignmentCellClass(item)}>
                          Chưa phân ({item.available_guide_count || 0} HDV hợp lệ)
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </td>

                    <td className="p-3">
                      {!actionable ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
                            Đã qua - chỉ xem
                          </span>
                        </div>
                      ) : hasAssignedGuide ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => undoAssignment(item)}
                            className="rounded bg-rose-600 px-3 py-2 text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busyId === item.id
                              ? 'Đang hoàn tác...'
                              : 'Hoàn tác'}
                          </button>

                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => openDirectAssignment(item)}
                            className="rounded bg-slate-700 px-3 py-2 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Đổi trực tiếp
                          </button>
                        </div>
                      ) : item.assignment_state === 'available' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => autoAssign(item.id)}
                            className="rounded bg-blue-600 px-3 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busyId === item.id
                              ? 'Đang phân...'
                              : 'Tự động phân công'}
                          </button>

                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => openDirectAssignment(item)}
                            className="rounded bg-indigo-600 px-3 py-2 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Trực tiếp
                          </button>
                        </div>
                      ) : item.assignment_state === 'blocked' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-red-600">
                            Kiểm tra khu vực HDV hoặc lịch đang kín.
                          </span>

                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => openDirectAssignment(item)}
                            className="rounded bg-indigo-600 px-3 py-2 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Trực tiếp
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => autoAssign(item.id)}
                            className="rounded bg-blue-600 px-3 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busyId === item.id
                              ? 'Đang phân...'
                              : 'Tự động phân công'}
                          </button>

                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => openDirectAssignment(item)}
                            className="rounded bg-indigo-600 px-3 py-2 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Trực tiếp
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )

  const content = (
    <div>
      {!embedded ? (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Phân công HDV
          </h2>

          <p className="mt-1 text-slate-500">
            Tự động chọn HDV đúng khu vực hoặc phân công trực tiếp theo lịch trống.
          </p>
        </div>
      ) : null}

      {focusedDepartureId ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sky-50 p-3 text-sm text-sky-700">
          <span>
            Đang xem phân công của một lịch khởi hành được chọn.
          </span>

          <button
            type="button"
            onClick={onClearFocus}
            className="rounded bg-white px-3 py-1.5 font-medium text-sky-700 ring-1 ring-sky-200"
          >
            Xem tất cả
          </button>
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setAssignMode('direct')}
          className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
            assignMode === 'direct'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          Phân công trực tiếp
        </button>

        <button
          type="button"
          onClick={() => setAssignMode('auto')}
          className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
            assignMode === 'auto'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          Tự động phân công
        </button>
      </div>

      {assignMode === 'direct' ? (
        <DirectGuideAssignmentPanel
          departureOptions={actionableDirectDepartureOptions}
          focusedDepartureId={directDepartureId || focusedDepartureId}
          onAssigned={onAssigned}
          onRefreshPlanning={fetchPlanning}
        />
      ) : (
        autoAssignmentContent
      )}
    </div>
  )

  if (embedded) {
    return content
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-6">
      {content}
    </section>
  )
}

export default GuideAssignmentPanel