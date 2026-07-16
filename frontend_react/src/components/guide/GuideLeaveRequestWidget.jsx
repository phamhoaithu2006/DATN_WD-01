import { useEffect, useMemo, useState } from 'react'
import {
  cancelGuideLeaveRequest,
  createGuideLeaveRequest,
  getGuideLeaveRequests,
  getGuideLeaveRequestSummary,
  normalizeItems,
} from '../../services/guideLeaveRequestApi'
import { getGuideTours } from '../../services/guideTourApi'

const emptyForm = {
  start_date: '',
  end_date: '',
  reason: '',
  evidence: [],
}

function normalizeTourItems(response) {
  const payload = response?.data ?? response
  const data = payload?.data ?? payload

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
}

function toDateInputValue(value) {
  if (!value) return ''

  const matchedDate = String(value).match(/^\d{4}-\d{2}-\d{2}/)

  return matchedDate ? matchedDate[0] : ''
}

function getTourTitle(item) {
  return (
    item?.tour?.title ||
    item?.tour_title ||
    item?.title ||
    `Tour #${item?.tour_id || item?.id || ''}`
  )
}


function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function addOneDayKey(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number)

  if (!year || !month || !day) return ''

  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + 1)

  return toDateKey(date)
}

function buildAssignedDateMap(tours = []) {
  const dateMap = new Map()

  tours.forEach((item) => {
    const from = toDateInputValue(
      item?.departure_date ||
        item?.tour_departure?.departure_date ||
        item?.departure?.departure_date,
    )
    const to =
      toDateInputValue(
        item?.return_date ||
          item?.tour_departure?.return_date ||
          item?.departure?.return_date,
      ) || from

    if (!from) return

    const title = getTourTitle(item)

    let cursor = from
    let guard = 0

    while (cursor && cursor <= to && guard < 370) {
      const current = dateMap.get(cursor) || []
      current.push({
        id: item?.id,
        title,
        from,
        to,
      })
      dateMap.set(cursor, current)

      cursor = addOneDayKey(cursor)
      guard += 1
    }
  })

  return dateMap
}

function addDaysKey(amount) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + amount)
  return toDateKey(date)
}

function formatDate(value) {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const [year, month, day] = raw.split('-')
  if (!year || !month || !day) return '—'
  return `${day}/${month}/${year}`
}

function statusLabel(status) {
  if (status === 'pending') return 'Chờ duyệt'
  if (status === 'approved') return 'Đã duyệt'
  if (status === 'rejected') return 'Không duyệt'
  if (status === 'cancelled') return 'Đã hủy'
  return status || 'Không rõ'
}

function statusTone(status) {
  if (status === 'pending') return 'pending'
  if (status === 'approved') return 'approved'
  if (status === 'rejected') return 'rejected'
  if (status === 'cancelled') return 'cancelled'
  return 'default'
}

function getErrorMessage(error, fallback) {
  const errors = error?.response?.data?.errors
  if (errors) return Object.values(errors).flat().join(' ')
  return error?.response?.data?.message || fallback
}

function buildCalendarDays(cursor) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDate = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0)
  const firstDayIndex = (firstDate.getDay() + 6) % 7
  const days = []

  for (let i = 0; i < firstDayIndex; i += 1) days.push(null)
  for (let day = 1; day <= lastDate.getDate(); day += 1) {
    days.push(new Date(year, month, day))
  }

  return days
}

function isDateInRange(dateKey, from, to) {
  if (!dateKey || !from) return false
  const end = to || from
  return dateKey >= from && dateKey <= end
}

function GuideLeaveRequestWidget() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [requests, setRequests] = useState([])
  const [assignedTourDateMap, setAssignedTourDateMap] = useState(() => new Map())
  const [summary, setSummary] = useState({
    pending_count: 0,
    busy_leave_count: 0,
    upcoming_busy_leave_count: 0,
  })
  const [cursor, setCursor] = useState(() => {
    const date = new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!open) return undefined

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const minLeaveDate = useMemo(() => addDaysKey(5), [])

  const filteredRequests = useMemo(() => {
    if (filter === 'pending') {
      return requests.filter((item) => item.status === 'pending')
    }

    if (filter === 'processed') {
      return requests.filter((item) => item.status !== 'pending')
    }

    return requests
  }, [requests, filter])

  const calendarDays = useMemo(() => buildCalendarDays(cursor), [cursor])

  function getAssignedToursOnDate(dateKey) {
    return assignedTourDateMap.get(dateKey) || []
  }

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [listPayload, summaryPayload, tourPayload] = await Promise.all([
        getGuideLeaveRequests({ per_page: 30 }),
        getGuideLeaveRequestSummary(),
        getGuideTours({ page: 1, per_page: 100 }),
      ])

      setRequests(normalizeItems(listPayload))
      setSummary(summaryPayload?.data || summaryPayload || {})

      setAssignedTourDateMap(buildAssignedDateMap(normalizeTourItems(tourPayload)))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Không tải được đơn xin nghỉ.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialLoadTimeoutId = window.setTimeout(() => {
      void loadData()
    }, 0)

    function reloadOnNotification() {
      void loadData()
    }

    window.addEventListener('guide-leave-request:changed', reloadOnNotification)

    return () => {
      window.clearTimeout(initialLoadTimeoutId)
      window.removeEventListener('guide-leave-request:changed', reloadOnNotification)
    }
  }, [])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setError('')
    setMessage('')
  }

  function chooseDate(dateKey) {
    if (!form.start_date || form.end_date || dateKey < form.start_date) {
      updateForm('start_date', dateKey)
      updateForm('end_date', '')
      return
    }

    updateForm('end_date', dateKey)
  }

  function validateForm() {
    const nextErrors = {}

    if (!form.start_date) nextErrors.start_date = 'Vui lòng chọn ngày bắt đầu nghỉ.'
    if (!form.end_date) nextErrors.end_date = 'Vui lòng chọn ngày kết thúc nghỉ.'
    if (form.start_date && form.start_date < minLeaveDate) {
      nextErrors.start_date = 'Bạn cần xin nghỉ trước ít nhất 5 ngày.'
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      nextErrors.end_date = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.'
    }
    if (!form.reason.trim()) nextErrors.reason = 'Vui lòng nhập lý do xin nghỉ.'
    if (form.reason.trim() && form.reason.trim().length < 10) {
      nextErrors.reason = 'Lý do xin nghỉ phải có ít nhất 10 ký tự.'
    }

    setFieldErrors(nextErrors)

    const firstError = Object.values(nextErrors)[0]
    if (firstError) {
      setError(firstError)
      return false
    }

    return true
  }

  async function submitLeaveRequest(event) {
    event.preventDefault()

    if (!validateForm()) return

    try {
      setSubmitting(true)
      setMessage('')
      setError('')

      const response = await createGuideLeaveRequest(form)

      setMessage(response.message || 'Đã gửi đơn xin nghỉ.')
      setForm(emptyForm)
      await loadData()

      window.dispatchEvent(new Event('guide-leave-request:changed'))
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Gửi đơn xin nghỉ thất bại.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelRequest(item) {
    const confirmed = window.confirm('Bạn chắc chắn muốn hủy đơn xin nghỉ này?')
    if (!confirmed) return

    try {
      setBusyId(item.id)
      setMessage('')
      setError('')

      const response = await cancelGuideLeaveRequest(item.id)

      setMessage(response.message || 'Đã hủy đơn xin nghỉ.')
      await loadData()

      window.dispatchEvent(new Event('guide-leave-request:changed'))
    } catch (cancelError) {
      setError(getErrorMessage(cancelError, 'Hủy đơn xin nghỉ thất bại.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="guide-leave-widget">
      <button
        type="button"
        className="guide-leave-topbar-button"
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
          <path d="m9 16 2 2 4-5" />
        </svg>
        <span>Xin nghỉ</span>
        {Number(summary?.pending_count || 0) > 0 ? (
          <strong>{summary.pending_count > 99 ? '99+' : summary.pending_count}</strong>
        ) : null}
      </button>

      {open ? (
        <div
          className="guide-leave-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false)
            }
          }}
        >
          <section
            className="guide-leave-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-leave-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
          <div className="guide-leave-panel-head">
            <div>
              <span>Đơn xin nghỉ</span>
              <h3 id="guide-leave-title">Xin nghỉ HDV</h3>
              <p>Chọn một hoặc nhiều ngày nghỉ. Đơn cần gửi trước ngày nghỉ ít nhất 5 ngày.</p>
            </div>

            <button type="button" onClick={() => setOpen(false)}>
              Đóng
            </button>
          </div>

          {(message || error) ? (
            <div className={error ? 'guide-leave-alert error' : 'guide-leave-alert success'}>
              {error || message}
            </div>
          ) : null}

          <div className="guide-leave-summary-grid">
            <div>
              <strong>{summary?.pending_count || 0}</strong>
              <span>đơn chờ duyệt</span>
            </div>
            <div>
              <strong>{summary?.busy_leave_count || 0}</strong>
              <span>đơn nghỉ hôm nay</span>
            </div>
            <div>
              <strong>{summary?.upcoming_busy_leave_count || 0}</strong>
              <span>đơn ảnh hưởng lịch</span>
            </div>
          </div>

          <div className="guide-leave-grid">
            <form className="guide-leave-form-card" onSubmit={submitLeaveRequest}>
              <h4>Tạo đơn xin nghỉ</h4>

              <div className="guide-leave-calendar">
                <div className="guide-leave-calendar-head">
                  <button
                    type="button"
                    onClick={() =>
                      setCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                    }
                  >
                    ‹
                  </button>
                  <strong>
                    Tháng {cursor.getMonth() + 1}/{cursor.getFullYear()}
                  </strong>
                  <button
                    type="button"
                    onClick={() =>
                      setCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                    }
                  >
                    ›
                  </button>
                </div>

                <div className="guide-leave-weekdays">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>

                <div className="guide-leave-days">
                  {calendarDays.map((date, index) => {
                    if (!date) return <span key={`empty-${index}`} />
                    const key = toDateKey(date)
                    const disabled = key < minLeaveDate
                    const selected = isDateInRange(key, form.start_date, form.end_date)
                    const assignedTours = getAssignedToursOnDate(key)
                    const hasAssignedTour = assignedTours.length > 0

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        className={[
                          selected ? 'selected' : '',
                          hasAssignedTour ? 'assigned-tour' : '',
                        ].filter(Boolean).join(' ')}
                        title={
                          hasAssignedTour
                            ? `Đã có lịch được phân công: ${assignedTours
                                .map((tour) => tour.title)
                                .join(', ')}`
                            : ''
                        }
                        data-assigned-tour={hasAssignedTour ? '1' : '0'}
                        onClick={() => chooseDate(key)}
                      >
                        <span>{date.getDate()}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="guide-leave-calendar-legend">
                  <span>
                    <i className="selected" /> Ngày đang chọn
                  </span>
                  <span>
                    <i className="assigned-tour" /> Ngày đã có tour phân công
                  </span>
                </div>
              </div>

              <div className="guide-leave-form-row">
                <label>
                  Từ ngày *
                  <input
                    type="date"
                    value={form.start_date}
                    min={minLeaveDate}
                    onChange={(event) => updateForm('start_date', event.target.value)}
                    className={fieldErrors.start_date ? 'error' : ''}
                  />
                  {fieldErrors.start_date ? <small>{fieldErrors.start_date}</small> : null}
                </label>

                <label>
                  Đến ngày *
                  <input
                    type="date"
                    value={form.end_date}
                    min={form.start_date || minLeaveDate}
                    onChange={(event) => updateForm('end_date', event.target.value)}
                    className={fieldErrors.end_date ? 'error' : ''}
                  />
                  {fieldErrors.end_date ? <small>{fieldErrors.end_date}</small> : null}
                </label>
              </div>

              <label>
                Lý do xin nghỉ *
                <textarea
                  value={form.reason}
                  onChange={(event) => updateForm('reason', event.target.value)}
                  className={fieldErrors.reason ? 'error' : ''}
                  rows={4}
                  placeholder="Nhập lý do xin nghỉ..."
                />
                {fieldErrors.reason ? <small>{fieldErrors.reason}</small> : null}
              </label>

              <label>
                Ảnh/PDF bằng chứng nếu có
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(event) =>
                    updateForm('evidence', Array.from(event.target.files || []))
                  }
                />
              </label>

              {form.evidence.length > 0 ? (
                <div className="guide-leave-file-list">
                  {form.evidence.map((file) => (
                    <span key={`${file.name}-${file.size}`}>{file.name}</span>
                  ))}
                </div>
              ) : null}

              <button type="submit" disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi đơn xin nghỉ'}
              </button>
            </form>

            <div className="guide-leave-list-card">
              <div className="guide-leave-list-head">
                <h4>Đơn xin nghỉ của tôi</h4>
                <div>
                  {[
                    ['all', 'Tất cả'],
                    ['pending', 'Chờ duyệt'],
                    ['processed', 'Đã xử lý'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={filter === value ? 'active' : ''}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="guide-leave-empty">Đang tải đơn...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="guide-leave-empty">Chưa có đơn xin nghỉ.</div>
              ) : (
                <div className="guide-leave-request-list">
                  {filteredRequests.map((item) => (
                    <article key={item.id} className={`guide-leave-request-item ${statusTone(item.status)}`}>
                      <div>
                        <span className={`leave-status ${statusTone(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                        <h5>{formatDate(item.start_date)} - {formatDate(item.end_date)}</h5>
                        <p>{item.reason}</p>
                        {item.admin_note ? <small>Ghi chú admin: {item.admin_note}</small> : null}

                        {Array.isArray(item.attachments) && item.attachments.length > 0 ? (
                          <div className="guide-leave-attachments">
                            {item.attachments.map((file) => (
                              <a key={file.id} href={file.url} target="_blank" rel="noreferrer">
                                {file.name || `File #${file.id}`}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {item.status === 'pending' ? (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => cancelRequest(item)}
                        >
                          {busyId === item.id ? 'Đang hủy...' : 'Hủy đơn'}
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default GuideLeaveRequestWidget
