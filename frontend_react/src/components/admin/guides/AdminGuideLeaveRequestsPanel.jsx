import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import adminGuideLeaveRequestApi, {
  normalizeItems,
} from '../../../services/adminGuideLeaveRequestApi.js'

const emptyFilters = {
  search: '',
  leave_state: 'all',
}

const TAB_CONFIG = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'history', label: 'Nhật ký thao tác' },
]

function formatDate(value) {
  if (!value) return '—'

  const raw = String(value).slice(0, 10)
  const [year, month, day] = raw.split('-')

  if (!year || !month || !day) return '—'

  return `${day}/${month}/${year}`
}

function formatDateTime(value) {
  if (!value) return '—'

  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function getErrorMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors) return Object.values(errors).flat().join(' ')

  return error?.response?.data?.message || fallback
}

function statusLabel(status) {
  if (status === 'pending') return 'Chờ duyệt'
  if (status === 'approved') return 'Đã duyệt'
  if (status === 'rejected') return 'Không duyệt'
  if (status === 'cancelled') return 'HDV đã hủy'

  return status || 'Không rõ'
}

function statusTone(status) {
  if (status === 'pending') return 'pending'
  if (status === 'approved') return 'approved'
  if (status === 'rejected') return 'rejected'
  if (status === 'cancelled') return 'cancelled'

  return 'default'
}

function leaveStateLabel(state) {
  if (state === 'current') return 'Đang nghỉ'
  if (state === 'upcoming') return 'Sắp nghỉ'
  if (state === 'expired') return 'Đã nghỉ'

  return 'Không rõ'
}

function buildHistoryLogs(items = []) {
  const logs = []

  items.forEach((item) => {
    const guideName = item.guide_name || `HDV #${item.guide_id || ''}`
    const dateRange = `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`

    if (item.created_at) {
      logs.push({
        id: `${item.id}-created`,
        time: item.created_at,
        tone: 'pending',
        title: 'HDV gửi đơn xin nghỉ',
        content: `${guideName} đã gửi đơn xin nghỉ từ ${dateRange}.`,
        meta: item.reason ? `Lý do: ${item.reason}` : '',
      })
    }

    if (item.cancelled_at || item.status === 'cancelled') {
      logs.push({
        id: `${item.id}-cancelled`,
        time: item.cancelled_at || item.updated_at || item.created_at,
        tone: 'cancelled',
        title: 'HDV hủy đơn xin nghỉ',
        content: `${guideName} đã hủy đơn xin nghỉ từ ${dateRange}.`,
        meta: item.cancel_reason ? `Lý do hủy: ${item.cancel_reason}` : '',
      })
    }

    if (item.reviewed_at && ['approved', 'rejected'].includes(item.status)) {
      logs.push({
        id: `${item.id}-reviewed`,
        time: item.reviewed_at,
        tone: item.status,
        title:
          item.status === 'approved'
            ? 'Admin duyệt đơn xin nghỉ'
            : 'Admin không duyệt đơn xin nghỉ',
        content: `${item.admin?.full_name || 'Admin'} đã ${
          item.status === 'approved' ? 'duyệt' : 'không duyệt'
        } đơn xin nghỉ của ${guideName} từ ${dateRange}.`,
        meta: item.admin_note ? `Ghi chú: ${item.admin_note}` : '',
      })
    }
  })

  return logs.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
}

function getTabStatus(activeTab) {
  if (activeTab === 'pending') return 'pending'
  if (activeTab === 'approved') return 'approved'

  return 'all'
}

function AdminGuideLeaveRequestsPanel({
  open = true,
  highlightRequestId = '',
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('pending')
  const [filters, setFilters] = useState(emptyFilters)
  const [requests, setRequests] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [noteById, setNoteById] = useState({})
  const [error, setError] = useState('')
  const highlightedHandledRef = useRef('')

  const historyLogs = useMemo(() => buildHistoryLogs(requests), [requests])

  const visibleRequests = useMemo(() => {
    if (activeTab === 'pending') {
      return requests.filter((item) => item.status === 'pending')
    }

    if (activeTab === 'approved') {
      return requests.filter((item) => item.status === 'approved')
    }

    return requests
  }, [activeTab, requests])

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = {
        search: filters.search,
        leave_state: filters.leave_state,
        status: highlightRequestId ? 'all' : getTabStatus(activeTab),
        per_page: 100,
      }

      Object.keys(params).forEach((key) => {
        if (!params[key] || params[key] === 'all') delete params[key]
      })

      const payload = await adminGuideLeaveRequestApi.list(params)

      setRequests(normalizeItems(payload))
      setSummary(payload?.summary || {})
    } catch (loadError) {
      setError(
        getErrorMessage(loadError, 'Không tải được danh sách đơn xin nghỉ.'),
      )
    } finally {
      setLoading(false)
    }
  }, [activeTab, filters, highlightRequestId])

  useEffect(() => {
    if (!open) return undefined

    const timeoutId = window.setTimeout(() => {
      void loadRequests()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [open, loadRequests])

  useEffect(() => {
    function reload() {
      if (open) void loadRequests()
    }

    window.addEventListener('admin-guide-leave-request:changed', reload)

    return () => {
      window.removeEventListener('admin-guide-leave-request:changed', reload)
    }
  }, [open, loadRequests])

  useEffect(() => {
    if (!highlightRequestId) {
      highlightedHandledRef.current = ''
      return
    }

    const highlightKey = String(highlightRequestId)

    if (highlightedHandledRef.current === highlightKey || requests.length === 0) {
      return
    }

    const highlighted = requests.find(
      (item) => String(item.id) === highlightKey,
    )

    if (!highlighted) return

    highlightedHandledRef.current = highlightKey

    const timeoutId = window.setTimeout(() => {
      setActiveTab(highlighted.status === 'pending' ? 'pending' : 'approved')
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [highlightRequestId, requests])

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  async function decide(item, status) {
    const actionText = status === 'approved' ? 'duyệt' : 'không duyệt'
    const confirmed = window.confirm(
      `Bạn chắc chắn muốn ${actionText} đơn xin nghỉ này?`,
    )

    if (!confirmed) return

    try {
      setBusyId(item.id)
      setError('')

      const payload = {
        admin_note: noteById[item.id] || '',
      }

      if (status === 'approved') {
        await adminGuideLeaveRequestApi.approve(item.id, payload)
      } else {
        await adminGuideLeaveRequestApi.reject(item.id, payload)
      }

      await loadRequests()

      window.dispatchEvent(new Event('admin-notification:changed'))
      window.dispatchEvent(new Event('admin-guide-leave-request:changed'))
    } catch (decideError) {
      setError(getErrorMessage(decideError, 'Cập nhật đơn xin nghỉ thất bại.'))
    } finally {
      setBusyId(null)
    }
  }

  async function changeDecision(item, status) {
    const confirmed = window.confirm(
      'Bạn muốn sửa lại trạng thái phê duyệt của đơn này?',
    )

    if (!confirmed) return

    try {
      setBusyId(item.id)
      setError('')

      await adminGuideLeaveRequestApi.updateDecision(item.id, {
        status,
        admin_note: noteById[item.id] || item.admin_note || '',
      })

      await loadRequests()

      window.dispatchEvent(new Event('admin-notification:changed'))
      window.dispatchEvent(new Event('admin-guide-leave-request:changed'))
    } catch (decideError) {
      setError(
        getErrorMessage(decideError, 'Sửa trạng thái phê duyệt thất bại.'),
      )
    } finally {
      setBusyId(null)
    }
  }

  if (!open) return null

  function renderDecisionButtons(item) {
    if (item.status === 'pending') {
      return (
        <div className="admin-guide-leave-action-row">
          <button
            type="button"
            className="approve"
            disabled={busyId === item.id}
            onClick={() => decide(item, 'approved')}
          >
            {busyId === item.id ? 'Đang duyệt...' : 'Duyệt'}
          </button>

          <button
            type="button"
            className="reject"
            disabled={busyId === item.id}
            onClick={() => decide(item, 'rejected')}
          >
            {busyId === item.id ? 'Đang xử lý...' : 'Không duyệt'}
          </button>
        </div>
      )
    }

    if (!item.can_update_decision) {
      return (
        <span className="admin-guide-leave-locked">
          Đơn đã qua thời gian nghỉ nên không thể sửa trạng thái.
        </span>
      )
    }

    if (item.status === 'approved') {
      return (
        <div className="admin-guide-leave-action-row">
          <button
            type="button"
            className="reject muted"
            disabled={busyId === item.id}
            onClick={() => changeDecision(item, 'rejected')}
          >
            Sửa thành không duyệt
          </button>
        </div>
      )
    }

    if (item.status === 'rejected') {
      return (
        <div className="admin-guide-leave-action-row">
          <button
            type="button"
            className="approve muted"
            disabled={busyId === item.id}
            onClick={() => changeDecision(item, 'approved')}
          >
            Sửa thành duyệt
          </button>
        </div>
      )
    }

    return (
      <span className="admin-guide-leave-locked">
        Đơn đã hủy, không thể phê duyệt.
      </span>
    )
  }

  function renderRequestCard(item) {
    const highlighted =
      highlightRequestId && String(item.id) === String(highlightRequestId)
    const noteValue = noteById[item.id] ?? item.admin_note ?? ''

    return (
      <article
        key={item.id}
        className={[
          'admin-guide-leave-card',
          statusTone(item.status),
          highlighted ? 'is-highlighted' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="admin-guide-leave-card-main">
          <div className="admin-guide-leave-card-head">
            <div>
              <span className={`leave-status ${statusTone(item.status)}`}>
                {statusLabel(item.status)}
              </span>

              <h4>{item.guide_name || `HDV #${item.guide_id}`}</h4>

              <p>
                {item.guide_code ? `${item.guide_code} · ` : ''}
                {item.guide_email || 'Chưa có email'}
              </p>
            </div>

            <div className="admin-guide-leave-date-box">
              <strong>
                {formatDate(item.start_date)} - {formatDate(item.end_date)}
              </strong>

              <span>{leaveStateLabel(item.leave_state)}</span>
            </div>
          </div>

          <div className="admin-guide-leave-reason">
            <strong>Lý do</strong>
            <p>{item.reason || 'Không có lý do.'}</p>
          </div>

          {Array.isArray(item.attachments) && item.attachments.length > 0 ? (
            <div className="admin-guide-leave-files">
              {item.attachments.map((file) => (
                <a
                  key={file.id || file.url || file.name}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.name || `File #${file.id}`}
                </a>
              ))}
            </div>
          ) : null}

          <div className="admin-guide-leave-meta">
            <span>Tạo lúc: {formatDateTime(item.created_at)}</span>

            {item.reviewed_at ? (
              <span>Xử lý lúc: {formatDateTime(item.reviewed_at)}</span>
            ) : null}

            {item.admin?.full_name ? (
              <span>Admin: {item.admin.full_name}</span>
            ) : null}
          </div>
        </div>

        <div className="admin-guide-leave-actions">
          <label>
            Ghi chú admin
            <textarea
              value={noteValue}
              rows={3}
              onChange={(event) =>
                setNoteById((current) => ({
                  ...current,
                  [item.id]: event.target.value,
                }))
              }
              placeholder="Nhập ghi chú nếu cần..."
            />
          </label>

          {renderDecisionButtons(item)}
        </div>
      </article>
    )
  }

  function renderHistory() {
    if (loading) {
      return <div className="admin-guide-leave-empty">Đang tải nhật kí...</div>
    }

    if (historyLogs.length === 0) {
      return <div className="admin-guide-leave-empty">Chưa có nhật kí thao tác.</div>
    }

    return (
      <div className="admin-guide-leave-log-list">
        {historyLogs.map((log) => (
          <article key={log.id} className={`admin-guide-leave-log ${log.tone}`}>
            <span className="admin-guide-leave-log-dot" />

            <div>
              <strong>{log.title}</strong>
              <p>{log.content}</p>
              {log.meta ? <small>{log.meta}</small> : null}
            </div>

            <time>{formatDateTime(log.time)}</time>
          </article>
        ))}
      </div>
    )
  }

  return (
    <section className="admin-guide-leave-panel">
      <div className="admin-guide-leave-head">
        <div>
          <span>Đơn xin nghỉ</span>
          <h3>Quản lý đơn xin nghỉ HDV</h3>
          <p>Duyệt, không duyệt hoặc xem nhật kí thao tác đơn xin nghỉ.</p>
        </div>

        {onClose ? (
          <button type="button" onClick={onClose}>
            Đóng
          </button>
        ) : null}
      </div>

      {error ? <div className="admin-guide-leave-alert error">{error}</div> : null}

      <div className="admin-guide-leave-tabs" role="tablist" aria-label="Lọc đơn xin nghỉ">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === 'pending' && Number(summary.pending_count || 0) > 0 ? (
              <span>{summary.pending_count}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="admin-guide-leave-filter compact">
        <input
          type="search"
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
          placeholder="Tìm theo tên, mã HDV hoặc email..."
        />

        <select
          value={filters.leave_state}
          onChange={(event) => updateFilter('leave_state', event.target.value)}
        >
          <option value="all">Tất cả thời gian nghỉ</option>
          <option value="current">Đang nghỉ</option>
          <option value="upcoming">Sắp nghỉ</option>
          <option value="expired">Đã nghỉ</option>
        </select>

        <button type="button" onClick={() => setFilters(emptyFilters)}>
          Đặt lại
        </button>
      </div>

      {activeTab === 'history' ? (
        <div className="admin-guide-leave-section active-tab-panel">
          <h4>Nhật kí thao tác</h4>
          {renderHistory()}
        </div>
      ) : (
        <div className="admin-guide-leave-section active-tab-panel">
          <h4>
            {activeTab === 'pending'
              ? `Đơn xin nghỉ chờ duyệt (${visibleRequests.length})`
              : `Đơn xin nghỉ đã duyệt (${visibleRequests.length})`}
          </h4>

          {loading ? (
            <div className="admin-guide-leave-empty">Đang tải đơn...</div>
          ) : visibleRequests.length === 0 ? (
            <div className="admin-guide-leave-empty">
              {activeTab === 'pending'
                ? 'Không có đơn chờ duyệt.'
                : 'Chưa có đơn đã duyệt.'}
            </div>
          ) : (
            <div className="admin-guide-leave-list">
              {visibleRequests.map(renderRequestCard)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default AdminGuideLeaveRequestsPanel
