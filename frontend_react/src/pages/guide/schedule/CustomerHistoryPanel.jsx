import { formatDateTime } from './scheduleUtils'

function CustomerHistoryPanel({ detail, loading, onClose }) {
  if (!detail && !loading) return null

  const info = detail?.personal_info || {}
  const history = Array.isArray(detail?.attendance_history) ? detail.attendance_history : []

  return (
    <aside className="guide-schedule-history-panel">
      <button type="button" onClick={onClose} aria-label="Đóng lịch sử">
        ×
      </button>
      <span>Lịch sử khách hàng</span>
      <h3>{loading ? 'Đang tải...' : info.full_name || 'Khách hàng'}</h3>

      {loading ? (
        <p>Đang tải lịch sử check-in/check-out.</p>
      ) : history.length > 0 ? (
        <div className="guide-schedule-history-list">
          {history.map((entry) => (
            <article key={entry.id || `${entry.session_id}-${entry.created_at}`}>
              <strong>{entry.session_name || `Phiên #${entry.session_id}`}</strong>
              <p>Check-in: {formatDateTime(entry.checked_in_at)}</p>
              <p>Check-out: {formatDateTime(entry.checked_out_at)}</p>
              {entry.note ? <em>{entry.note}</em> : null}
            </article>
          ))}
        </div>
      ) : (
        <p>Khách này chưa có lịch sử check-in/check-out.</p>
      )}
    </aside>
  )
}

export default CustomerHistoryPanel
