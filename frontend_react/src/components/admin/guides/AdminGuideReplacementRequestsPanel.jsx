import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import adminGuideReplacementRequestApi, {
  normalizeItems,
} from '../../../services/adminGuideReplacementRequestApi.js'
import { confirmAction } from '../../common/AppConfirmDialog.jsx'

const TABS = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã chấp nhận' },
  { key: 'history', label: 'Lịch sử xử lý' },
]

function formatDate(value) {
  if (!value) return '—'
  const [year, month, day] = String(value).slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : '—'
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN')
}

function getGuideName(item) {
  return item.current_guide_name || item.guide_name || item.current_guide?.user?.full_name || item.guide?.user?.full_name || `HDV #${item.current_guide_id || item.guide_id || ''}`
}

function getTourName(item) {
  return item.tour_title || item.tour?.title || `Tour #${item.tour_id || item.tour_departure_id || ''}`
}

function statusLabel(status) {
  return ({ pending: 'Chờ duyệt', approved: 'Đã chấp nhận', rejected: 'Không chấp nhận', cancelled: 'Đã hủy' })[status] || status || 'Không rõ'
}

function statusTone(status) {
  return ['pending', 'approved', 'rejected', 'cancelled'].includes(status) ? status : 'default'
}

function errorMessage(error, fallback) {
  return error?.response?.data?.message || fallback
}

export default function AdminGuideReplacementRequestsPanel({ open = true, highlightRequestId = '', onClose }) {
  const [activeTab, setActiveTab] = useState('pending')
  const [requests, setRequests] = useState([])
  const [summary, setSummary] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [noteById, setNoteById] = useState({})
  const [error, setError] = useState('')
  const highlightedHandledRef = useRef('')

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await adminGuideReplacementRequestApi.list({
        status: highlightRequestId || activeTab === 'history' ? 'all' : activeTab,
        search: search.trim() || undefined,
        per_page: 100,
      })
      setRequests(normalizeItems(payload))
      setSummary(payload?.summary || {})
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không tải được danh sách đơn đổi HDV.'))
    } finally {
      setLoading(false)
    }
  }, [activeTab, highlightRequestId, search])

  useEffect(() => {
    if (open) void loadRequests()
  }, [loadRequests, open])

  useEffect(() => {
    if (!highlightRequestId || highlightedHandledRef.current === String(highlightRequestId)) return
    highlightedHandledRef.current = String(highlightRequestId)
    setActiveTab('pending')
  }, [highlightRequestId])

  const visibleRequests = useMemo(() => {
    if (activeTab === 'history') return requests
    return requests.filter((item) => item.status === activeTab)
  }, [activeTab, requests])

  const history = useMemo(() => requests.flatMap((item) => {
    const guideName = getGuideName(item)
    const tourName = getTourName(item)
    const logs = item.created_at ? [{ id: `${item.id}-created`, time: item.created_at, tone: 'pending', title: 'HDV gửi đơn đổi HDV', content: `${guideName} yêu cầu đổi HDV cho ${tourName}.` }] : []
    if (item.reviewed_at && ['approved', 'rejected'].includes(item.status)) {
      logs.push({ id: `${item.id}-reviewed`, time: item.reviewed_at, tone: item.status, title: item.status === 'approved' ? 'Admin chấp nhận đơn đổi HDV' : 'Admin không chấp nhận đơn đổi HDV', content: `${item.admin?.full_name || 'Admin'} đã xử lý yêu cầu của ${guideName}.`, meta: item.admin_note || '' })
    }
    return logs
  }).sort((a, b) => new Date(b.time) - new Date(a.time)), [requests])

  async function decide(item, status) {
    const id = item.id || item.request_id
    if (!id) return
    const note = (noteById[id] || '').trim()
    if (status === 'rejected' && !note) {
      setError('Vui lòng nhập ghi chú/lý do trước khi không chấp nhận.')
      return
    }
    const confirmed = await confirmAction(
      status === 'approved' ? 'Hệ thống sẽ tự tìm và phân công HDV thay thế.' : 'Lý do không chấp nhận sẽ được gửi lại cho hướng dẫn viên.',
      { title: status === 'approved' ? 'Chấp nhận đơn đổi HDV' : 'Không chấp nhận đơn đổi HDV', confirmLabel: status === 'approved' ? 'Chấp nhận' : 'Không chấp nhận', tone: status === 'approved' ? 'primary' : 'danger' },
    )
    if (!confirmed) return
    setBusyId(id)
    setError('')
    try {
      const payload = note ? { admin_note: note } : {}
      if (status === 'approved') await adminGuideReplacementRequestApi.approve(id, payload)
      else await adminGuideReplacementRequestApi.reject(id, payload)
      window.dispatchEvent(new Event('admin-guide-replacement:changed'))
      window.dispatchEvent(new Event('admin-notification:changed'))
      window.dispatchEvent(new Event('tourDepartureNeedAssignmentCountChanged'))
      await loadRequests()
    } catch (requestError) {
      setError(errorMessage(requestError, 'Cập nhật đơn đổi HDV thất bại.'))
    } finally {
      setBusyId(null)
    }
  }

  if (!open) return null

  return <section className="admin-guide-leave-panel">
    <div className="admin-guide-leave-head"><div><span>Đơn đổi HDV</span><h3>Quản lý đơn đổi HDV</h3><p>Chấp nhận hoặc không chấp nhận yêu cầu đổi hướng dẫn viên.</p></div>{onClose ? <button type="button" onClick={onClose}>Đóng</button> : null}</div>
    {error ? <div className="admin-guide-leave-alert error">{error}</div> : null}
    <div className="admin-guide-leave-tabs" role="tablist" aria-label="Lọc đơn đổi HDV">{TABS.map((tab) => <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>{tab.label}{tab.key === 'pending' && Number(summary.pending_count || 0) > 0 ? <span>{summary.pending_count}</span> : null}</button>)}</div>
    <div className="admin-guide-leave-filter compact"><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tour hoặc hướng dẫn viên..." /><button type="button" onClick={() => setSearch('')}>Đặt lại</button></div>
    {activeTab === 'history' ? <div className="admin-guide-leave-section active-tab-panel"><h4>Lịch sử xử lý</h4>{loading ? <div className="admin-guide-leave-empty">Đang tải lịch sử...</div> : history.length === 0 ? <div className="admin-guide-leave-empty">Chưa có lịch sử thao tác.</div> : <div className="admin-guide-leave-log-list">{history.map((log) => <article key={log.id} className={`admin-guide-leave-log ${log.tone}`}><span className="admin-guide-leave-log-dot" /><div><strong>{log.title}</strong><p>{log.content}</p>{log.meta ? <small>Ghi chú: {log.meta}</small> : null}</div><time>{formatDateTime(log.time)}</time></article>)}</div>}</div> : <div className="admin-guide-leave-section active-tab-panel"><h4>{activeTab === 'pending' ? `Đơn đổi HDV chờ duyệt (${visibleRequests.length})` : `Đơn đổi HDV đã chấp nhận (${visibleRequests.length})`}</h4>{loading ? <div className="admin-guide-leave-empty">Đang tải đơn...</div> : visibleRequests.length === 0 ? <div className="admin-guide-leave-empty">Không có đơn phù hợp.</div> : <div className="admin-guide-leave-list">{visibleRequests.map((item) => { const id = item.id || item.request_id; const note = noteById[id] ?? item.admin_note ?? ''; const highlighted = highlightRequestId && String(id) === String(highlightRequestId); return <article key={id} className={`admin-guide-leave-card ${statusTone(item.status)} ${highlighted ? 'is-highlighted' : ''}`}><div className="admin-guide-leave-card-main"><div className="admin-guide-leave-card-head"><div><span className={`leave-status ${statusTone(item.status)}`}>{statusLabel(item.status)}</span><h4>{getTourName(item)}</h4><p>HDV yêu cầu: {getGuideName(item)}</p></div><div className="admin-guide-leave-date-box"><strong>{formatDate(item.departure_date)} - {formatDate(item.return_date || item.departure_date)}</strong><span>Lịch khởi hành</span></div></div><div className="admin-guide-leave-reason"><strong>Lý do</strong><p>{item.reason || item.request_reason || 'Không có lý do.'}</p></div>{item.evidence_path ? <div className="admin-guide-leave-files"><a href={`/storage/${item.evidence_path}`} target="_blank" rel="noreferrer">Xem bằng chứng</a></div> : null}<div className="admin-guide-leave-meta"><span>Tạo lúc: {formatDateTime(item.created_at)}</span>{item.reviewed_at ? <span>Xử lý lúc: {formatDateTime(item.reviewed_at)}</span> : null}</div></div><div className="admin-guide-leave-actions"><label>Ghi chú admin<textarea value={note} rows={3} onChange={(event) => setNoteById((current) => ({ ...current, [id]: event.target.value }))} placeholder="Nhập ghi chú hoặc lý do không chấp nhận..." /></label>{item.status === 'pending' ? <div className="admin-guide-leave-action-row"><button type="button" className="approve" disabled={busyId === id} onClick={() => decide(item, 'approved')}>{busyId === id ? 'Đang xử lý...' : 'Chấp nhận'}</button><button type="button" className="reject" disabled={busyId === id} onClick={() => decide(item, 'rejected')}>{busyId === id ? 'Đang xử lý...' : 'Không chấp nhận'}</button></div> : null}</div></article>})}</div>}</div>}
  </section>
}
