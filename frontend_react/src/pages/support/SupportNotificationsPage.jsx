import { useEffect, useMemo, useState } from 'react'
import {
  getSupportNotificationDetail,
  getSupportNotifications,
  markSupportNotificationAsRead,
  sendSupportNotification,
} from '../../services/supportNotificationApi'
import { formatDateTimeDdMmYyyy } from '../../utils/dateFormat'

const EMPTY_FORM = {
  title: '',
  message: '',
}

function formatDateTime(value) {
  return formatDateTimeDdMmYyyy(value, '?')
}

function normalizeNotification(notification) {
  return {
    ...notification,
    status: notification?.status || (notification?.read_at ? 'read' : 'unread'),
  }
}

function SupportNotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [filter, setFilter] = useState('all')
  const [section, setSection] = useState('inbox')
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.status === 'unread').length,
    [notifications],
  )

  const heroDescription =
    section === 'compose'
      ? 'Gửi các thông báo tới admin.'
      : 'Nhận các thông báo bên admin gửi cho bạn.'

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((item) => item.status === 'unread')
    if (filter === 'read') return notifications.filter((item) => item.status !== 'unread')
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
        const payload = await getSupportNotifications(page)
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
      const detail = normalizeNotification(await getSupportNotificationDetail(notification.id))
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
      await markSupportNotificationAsRead(selectedNotification.id)
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

  function handleFormChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSendSubmit(event) {
    event.preventDefault()
    setSending(true)
    setError('')
    setMessage('')

    try {
      const response = await sendSupportNotification(form)
      setForm(EMPTY_FORM)
      setMessage(response?.message || 'Đã gửi thông báo tới admin.')
    } catch (sendError) {
      setError(sendError?.response?.data?.message || 'Không gửi được thông báo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="guide-notifications-page support-notifications-page">
      <section className="support-notifications-hero">
        <div className="support-notifications-hero-copy">
          <span className="support-notifications-kicker">Trung tâm thông báo</span>
          <h1>Thông báo của nhân viên hỗ trợ</h1>
          <p>{heroDescription}</p>

          <div className="support-notifications-hero-actions">
            <button
              type="button"
              className={section === 'inbox' ? 'active' : ''}
              onClick={() => setSection('inbox')}
            >
              Hộp thư đến
            </button>
            <button
              type="button"
              className={section === 'compose' ? 'active' : ''}
              onClick={() => setSection('compose')}
            >
              Gửi thông báo
            </button>
          </div>
        </div>

        {section === 'inbox' ? (
          <div className="support-notifications-summary-card">
            <span>Chưa đọc</span>
            <strong>{unreadCount}</strong>
          </div>
        ) : null}
      </section>

      {(error || message) && (
        <div className={error ? 'guide-profile-alert is-error' : 'guide-profile-alert'}>
          {error || message}
        </div>
      )}

      {section === 'compose' ? (
        <section className="support-compose-layout">
          <form className="support-compose-panel" onSubmit={handleSendSubmit}>
            <div className="support-compose-head">
              <div>
                <span>Gửi mới</span>
                <h2>Gửi thông báo tới admin</h2>
              </div>
            </div>

            <label className="guide-field guide-field-wide">
              <span>Tiêu đề</span>
              <input
                name="title"
                value={form.title}
                onChange={handleFormChange}
                placeholder="Nhập tiêu đề thông báo"
              />
            </label>

            <label className="guide-field guide-field-wide">
              <span>Nội dung</span>
              <textarea
                name="message"
                rows="9"
                value={form.message}
                onChange={handleFormChange}
                placeholder="Nhập nội dung thông báo"
                style={{ resize: 'vertical' }}
              />
            </label>

            <div className="support-compose-foot">
              <div className="support-compose-hint">
                <strong>Lưu ý</strong>
                <span>Ghi rõ thời gian, nội dung và yêu cầu xử lý...</span>
              </div>

              <button className="guide-primary-button" type="submit" disabled={sending}>
                {sending ? 'Đang gửi...' : 'Gửi thông báo'}
              </button>
            </div>
          </form>

          <aside className="support-compose-preview">
            <div className="support-compose-preview-card">
              <span>Xem trước</span>
              <strong>{form.title || 'Tiêu đề thông báo'}</strong>
              <p>{form.message || 'Nội dung thông báo sẽ hiển thị tại đây.'}</p>
            </div>

            <div className="support-compose-preview-note">
              <strong className="support-compose-preview-note-label">Đến:</strong>
              <span className="support-compose-preview-note-value">Tài khoản quản trị viên trong hệ thống</span>
            </div>
          </aside>
        </section>
      ) : (
        <section className="guide-notifications-grid support-inbox-grid">
          <div
            className={[
              'guide-notifications-list-panel',
              'support-inbox-panel',
              loading || filteredNotifications.length === 0 ? 'is-empty' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="support-inbox-head">
              <div>
                <span>Hộp thư đến</span>
              </div>

              <div className="support-inbox-filter">
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
              </div>
            </div>

            {loading ? (
              <div className="guide-notification-empty large">Đang tải thông báo...</div>
            ) : filteredNotifications.length > 0 ? (
              <div className="guide-notification-list support-notification-list">
                {filteredNotifications.map((notification) => {
                  const unread = notification.status === 'unread'

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={[
                        'guide-notification-item',
                        unread ? 'unread' : '',
                        selectedNotification?.id === notification.id ? 'selected' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => openNotification(notification)}
                    >
                      <span className={`guide-notification-dot ${unread ? 'is-unread' : ''}`} />
                      <span>
                        <div className="support-notification-item-head">
                          <strong>{notification.title}</strong>
                          <span>{unread ? 'Chưa đọc' : 'Đã đọc'}</span>
                        </div>
                        <small>{formatDateTime(notification.created_at)}</small>
                        <p>{notification.message}</p>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="guide-notification-empty large">Không có thông báo phù hợp.</div>
            )}
          </div>

          <article
            className={[
              'guide-notification-reader',
              'support-reader',
              !selectedNotification ? 'is-empty' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {selectedNotification ? (
              <>
                <div className="guide-notification-reader-head support-reader-head">
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
      )}
    </div>
  )
}

export default SupportNotificationsPage
