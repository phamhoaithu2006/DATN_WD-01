function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatDuration(value) {
  const seconds = Math.max(0, Number(value || 0))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`
}

function presenceLabel(presence) {
  if (!presence?.last_seen_at) return 'Chưa ghi nhận truy cập'
  return presence.is_online ? 'Đang trực tuyến' : 'Ngoại tuyến'
}

function AdminGuideActivityModal({ guide, data, loading, activeTab, onChangeTab, onClose }) {
  const presence = data?.presence || {}
  const activities = Array.isArray(data?.activities) ? data.activities : []
  const sessions = Array.isArray(data?.sessions) ? data.sessions : []

  return (
    <div className="support-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="support-modal support-activity-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="support-modal-heading">
          <div><h2>Lịch sử hoạt động HDV</h2><p>{data?.guide?.guide_code || guide?.guide_code || 'HDV'} · {data?.guide?.name || guide?.user?.full_name || 'Hướng dẫn viên'}</p></div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {loading ? <div className="support-empty-state">Đang tải lịch sử hoạt động...</div> : <>
          <div className="support-activity-profile">
            <span className="guide-avatar support-avatar-large">{String(data?.guide?.name || guide?.user?.full_name || 'HDV').split(' ').filter(Boolean).slice(-2).map((item) => item[0]).join('').toUpperCase()}</span>
            <div className="support-activity-profile-main">
              <h3>{data?.guide?.name || guide?.user?.full_name || '—'}</h3>
              <div className={`support-presence-badge ${presence.is_online ? 'online' : 'offline'}`}><span /><strong>{presenceLabel(presence)}</strong></div>
              <p>{presence.is_online ? `Đã online ${formatDuration(presence.online_seconds)}` : presence.last_seen_at ? `Hoạt động lần cuối: ${formatDateTime(presence.last_seen_at)}` : 'Chưa có phiên online'}</p>
              <small>Tổng online hôm nay: {formatDuration(presence.today_online_seconds)}</small>
            </div>
          </div>
          <div className="support-activity-summary"><div><strong>{data?.activity_summary?.total_actions || 0}</strong><span>Tổng thao tác</span></div><div><strong>{sessions.length}</strong><span>Phiên online</span></div></div>
          <div className="support-activity-tabs">
            <button type="button" className={activeTab === 'activities' ? 'active' : ''} onClick={() => onChangeTab('activities')}>Lịch sử thao tác</button>
            <button type="button" className={activeTab === 'sessions' ? 'active' : ''} onClick={() => onChangeTab('sessions')}>Lịch sử online</button>
          </div>
          {activeTab === 'activities' ? <div className="support-activity-scroll">
            {activities.length === 0 ? <div className="support-empty-state">Chưa ghi nhận thao tác nào của HDV.</div> : <div className="support-activity-timeline">{activities.map((item) => <article className="support-activity-item" key={item.id}><span className="support-activity-dot" /><div><div className="support-activity-item-heading"><strong>{item.description}</strong>{item.status ? <em>{item.status}</em> : null}</div><p>{item.detail || 'Thao tác nghiệp vụ của hướng dẫn viên'}</p><time>{formatDateTime(item.created_at)}</time></div></article>)}</div>}
          </div> : <div className="support-activity-scroll">
            {sessions.length === 0 ? <div className="support-empty-state">Chưa ghi nhận phiên online nào.</div> : <div className="support-session-list">{sessions.map((session) => <article key={session.id} className="support-session-item"><div><span className={`support-session-state ${session.is_current ? 'online' : 'offline'}`}>{session.is_current ? 'Online hiện tại' : 'Đã kết thúc'}</span><strong>{formatDateTime(session.started_at)} – {session.is_current ? 'Hiện tại' : formatDateTime(session.ended_at || session.last_seen_at)}</strong><small>IP: {session.ip_address || 'Không xác định'}</small></div><b>{formatDuration(session.duration_seconds)}</b></article>)}</div>}
          </div>}
          <div className="support-modal-actions"><button className="primary" type="button" onClick={onClose}>Đóng</button></div>
        </>}
      </section>
    </div>
  )
}

export default AdminGuideActivityModal
