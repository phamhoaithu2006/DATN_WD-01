import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getSupportNotificationDetail,
  getSupportNotifications,
  getSupportUnreadNotificationCount,
  markSupportNotificationAsRead,
} from '../../services/supportNotificationApi'

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
  return text.length > 110 ? `${text.slice(0, 110)}...` : text
}

/**
 * Lấy mã ticket từ message notification.
 *
 * CustomerSupportRequestController hiện tạo message có dạng:
 * "Mã: SUP-20260716-ABC123"
 */
function extractTicketCode(notification) {
  if (notification?.ticket_code) {
    return String(notification.ticket_code).trim()
  }

  const source = `${notification?.message || ''} ${notification?.title || ''}`

  const match = source.match(/SUP-\d{8}-[A-Z0-9]+/i)

  return match ? match[0].toUpperCase() : ''
}

function SupportNotificationBell() {
  const navigate = useNavigate()
  const modalRef = useRef(null)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [error, setError] = useState('')

  const latestNotifications = useMemo(
    () => notifications.slice(0, 20),
    [notifications],
  )

  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true)
        setError('')
      }

      try {
        const [notificationPayload, unreadTotal] = await Promise.all([
          getSupportNotifications(1),
          getSupportUnreadNotificationCount(),
        ])

        const items = Array.isArray(notificationPayload?.items)
          ? notificationPayload.items
          : []

        setNotifications(items)
        setUnreadCount(Number(unreadTotal || 0))

        // Khi modal đang mở mà chưa chọn notification,
        // tự chọn thông báo đầu tiên.
        if (!selectedNotification && items.length > 0) {
          setSelectedNotification(items[0])
        }
      } catch (requestError) {
        console.error('Không tải được thông báo:', requestError)

        if (!silent) {
          setError('Không tải được thông báo.')
        }
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [selectedNotification],
  )

  useEffect(() => {
    void loadNotifications()

    const intervalId = window.setInterval(() => {
      void loadNotifications({ silent: true })
    }, 30000)

    function handleNotificationChanged() {
      void loadNotifications({ silent: true })
    }

    window.addEventListener(
      'support-notification-changed',
      handleNotificationChanged,
    )

    return () => {
      window.clearInterval(intervalId)

      window.removeEventListener(
        'support-notification-changed',
        handleNotificationChanged,
      )
    }
  }, [loadNotifications])

  useEffect(() => {
    if (!open) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  async function openNotification(notification) {
    if (!notification?.id) return

    setDetailLoading(true)
    setError('')

    try {
      const detail = await getSupportNotificationDetail(notification.id)

      if (notification.status === 'unread') {
        await markSupportNotificationAsRead(notification.id)
      }

      const normalizedDetail = {
        ...notification,
        ...(detail || {}),
        status: 'read',
        read_at:
          detail?.read_at ||
          notification.read_at ||
          new Date().toISOString(),
      }

      setSelectedNotification(normalizedDetail)

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                ...normalizedDetail,
              }
            : item,
        ),
      )

      if (notification.status === 'unread') {
        setUnreadCount((current) => Math.max(current - 1, 0))
      }
    } catch (requestError) {
      console.error('Không mở được thông báo:', requestError)
      setError('Không mở được nội dung thông báo.')
    } finally {
      setDetailLoading(false)
    }
  }

  function openRelatedSupportRequest() {
    if (!selectedNotification) return

    const ticketCode = extractTicketCode(selectedNotification)

    setOpen(false)

    if (ticketCode) {
      navigate(
        `/support/requests?ticket=${encodeURIComponent(ticketCode)}`,
      )
      return
    }

    // Fallback: nếu notification cũ không có ticket code
    // thì vẫn chuyển đến danh sách yêu cầu hỗ trợ.
    navigate('/support/requests')
  }

  function openNotificationPage() {
    setOpen(false)
    navigate('/support/notifications')
  }

  function closeModal() {
    setOpen(false)
  }

  return (
    <>
      <div className="guide-notification-bell">
        <button
          type="button"
          className="notif-btn"
          title="Thông báo"
          aria-label="Mở thông báo"
          aria-expanded={open}
          onClick={() => {
            setOpen(true)
            void loadNotifications()
          }}
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
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div
          className="support-notification-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              modalRef.current &&
              !modalRef.current.contains(event.target)
            ) {
              closeModal()
            }
          }}
        >
          <div
            ref={modalRef}
            className="support-notification-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Thông báo nhân viên hỗ trợ"
          >
            {/* Header */}
            <header className="support-notification-modal-head">
              <div>
                <strong>Thông báo</strong>
                <span>
                  {unreadCount > 0
                    ? `${unreadCount} thông báo chưa đọc`
                    : 'Không có thông báo mới'}
                </span>
              </div>

              <div className="support-notification-modal-actions">
                <button
                  type="button"
                  onClick={openNotificationPage}
                >
                  Xem tất cả
                </button>

                <button
                  type="button"
                  className="support-notification-close"
                  onClick={closeModal}
                >
                  Đóng
                </button>
              </div>
            </header>

            {error ? (
              <div className="support-notification-error">
                {error}
              </div>
            ) : null}

            <div className="support-notification-body">
              {/* LEFT - LIST */}
              <aside className="support-notification-list-pane">
                {loading ? (
                  <div className="support-notification-empty">
                    Đang tải thông báo...
                  </div>
                ) : latestNotifications.length === 0 ? (
                  <div className="support-notification-empty">
                    Chưa có thông báo nào.
                  </div>
                ) : (
                  <div className="support-notification-list">
                    {latestNotifications.map((notification) => {
                      const active =
                        selectedNotification?.id === notification.id

                      return (
                        <button
                          key={notification.id}
                          type="button"
                          className={[
                            'support-notification-list-item',
                            notification.status === 'unread'
                              ? 'is-unread'
                              : '',
                            active ? 'is-active' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => openNotification(notification)}
                        >
                          <span className="support-notification-dot" />

                          <span className="support-notification-item-content">
                            <strong>
                              {notification.title || 'Thông báo'}
                            </strong>

                            <p>
                              {shortMessage(notification.message)}
                            </p>

                            <small>
                              {formatNotificationTime(
                                notification.created_at,
                              )}
                            </small>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </aside>

              {/* RIGHT - DETAIL */}
              <section className="support-notification-detail-pane">
                {!selectedNotification ? (
                  <div className="support-notification-empty detail">
                    Chọn một thông báo để xem chi tiết.
                  </div>
                ) : detailLoading ? (
                  <div className="support-notification-empty detail">
                    Đang mở nội dung...
                  </div>
                ) : (
                  <article className="support-notification-detail-card">
                    <div className="support-notification-detail-top">
                      <span className="support-notification-type">
                        Hệ thống
                      </span>

                      <span className="support-notification-read-state">
                        {selectedNotification.status === 'unread'
                          ? 'Chưa đọc'
                          : 'Đã đọc'}
                      </span>
                    </div>

                    <h3>
                      {selectedNotification.title || 'Thông báo'}
                    </h3>

                    <time>
                      {formatNotificationTime(
                        selectedNotification.created_at,
                      )}
                    </time>

                    <div className="support-notification-message-box">
                      {selectedNotification.message}
                    </div>

                    {extractTicketCode(selectedNotification) ? (
                      <button
                        type="button"
                        className="support-notification-open-request"
                        onClick={openRelatedSupportRequest}
                      >
                        <span>
                          Mở yêu cầu hỗ trợ
                        </span>

                        <small>
                          {extractTicketCode(selectedNotification)}
                        </small>

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 12h14" />
                          <path d="m13 6 6 6-6 6" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="support-notification-open-request"
                        onClick={openRelatedSupportRequest}
                      >
                        <span>Đi đến yêu cầu hỗ trợ</span>

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 12h14" />
                          <path d="m13 6 6 6-6 6" />
                        </svg>
                      </button>
                    )}
                  </article>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SupportNotificationBell