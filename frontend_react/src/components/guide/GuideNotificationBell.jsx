import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getGuideNotificationDetail,
  getGuideNotifications,
  getGuideUnreadNotificationCount,
} from '../../services/guideNotificationApi'

function formatNotificationTime(value) {
  if (!value) return ''

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

function shortMessage(value) {
  const text = String(value || '').trim()
  return text.length > 96 ? `${text.slice(0, 96)}...` : text
}

function GuideNotificationBell() {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [error, setError] = useState('')

  const latestNotifications = useMemo(
    () => notifications.slice(0, 5),
    [notifications],
  )

  async function loadNotifications() {
    setLoading(true)
    setError('')

    try {
      const [notificationPayload, count] = await Promise.all([
        getGuideNotifications(1),
        getGuideUnreadNotificationCount(),
      ])

      setNotifications(notificationPayload.items)
      setUnreadCount(count)
    } catch {
      setError('Không tải được thông báo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadNotifications)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    function closeOnOutsideClick(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)

    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  async function openNotification(notification) {
    setDetailLoading(true)
    setError('')

    try {
      const detail = await getGuideNotificationDetail(notification.id)
      setSelectedNotification(detail)
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, status: 'read', read_at: detail?.read_at || item.read_at }
            : item,
        ),
      )
      setUnreadCount((current) =>
        notification.status === 'unread' ? Math.max(current - 1, 0) : current,
      )
    } catch {
      setError('Không mở được nội dung thông báo.')
    } finally {
      setDetailLoading(false)
    }
  }

  function goToNotificationPage() {
    setOpen(false)
    navigate('/guide/notifications')
  }

  return (
    <div className="guide-notification-bell" ref={panelRef}>
      <button
        type="button"
        className="notif-btn"
        title="Thông báo"
        aria-label="Mở thông báo"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="guide-notification-popover" role="dialog" aria-label="Thông báo mới nhất">
          <div className="guide-notification-popover-head">
            <div>
              <strong>Thông báo</strong>
              <span>{unreadCount} chưa đọc</span>
            </div>
            <button type="button" onClick={goToNotificationPage}>
              Xem tất cả
            </button>
          </div>

          {error && <div className="guide-notification-error">{error}</div>}

          {loading ? (
            <div className="guide-notification-empty">Đang tải thông báo...</div>
          ) : latestNotifications.length > 0 ? (
            <div className="guide-notification-list compact">
              {latestNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={
                    notification.status === 'unread'
                      ? 'guide-notification-item unread'
                      : 'guide-notification-item'
                  }
                  onClick={() => openNotification(notification)}
                >
                  <span className="guide-notification-dot" />
                  <span>
                    <strong>{notification.title}</strong>
                    <small>{formatNotificationTime(notification.created_at)}</small>
                    <p>{shortMessage(notification.message)}</p>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="guide-notification-empty">Chưa có thông báo nào.</div>
          )}

          {selectedNotification && (
            <div className="guide-notification-detail">
              <div className="guide-notification-detail-head">
                <strong>{selectedNotification.title}</strong>
                <button type="button" onClick={() => setSelectedNotification(null)}>
                  Đóng
                </button>
              </div>
              <small>{formatNotificationTime(selectedNotification.created_at)}</small>
              <p>{detailLoading ? 'Đang mở nội dung...' : selectedNotification.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GuideNotificationBell
