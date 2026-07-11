import { useCallback, useEffect, useRef, useState } from 'react'
import adminNotificationApi from '../../../services/adminNotificationApi'

function getNotificationList(response) {
  const payload = response?.data ?? response
  const data = payload?.data ?? payload

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data
  if (Array.isArray(payload?.notifications)) return payload.notifications

  return []
}

function getUnreadCount(response) {
  const payload = response?.data ?? response

  return Number(
    payload?.data?.count ??
      payload?.count ??
      payload?.unread_count ??
      payload?.data?.unread_count ??
      0
  )
}

function formatNotificationTime(value) {
  if (!value) return ''

  const date = new Date(String(value).replace(' ', 'T'))

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getNotificationTypeLabel(type) {
  const map = {
    system: 'Hệ thống',
    booking: 'Booking',
    tour: 'Tour',
    guide: 'HDV',
  }

  return map[type] || type || 'Thông báo'
}

export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await adminNotificationApi.getUnreadCount()
      setUnreadCount(getUnreadCount(response))
    } catch (error) {
      console.error(error)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)

      const response = await adminNotificationApi.getList({
        per_page: 12,
      })

      const list = getNotificationList(response)

      setNotifications(list)

      setSelectedNotification((current) => {
        if (!current) return list[0] || null

        return (
          list.find((item) => String(item.id) === String(current.id)) ||
          current
        )
      })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUnreadCount()

    const intervalId = window.setInterval(() => {
      void fetchUnreadCount()
    }, 30000)

    const handleChanged = () => {
      void fetchUnreadCount()

      if (open) {
        void fetchNotifications()
      }
    }

    window.addEventListener('focus', fetchUnreadCount)
    window.addEventListener('admin-notification:changed', handleChanged)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', fetchUnreadCount)
      window.removeEventListener('admin-notification:changed', handleChanged)
    }
  }, [fetchUnreadCount, fetchNotifications, open])

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  async function toggleDropdown() {
    const nextOpen = !open

    setOpen(nextOpen)

    if (nextOpen) {
      await fetchNotifications()
      await fetchUnreadCount()
    }
  }

  async function closeDropdown() {
    setOpen(false)
    await fetchUnreadCount()
  }

  async function markAllAsRead() {
    try {
      await adminNotificationApi.markAllAsRead()
      setUnreadCount(0)
      await fetchNotifications()
      window.dispatchEvent(new Event('admin-notification:changed'))
    } catch (error) {
      console.error(error)
    }
  }

  async function openDetail(notification) {
    setSelectedNotification(notification)

    if (!notification?.id || notification.status === 'read') {
      return
    }

    try {
      await adminNotificationApi.markAsRead(notification.id)
      setNotifications((current) =>
        current.map((item) =>
          String(item.id) === String(notification.id)
            ? { ...item, status: 'read' }
            : item
        )
      )
      setSelectedNotification((current) =>
        current && String(current.id) === String(notification.id)
          ? { ...current, status: 'read' }
          : current
      )
      await fetchUnreadCount()
      window.dispatchEvent(new Event('admin-notification:changed'))
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
        title="Thông báo admin"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-black leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[760px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="font-black text-slate-900">Thông báo admin</h3>
              <p className="text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : 'Không có thông báo mới'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  Đọc tất cả
                </button>
              ) : null}

              <button
                type="button"
                onClick={closeDropdown}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>

          <div className="grid max-h-[520px] grid-cols-[320px_minmax(0,1fr)] overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto border-r border-slate-100">
              {loading ? (
                <div className="p-5 text-center text-sm text-slate-500">
                  Đang tải thông báo...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-5 text-center text-sm text-slate-500">
                  Chưa có thông báo.
                </div>
              ) : (
                notifications.map((item) => {
                  const unread = item.status === 'unread'
                  const active =
                    selectedNotification &&
                    String(selectedNotification.id) === String(item.id)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openDetail(item)}
                      className={`relative block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 ${
                        active
                          ? 'bg-blue-50'
                          : unread
                            ? 'bg-rose-50/70 hover:bg-rose-50'
                            : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      {unread ? (
                        <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                          NEW
                        </span>
                      ) : null}

                      <div className="flex items-start gap-3 pr-10">
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            unread ? 'bg-rose-600' : 'bg-slate-300'
                          }`}
                        />

                        <div className="min-w-0">
                          <p
                            className={`line-clamp-1 text-sm ${
                              unread
                                ? 'font-black text-slate-900'
                                : 'font-bold text-slate-700'
                            }`}
                          >
                            {item.title || 'Thông báo'}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {item.message || item.content || ''}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatNotificationTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <div className="max-h-[520px] overflow-y-auto bg-slate-50/70 p-4">
              {selectedNotification ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                        {getNotificationTypeLabel(selectedNotification.type)}
                      </span>

                      <h4 className="mt-3 text-lg font-black text-slate-950">
                        {selectedNotification.title || 'Thông báo'}
                      </h4>

                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {formatNotificationTime(selectedNotification.created_at)}
                      </p>
                    </div>

                    {selectedNotification.status === 'unread' ? (
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                        Chưa đọc
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                        Đã đọc
                      </span>
                    )}
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                      {selectedNotification.message ||
                        selectedNotification.content ||
                        'Không có nội dung.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                  <div>
                    <p className="font-black text-slate-800">
                      Chọn một thông báo
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Nội dung chi tiết sẽ hiển thị tại đây.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}