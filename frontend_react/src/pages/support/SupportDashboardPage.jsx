import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SupportPresenceHeartbeat from '../../components/support/SupportPresenceHeartbeat'
import { getSupportDashboard } from '../../services/supportDashboardApi'
import '../../styles/support-staff.css'

const DEFAULT_DASHBOARD = { stats: {}, priority_requests: [] }

const STATUS = {
  pending: ['Mới', 'is-pending'],
  in_progress: ['Đang xử lý', 'is-progress'],
  resolved: ['Đã xong', 'is-resolved'],
}

function formatRelativeTime(value) {
  const date = new Date(String(value || '').replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return 'Vừa cập nhật'

  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`
  return `${Math.floor(minutes / 1440)} ngày trước`
}

function DashboardIcon({ name }) {
  const paths = {
    inbox: <><path d="M4 4h16v15H4z" /><path d="M4 14h5l2 3h2l2-3h5" /></>,
    headset: <><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><path d="M4 13h3v5H5a1 1 0 0 1-1-1zM20 13h-3v5h2a1 1 0 0 0 1-1z" /><path d="M17 20c-1 1-3 1-4 1" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20a7 7 0 0 1 14 0" /><path d="M18 4v4M16 6h4" /></>,
    check: <><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="9" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function SupportDashboardPage() {
  const [dashboard, setDashboard] = useState(DEFAULT_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      setDashboard(await getSupportDashboard())
    } catch {
      setError('Không thể tải tổng quan công việc. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void loadDashboard() }, 0)
    return () => window.clearTimeout(loadTimer)
  }, [])

  const stats = dashboard.stats || {}
  const todayLabel = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
  const cards = [
    { label: 'Yêu cầu mới', value: stats.pending, hint: 'Đang chờ được tiếp nhận', tone: 'blue', icon: 'inbox', to: '/support/requests?status=pending' },
    { label: 'Đang xử lý', value: stats.mine_in_progress, hint: 'Ticket bạn đang phụ trách', tone: 'violet', icon: 'headset', to: '/support/requests?status=in_progress&scope=mine' },
    { label: 'Chờ khách phản hồi', value: stats.waiting_customer, hint: 'Cần khách bổ sung thông tin', tone: 'amber', icon: 'user', to: '/support/requests?status=needs_more_info&scope=mine' },
    { label: 'Hoàn thành hôm nay', value: stats.resolved_today, hint: 'Ticket đã được xử lý xong', tone: 'green', icon: 'check', to: '/support/requests?status=resolved&scope=mine' },
  ]

  return (
    <section className="support-dashboard">
      <SupportPresenceHeartbeat />
      <div className="support-dashboard-hero">
        <div>
          <span className="support-dashboard-eyebrow">TRUNG TÂM HỖ TRỢ</span>
          <h1>Chào {dashboard.staff_name || 'bạn'} 👋</h1>
          <p>{todayLabel} · Theo dõi các yêu cầu cần ưu tiên và xử lý hỗ trợ khách hàng.</p>
        </div>
        <div className="support-dashboard-hero-actions">
          <Link to="/support/requests" className="support-dashboard-primary">Mở danh sách yêu cầu</Link>
          <Link to="/support/notifications" className="support-dashboard-notification"><DashboardIcon name="bell" />{stats.unread_notifications || 0} chưa đọc</Link>
        </div>
      </div>

      {error ? <div className="support-dashboard-error">{error}<button type="button" onClick={loadDashboard}>Tải lại</button></div> : null}

      <div className="support-dashboard-stats">
        {cards.map((card) => (
          <Link className={`support-dashboard-stat is-${card.tone}`} to={card.to} key={card.label}>
            <span className="support-dashboard-stat-icon"><DashboardIcon name={card.icon} /></span>
            <span className="support-dashboard-stat-copy"><small>{card.label}</small><strong>{loading ? '—' : Number(card.value || 0)}</strong><em>{card.hint}</em></span>
            <span className="support-dashboard-stat-arrow">→</span>
          </Link>
        ))}
      </div>

      <div className="support-dashboard-grid">
        <section className="support-dashboard-panel support-dashboard-queue">
          <div className="support-dashboard-panel-head">
            <div><span>ƯU TIÊN HÔM NAY</span><h2>Yêu cầu cần xử lý</h2></div>
            <Link to="/support/requests">Xem tất cả →</Link>
          </div>
          {loading ? <p className="support-dashboard-empty">Đang tải danh sách yêu cầu...</p> : null}
          {!loading && !dashboard.priority_requests?.length ? <p className="support-dashboard-empty">Tuyệt vời! Hiện không có yêu cầu nào cần ưu tiên.</p> : null}
          {!loading && dashboard.priority_requests?.map((item) => {
            const [statusLabel, statusClass] = STATUS[item.status] || ['Chưa xác định', '']
            const activeStatus = item.needs_more_info ? ['Chờ bổ sung', 'is-waiting'] : [statusLabel, statusClass]
            return (
              <Link to={`/support/requests?ticket=${encodeURIComponent(item.ticket_code)}`} className="support-dashboard-ticket" key={item.id}>
                <span className={`support-dashboard-priority is-${item.priority || 'medium'}`} />
                <div><div className="support-dashboard-ticket-meta"><b>{item.ticket_code}</b><span>{formatRelativeTime(item.created_at)}</span></div><strong>{item.subject || 'Yêu cầu hỗ trợ'}</strong><small>{item.full_name || 'Khách hàng'} · {item.category || 'Khác'}</small></div>
                <em className={`support-dashboard-status ${activeStatus[1]}`}>{activeStatus[0]}</em>
              </Link>
            )
          })}
        </section>

        <aside className="support-dashboard-side">
          <section className="support-dashboard-panel support-dashboard-focus">
            <span className="support-dashboard-focus-icon"><DashboardIcon name="headset" /></span>
            <span>NHỊP LÀM VIỆC</span>
            <h2>{loading ? '—' : Number(stats.mine_in_progress || 0)} ticket đang phụ trách</h2>
            <p>Ưu tiên phản hồi những yêu cầu có mức độ khẩn cấp cao trước.</p>
            <Link to="/support/requests?status=in_progress&scope=mine">Tiếp tục xử lý →</Link>
          </section>
          <section className="support-dashboard-panel support-dashboard-tip">
            <span>GỢI Ý NHANH</span>
            <p>Kiểm tra kỹ nội dung và tệp đính kèm trước khi chuyển yêu cầu cần hỗ trợ đến quản trị viên.</p>
          </section>
        </aside>
      </div>
    </section>
  )
}

export default SupportDashboardPage
