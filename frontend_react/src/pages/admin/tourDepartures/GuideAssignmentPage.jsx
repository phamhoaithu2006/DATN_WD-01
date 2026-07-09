import { useCallback, useEffect, useMemo, useState } from 'react'
import { tourDepartureApi } from '../../../services/tourDepartureApi'

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

function toDateInputValue(value) {
  if (!value) return ''

  const matchedDate = String(value).match(/^\d{4}-\d{2}-\d{2}/)

  return matchedDate ? matchedDate[0] : ''
}

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

function formatDateShort(value) {
  const rawDate = toDateInputValue(value)

  if (!rawDate) return '—'

  const [year, month, day] = rawDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
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
      label: 'Hết HDV phù hợp',
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

function DirectGuideAssignmentPanel({
  departureOptions = [],
  focusedDepartureId = null,
  onAssigned,
  onRefreshPlanning,
}) {
  const [departureId, setDepartureId] = useState(focusedDepartureId || '')
  const [mode, setMode] = useState('eligible')
  const [keyword, setKeyword] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [languageIds, setLanguageIds] = useState([])
  const [languageOptions, setLanguageOptions] = useState([])
  const [loadingLanguages, setLoadingLanguages] = useState(false)
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [destinationOptions, setDestinationOptions] = useState([])
  const [loadingDestinations, setLoadingDestinations] = useState(false)
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyGuideId, setBusyGuideId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const selectedDeparture = useMemo(() => {
    return departureOptions.find(
      (item) => String(item.id) === String(departureId)
    )
  }, [departureOptions, departureId])

  const selectedDepartureAssignments = useMemo(() => {
    return getActiveAssignments(selectedDeparture)
  }, [selectedDeparture])

  const fetchDestinationOptions = useCallback(async () => {
    if (typeof tourDepartureApi.getDestinationOptions !== 'function') {
      setDestinationOptions([])
      return
    }

    try {
      setLoadingDestinations(true)

      const response = await tourDepartureApi.getDestinationOptions()

      setDestinationOptions(unwrapList(response))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDestinations(false)
    }
  }, [])

  useEffect(() => {
    void fetchDestinationOptions()
  }, [fetchDestinationOptions])

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

  const destinations = useMemo(() => {
    if (destinationOptions.length > 0) {
      return destinationOptions
    }

    return getUniqueDestinations(departureOptions)
  }, [destinationOptions, departureOptions])

  useEffect(() => {
    if (focusedDepartureId) {
      setDepartureId(String(focusedDepartureId))
      return
    }

    if (!departureId && departureOptions.length > 0) {
      setDepartureId(String(departureOptions[0].id))
    }
  }, [focusedDepartureId, departureId, departureOptions])

  useEffect(() => {
    if (!selectedDeparture) return

    setFrom((current) => current || toDateInputValue(selectedDeparture.departure_date))
    setTo((current) =>
      current ||
      toDateInputValue(selectedDeparture.return_date) ||
      toDateInputValue(selectedDeparture.departure_date)
    )
  }, [selectedDeparture])

  const fetchGuides = useCallback(async () => {
    if (!departureId) {
      setGuides([])
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await tourDepartureApi.getDirectGuideCandidates(
        departureId,
        {
          mode,
          keyword: keyword.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
          destination_id: destinationId || undefined,
          language_ids: languageIds.length > 0 ? languageIds : undefined,
          per_page: 50,
        }
      )

      setGuides(unwrapList(response))
    } catch (err) {
      setError(getError(err, 'Không tải được danh sách HDV.'))
    } finally {
      setLoading(false)
    }
  }, [departureId, mode, keyword, from, to, destinationId, languageIds])

  useEffect(() => {
    void fetchGuides()
  }, [fetchGuides])

  async function assignGuide(guide, forceAreaMismatch = false) {
    if (!departureId) {
      setError('Vui lòng chọn lịch khởi hành trước khi phân công.')
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
          forceAreaMismatch,
        }
      )

      setMessage(response.data?.message || 'Đã phân công HDV.')
      await fetchGuides()
      await onRefreshPlanning?.()
      await onAssigned?.()
    } catch (err) {
      const code = err?.response?.data?.code

      if (code === 'AREA_MISMATCH_CONFIRM_REQUIRED') {
        const confirmed = window.confirm(
          'HDV này không phụ trách khu vực của tour. Bạn vẫn muốn phân công chứ?'
        )

        if (confirmed) {
          await assignGuide(guide, true)
        }

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

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Chọn lịch
            <select
              value={departureId}
              onChange={(event) => {
                setDepartureId(event.target.value)
                setGuides([])
                setMessage('')
                setError('')
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">-- Chọn lịch khởi hành --</option>

              {departureOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {getDepartureTitle(item)} · {formatDateShort(item.departure_date)}
                </option>
              ))}
            </select>
          </label>

          {selectedDeparture ? (
            <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <p className="font-bold text-blue-900">
                {getDepartureTitle(selectedDeparture)}
              </p>

              <p className="mt-1">
                {getDepartureDateRange(selectedDeparture)}
              </p>

              <p className="mt-1">
                Điểm đến: {getDestinationNames(selectedDeparture.destinations)}
              </p>

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
                  onChange={(event) => setFrom(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Đến ngày
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Khu vực phụ trách
              <select
                value={destinationId}
                onChange={(event) => setDestinationId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">
                  {loadingDestinations ? 'Đang tải khu vực...' : 'Tất cả khu vực'}
                </option>

                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                    {destination.province_city
                      ? ` - ${destination.province_city}`
                      : ''}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={fetchGuides}
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
              Mặc định hiển thị HDV phù hợp. Có thể chuyển sang tất cả HDV để phân công ngoài khu vực.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('eligible')}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                mode === 'eligible'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              HDV phù hợp
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
          ) : guides.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Không có HDV phù hợp với bộ lọc.
            </div>
          ) : (
            guides.map((guide) => {
              const isAvailable = guide.is_available !== false
              const isAreaMatch = Boolean(guide.is_area_match)
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

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isAreaMatch
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {isAreaMatch ? 'Đúng khu vực' : 'Khác khu vực'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="font-bold text-slate-800">
                      Khu vực phụ trách
                    </p>
                    <p className="mt-1">
                      {getDestinationNames(guide.destinations)}
                    </p>
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
                        assignedTours.map((assignment) => {
                          const departure = assignment.departure || {}
                          const tour = departure.tour || {}
                          const tourId = tour.id || departure.tour_id

                          return (
                            <div
                              key={assignment.id}
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
                                <a
                                  href={`/admin/tours/${tourId}`}
                                  className="mt-2 inline-flex text-sm font-bold text-blue-600 hover:text-blue-700"
                                >
                                  Xem chi tiết tour
                                </a>
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
                    disabled={!isAvailable || busyGuideId === guide.id}
                    onClick={() => assignGuide(guide)}
                    className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyGuideId === guide.id
                      ? 'Đang phân công...'
                      : isAreaMatch
                        ? 'Phân công'
                        : 'Phân công khác khu vực'}
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
  const [assignMode, setAssignMode] = useState('auto')
  const [directDepartureId, setDirectDepartureId] = useState(
    focusedDepartureId || ''
  )
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchPlanning = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await tourDepartureApi.getGuidePlanning({
        from: from || undefined,
        to: to || undefined,
        tour_id: selectedTourId || undefined,
        per_page: 50,
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

  const displayedRows = useMemo(() => {
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

  async function autoAssign(departureId) {
    try {
      setBusyId(departureId)
      setMessage('')
      setError('')

      const response = await tourDepartureApi.autoAssignGuide(departureId)

      setMessage(
        response.data?.message || 'Đã tự động phân công HDV.'
      )

      await fetchPlanning()
      await onAssigned?.()
    } catch (err) {
      setError(getError(err, 'Không thể tự động phân công HDV.'))
    } finally {
      setBusyId(null)
    }
  }

  async function undoAssignment(item) {
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
      await onAssigned?.()
    } catch (err) {
      setError(getError(err, 'Không thể hoàn tác phân công HDV.'))
    } finally {
      setBusyId(null)
    }
  }

  function openDirectAssignment(item) {
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
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-bold">Lưu ý:</span>{' '}
        Mặc định hệ thống chỉ hiển thị lịch khởi hành từ hôm nay đến 3 tháng tới.
        Với các lịch khởi hành xa hơn, vui lòng chọn khoảng thời gian ở bộ lọc bên dưới.
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-4">
        <label className="text-sm font-medium text-slate-700">
          Từ ngày

          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 font-normal"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Đến ngày

          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 font-normal"
          />
        </label>

        <button
          type="button"
          onClick={fetchPlanning}
          className="rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          Lọc lịch
        </button>
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
                  Không có lịch trong khoảng đã chọn.
                </td>
              </tr>
            ) : (
              displayedRows.map((item) => {
                const activeAssignments = getActiveAssignments(item)
                const hasAssignedGuide =
                  item.assignment_state === 'assigned' ||
                  activeAssignments.length > 0

                const meta = stateMeta(
                  hasAssignedGuide ? 'assigned' : item.assignment_state
                )

                return (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">
                      <strong className="block">
                        {getDepartureTitle(item)}
                      </strong>

                      <span className="text-slate-500">
                        {getDepartureDateRange(item)}
                      </span>
                    </td>

                    <td className="p-3">
                      {getDestinationNames(item.destinations)}
                    </td>

                    <td className="p-3">
                      {activeAssignments.length > 0
                        ? activeAssignments
                            .map((assignment) => getGuideName(assignment))
                            .join(', ')
                        : `Chưa phân (${item.available_guide_count || 0} HDV hợp lệ)`}
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </td>

                    <td className="p-3">
                      {hasAssignedGuide ? (
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
          onClick={() => setAssignMode('auto')}
          className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
            assignMode === 'auto'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          Tự động phân công
        </button>

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
      </div>

      {assignMode === 'direct' ? (
        <DirectGuideAssignmentPanel
          departureOptions={displayedRows}
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
