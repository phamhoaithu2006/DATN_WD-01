import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getCustomerNotificationDetail,
  getCustomerNotifications,
  getCustomerUnreadNotificationCount,
  markCustomerNotificationAsRead,
} from '../../services/customerReviewApi'

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  )
}

function formatNotificationTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function extractNotificationItems(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function isReviewNotification(notification) {
  const text = `${notification?.title || ''} ${notification?.message || ''}`.toLocaleLowerCase('vi-VN')
  return text.includes('đánh giá hướng dẫn viên') || text.includes('đánh giá tour')
}

export default function CustomerNotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState(null)
  const containerRef = useRef(null)

  const latestNotifications = useMemo(() => notifications.slice(0, 8), [notifications])

  const loadNotifications = useCallback(async () => {
    try {
      const payload = await getCustomerNotifications(1)
      const count = await getCustomerUnreadNotificationCount()
      setNotifications(extractNotificationItems(payload))
      setUnreadCount(count)
    } catch (error) {
      console.error('Không thể tải thông báo khách hàng:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNotifications()
    const intervalId = window.setInterval(() => void loadNotifications(), 60000)
    return () => window.clearInterval(intervalId)
  }, [loadNotifications])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  async function handleNotificationClick(notification) {
    try {
      setOpeningId(notification.id)
      const detail = await getCustomerNotificationDetail(notification.id).catch(() => null)
      const normalized = detail || notification

      if (notification.status === 'unread') {
        await markCustomerNotificationAsRead(notification.id).catch(() => null)
        setUnreadCount((current) => Math.max(0, current - 1))
        setNotifications((current) => current.map((item) =>
          item.id === notification.id ? { ...item, status: 'read' } : item,
        ))
      }

      toast.info(normalized.title || 'Thông báo', { description: normalized.message })
    } catch (error) {
      console.error('Không thể mở thông báo:', error)
      toast.error('Không thể mở thông báo. Vui lòng thử lại.')
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        aria-label="Thông báo"
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute right-0 -top-2 z-10 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-black leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-[90] w-[min(92vw,410px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-extrabold text-slate-950">Thông báo</h3>
            <p className="mt-0.5 text-xs text-slate-500">{unreadCount} thông báo chưa đọc</p>
          </div>

          <div className="max-h-[430px] overflow-y-auto">
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">Đang tải thông báo...</div>
            ) : latestNotifications.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">Bạn chưa có thông báo nào.</div>
            ) : (
              latestNotifications.map((notification) => {
                const isUnread = notification.status === 'unread'
                const isReview = isReviewNotification(notification)
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    disabled={openingId === notification.id}
                    className={`flex w-full gap-3 border-b border-slate-100 px-5 py-4 text-left last:border-b-0 hover:bg-slate-50 disabled:opacity-60 ${isUnread ? 'bg-blue-50/55' : 'bg-white'}`}
                  >
                    <span className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isReview ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      {isReview ? '★' : 'i'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <strong className="line-clamp-1 text-sm text-slate-900">{notification.title || 'Thông báo'}</strong>
                        {isUnread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" /> : null}
                      </span>
                      <span className="mt-1 block line-clamp-3 text-xs leading-5 text-slate-500">{notification.message}</span>
                      <span className="mt-2 block text-[11px] font-semibold text-slate-400">{formatNotificationTime(notification.created_at)}</span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}