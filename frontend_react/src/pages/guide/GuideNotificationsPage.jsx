import { useEffect, useMemo, useState } from 'react'
import {
  getGuideNotificationDetail,
  getGuideNotifications,
  markGuideNotificationAsRead,
} from '../../services/guideNotificationApi'

function formatDateTime(value) {
  if (!value) return 'Chưa có thời gian'

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

function normalizeNotification(notification) {
  return {
    ...notification,
    status: notification?.status || (notification?.read_at ? 'read' : 'unread'),
  }
}

function GuideNotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.status === 'unread').length,
    [notifications],
  )

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((item) => item.status === 'unread')
    }

    if (filter === 'read') {
      return notifications.filter((item) => item.status !== 'unread')
    }

    return notifications
  }, [filter, notifications])

  async function loadNotifications() {
    setLoading(true)
    setError('')

    try {
      let page = 1
      let lastPage = 1
      const allItems = []

      do {
        const payload = await getGuideNotifications(page)
        allItems.push(...payload.items)
        lastPage = payload.meta.last_page || 1
        page += 1
      } while (page <= lastPage)

      const items = allItems.map(normalizeNotification)

      setNotifications(items)
      setSelectedNotification(items[0] || null)
    } catch {
      setError('Không tải được danh sách thông báo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadNotifications)
  }, [])

  async function openNotification(notification) {
    setDetailLoading(true)
    setError('')
    setMessage('')

    try {
      const detail = normalizeNotification(await getGuideNotificationDetail(notification.id))
      setSelectedNotification(detail)
      setNotifications((current) =>
        current.map((item) => (item.id === detail.id ? { ...item, ...detail } : item)),
      )
    } catch {
      setError('Không mở được thông báo này.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function markCurrentAsRead() {
    if (!selectedNotification || selectedNotification.status !== 'unread') return

    setError('')
    setMessage('')

    try {
      await markGuideNotificationAsRead(selectedNotification.id)
      setSelectedNotification((current) =>
        current ? { ...current, status: 'read', read_at: current.read_at || new Date().toISOString() } : current,
      )
      setNotifications((current) =>
        current.map((item) =>
          item.id === selectedNotification.id
            ? { ...item, status: 'read', read_at: item.read_at || new Date().toISOString() }
            : item,
        ),
      )
      setMessage('Đã đánh dấu thông báo là đã đọc.')
    } catch {
      setError('Không đánh dấu đã đọc được.')
    }
  }

  return (
    <div className="guide-notifications-page">
      <section className="guide-notifications-header">
        <div>
          <span>Trung tâm thông báo</span>
          <h1>Thông báo của hướng dẫn viên</h1>
          <p>Nhận thông tin phân công tour và các tin nhắn admin gửi cho bạn.</p>
        </div>

        <div className="guide-notifications-summary">
          <strong>{unreadCount}</strong>
          <span>chưa đọc</span>
        </div>
      </section>

      {(error || message) && (
        <div className={error ? 'guide-profile-alert is-error' : 'guide-profile-alert'}>
          {error || message}
        </div>
      )}

      <section className="guide-notifications-toolbar">
        {[
          ['all', 'Tất cả'],
          ['unread', 'Chưa đọc'],
          ['read', 'Đã đọc'],
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
      </section>

      <section className="guide-notifications-grid">
        <div className="guide-notifications-list-panel">
          {loading ? (
            <div className="guide-notification-empty large">Đang tải thông báo...</div>
          ) : filteredNotifications.length > 0 ? (
            <div className="guide-notification-list">
              {filteredNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={[
                    'guide-notification-item',
                    notification.status === 'unread' ? 'unread' : '',
                    selectedNotification?.id === notification.id ? 'selected' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => openNotification(notification)}
                >
                  <span className="guide-notification-dot" />
                  <span>
                    <strong>{notification.title}</strong>
                    <small>{formatDateTime(notification.created_at)}</small>
                    <p>{notification.message}</p>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="guide-notification-empty large">Không có thông báo phù hợp.</div>
          )}
        </div>

        <article className="guide-notification-reader">
          {selectedNotification ? (
            <>
              <div className="guide-notification-reader-head">
                <div>
                  <span>{selectedNotification.status === 'unread' ? 'Chưa đọc' : 'Đã đọc'}</span>
                  <h2>{selectedNotification.title}</h2>
                  <small>{formatDateTime(selectedNotification.created_at)}</small>
                </div>

                {selectedNotification.status === 'unread' && (
                  <button type="button" onClick={markCurrentAsRead}>
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>

              <p className="guide-notification-reader-message">
                {detailLoading ? 'Đang mở nội dung...' : selectedNotification.message}
              </p>
            </>
          ) : (
            <div className="guide-notification-empty large">Chọn một thông báo để xem nội dung.</div>
          )}
        </article>
      </section>
    </div>
  )
}

export default GuideNotificationsPage
