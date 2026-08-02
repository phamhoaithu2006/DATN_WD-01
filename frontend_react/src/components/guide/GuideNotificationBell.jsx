import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getGuideNotificationDetail,
  getGuideNotifications,
  getGuideUnreadNotificationCount,
} from '../../services/guideNotificationApi'
import LoadingState from '../common/LoadingState'

const POLL_INTERVAL = 60000
const CACHE_DURATION = 30000
const EVENT_NAME = 'guide-notification:changed'
const EVENT_SOURCE = 'guide-notification-bell'

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

function normalizeNotificationItems(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function GuideNotificationBell() {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const requestRef = useRef(null)
  const lastLoadedAtRef = useRef(0)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detailLoadingId, setDetailLoadingId] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [error, setError] = useState('')

  const latestNotifications = useMemo(
    () => notifications.slice(0, 5),
    [notifications],
  )

  const loadNotifications = useCallback(
    async ({ force = false, showLoading = false } = {}) => {
      if (document.visibilityState !== 'visible') {
        return null
      }

      const now = Date.now()

      if (
        !force &&
        now - lastLoadedAtRef.current < CACHE_DURATION
      ) {
        return null
      }

      if (requestRef.current) {
        return requestRef.current
      }

      if (showLoading) {
        setLoading(true)
      }

      setError('')

      const request = Promise.all([
        getGuideNotifications(1),
        getGuideUnreadNotificationCount(),
      ])
        .then(([notificationPayload, unreadTotal]) => {
          const items = normalizeNotificationItems(notificationPayload)
          const nextUnreadCount = Number(unreadTotal || 0)

          setNotifications(items)
          setUnreadCount(
            Number.isFinite(nextUnreadCount)
              ? Math.max(0, nextUnreadCount)
              : 0,
          )

          lastLoadedAtRef.current = Date.now()

          return {
            items,
            unreadCount: nextUnreadCount,
          }
        })
        .catch((loadError) => {
          console.error('Không thể tải thông báo hướng dẫn viên:', loadError)
          setError('Không tải được thông báo.')
          return null
        })
        .finally(() => {
          requestRef.current = null
          setLoading(false)
        })

      requestRef.current = request
      return request
    },
    [],
  )

  useEffect(() => {
    void loadNotifications({
      force: true,
      showLoading: true,
    })

    const timer = window.setInterval(() => {
      void loadNotifications()
    }, POLL_INTERVAL)

    function handleNotificationChanged(event) {
      if (event?.detail?.source === EVENT_SOURCE) {
        return
      }

      void loadNotifications({
        force: true,
      })
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadNotifications({
          force: true,
        })
      }
    }

    function handleFocus() {
      void loadNotifications()
    }

    window.addEventListener(
      EVENT_NAME,
      handleNotificationChanged,
    )
    window.addEventListener(
      'focus',
      handleFocus,
    )
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.clearInterval(timer)
      window.removeEventListener(
        EVENT_NAME,
        handleNotificationChanged,
      )
      window.removeEventListener(
        'focus',
        handleFocus,
      )
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [loadNotifications])

  useEffect(() => {
    if (!open) return undefined

    function closeOnOutsideClick(event) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      closeOnOutsideClick,
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        closeOnOutsideClick,
      )
    }
  }, [open])

  function toggleNotificationPanel() {
    setOpen((current) => {
      const nextOpen = !current

      if (nextOpen) {
        void loadNotifications({
          showLoading: notifications.length === 0,
        })
      }

      return nextOpen
    })
  }

  async function openNotification(notification) {
    if (!notification?.id || detailLoadingId) {
      return
    }

    setDetailLoadingId(notification.id)
    setError('')

    try {
      const detail = await getGuideNotificationDetail(
        notification.id,
      )

      const normalizedDetail = detail || notification
      setSelectedNotification(normalizedDetail)

      if (notification.status === 'unread') {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  status: 'read',
                  read_at:
                    normalizedDetail?.read_at ||
                    item.read_at ||
                    new Date().toISOString(),
                }
              : item,
          ),
        )

        setUnreadCount((current) =>
          Math.max(current - 1, 0),
        )
      }

      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: {
            source: EVENT_SOURCE,
            notificationId: notification.id,
          },
        }),
      )
    } catch (openError) {
      console.error(
        'Không thể mở thông báo hướng dẫn viên:',
        openError,
      )
      setError('Không mở được nội dung thông báo.')
    } finally {
      setDetailLoadingId(null)
    }
  }

  function goToNotificationPage() {
    setOpen(false)
    navigate('/guide/notifications')
  }

  return (
    <div
      className="guide-notification-bell"
      ref={panelRef}
    >
      <button
        type="button"
        className="notif-btn"
        title="Thông báo"
        aria-label="Mở thông báo"
        aria-expanded={open}
        onClick={toggleNotificationPanel}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 9
              ? '9+'
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="guide-notification-popover"
          role="dialog"
          aria-label="Thông báo mới nhất"
        >
          <div className="guide-notification-popover-head">
            <div>
              <strong>Thông báo</strong>
              <span>{unreadCount} chưa đọc</span>
            </div>

            <button
              type="button"
              onClick={goToNotificationPage}
            >
              Xem tất cả
            </button>
          </div>

          {error && (
            <div className="guide-notification-error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="guide-notification-empty">
              <LoadingState compact label="Đang tải thông báo..." />
            </div>
          ) : latestNotifications.length > 0 ? (
            <div className="guide-notification-list compact">
              {latestNotifications.map((notification) => {
                const isDetailLoading =
                  detailLoadingId === notification.id

                return (
                  <button
                    key={notification.id}
                    type="button"
                    className={
                      notification.status === 'unread'
                        ? 'guide-notification-item unread'
                        : 'guide-notification-item'
                    }
                    onClick={() =>
                      void openNotification(notification)
                    }
                    disabled={Boolean(detailLoadingId)}
                  >
                    <span className="guide-notification-dot" />

                    <span>
                      <strong>
                        {notification.title}
                      </strong>

                      <small>
                        {formatNotificationTime(
                          notification.created_at,
                        )}
                      </small>

                      <p>
                        {isDetailLoading
                          ? 'Đang mở nội dung...'
                          : shortMessage(notification.message)}
                      </p>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="guide-notification-empty">
              Chưa có thông báo nào.
            </div>
          )}

          {selectedNotification && (
            <div className="guide-notification-detail">
              <div className="guide-notification-detail-head">
                <strong>
                  {selectedNotification.title}
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedNotification(null)
                  }
                >
                  Đóng
                </button>
              </div>

              <small>
                {formatNotificationTime(
                  selectedNotification.created_at,
                )}
              </small>

              <p>{selectedNotification.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GuideNotificationBell
