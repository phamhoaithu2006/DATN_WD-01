import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getCustomerNotificationDetail,
  getCustomerNotifications,
  getCustomerUnreadNotificationCount,
  getReviewableGuideBookings,
  markCustomerNotificationAsRead,
} from '../../services/customerReviewApi'
import GuideReviewModal from './GuideReviewModal'

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  )
}

function parseNotificationData(value) {
  if (!value) return {}
  if (typeof value === 'object') return value

  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function isSupportRequestNotification(notification) {
  const data = parseNotificationData(notification?.data)
  const kind = String(notification?.kind || data?.kind || '').toLowerCase()
  const searchableText = `${notification?.title || ''} ${notification?.message || ''}`.toLocaleLowerCase('vi-VN')

  return Boolean(
    notification?.support_request_id ||
      data?.support_request_id ||
      kind.startsWith('support_request') ||
      searchableText.includes('yêu cầu hỗ trợ') ||
      searchableText.includes('bổ sung thông tin')
  )
}

function extractSupportRequestId(notification) {
  const data = parseNotificationData(notification?.data)

  return (
    notification?.support_request_id ||
    data?.support_request_id ||
    null
  )
}

function extractSupportTicketCode(notification) {
  const data = parseNotificationData(notification?.data)

  if (data?.ticket_code) {
    return String(data.ticket_code).trim().toUpperCase()
  }

  const source = `${notification?.title || ''} ${notification?.message || ''}`
  const match = source.match(/SUP-\d{8}-[A-Z0-9]+/i)

  return match ? match[0].toUpperCase() : ''
}


function isGuideReviewNotification(notification) {
  const data = parseNotificationData(notification?.data)
  const searchableText = `${notification?.title || ''} ${notification?.message || ''}`.toLocaleLowerCase('vi-VN')

  return (
    data.kind === 'guide_review_request' ||
    (data.booking_id != null && data.guide_id != null) ||
    searchableText.includes('đánh giá hướng dẫn viên')
  )
}

function extractReviewNames(notification) {
  const message = notification?.message || ''
  const match = message.match(/Tour\s+["“](.+?)["”].*?hướng dẫn viên\s+(.+?)(?:\.|$)/i)

  return {
    tourTitle: match?.[1]?.trim() || '',
    guideName: match?.[2]?.trim() || '',
  }
}

function formatNotificationTime(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function extractNotificationItems(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data

  return []
}

function extractReviewableBookings(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data

  return []
}

export default function CustomerNotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const containerRef = useRef(null)

  const latestNotifications = useMemo(
    () => notifications.slice(0, 8),
    [notifications],
  )

  const openReviewNotification = useCallback(async (notification) => {
    const notificationData = parseNotificationData(notification?.data)

    if (!isGuideReviewNotification(notification)) return false

    const payload = await getReviewableGuideBookings({ per_page: 50 })
    const bookings = extractReviewableBookings(payload)
    const { tourTitle, guideName } = extractReviewNames(notification)

    const booking = bookings.find((item) => {
      if (notificationData.booking_id != null) {
        return Number(item.id) === Number(notificationData.booking_id)
      }

      return tourTitle && item?.tour?.title === tourTitle
    })

    const guide = booking?.guides?.find((item) => {
      if (notificationData.guide_id != null) {
        return Number(item.id) === Number(notificationData.guide_id)
      }

      return guideName && item?.full_name === guideName
    })

    if (!booking || !guide || guide.reviewed) {
      toast.info('Đánh giá này đã được hoàn thành hoặc không còn khả dụng.')
      return true
    }

    setReviewTarget({
      booking,
      guide,
      notificationId: notification.id,
    })
    setOpen(false)

    return true
  }, [])

  const loadNotifications = useCallback(
    async ({ announce = false } = {}) => {
      try {
        const payload = await getCustomerNotifications(1)
        const count = await getCustomerUnreadNotificationCount()
        const items = extractNotificationItems(payload)

        setNotifications(items)
        setUnreadCount(count)

        if (announce) {
          const reviewNotification = items.find((item) => {
            return (
              item?.status === 'unread' &&
              isGuideReviewNotification(item)
            )
          })

          if (reviewNotification) {
            const storageKey = `vivugo_review_notification_${reviewNotification.id}`

            if (!window.sessionStorage.getItem(storageKey)) {
              window.sessionStorage.setItem(storageKey, 'shown')
              toast.info(
                reviewNotification.title || 'Đánh giá hướng dẫn viên',
                {
                  description: reviewNotification.message,
                  duration: 9000,
                  action: {
                    label: 'Đánh giá',
                    onClick: () => {
                      void openReviewNotification(reviewNotification)
                    },
                  },
                },
              )
            }
          }
        }
      } catch (error) {
        console.error('Không thể tải thông báo khách hàng:', error)
      } finally {
        setLoading(false)
      }
    },
    [openReviewNotification],
  )

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadNotifications({ announce: true })
    }, 0)

    const intervalId = window.setInterval(() => {
      void loadNotifications()
    }, 60000)

    return () => {
      window.clearTimeout(initialLoadId)
      window.clearInterval(intervalId)
    }
  }, [loadNotifications])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  async function handleNotificationAction(notification) {
    try {
      setOpeningId(notification.id)

      const detail = await getCustomerNotificationDetail(notification.id)
      const normalizedNotification = detail || notification
      const isReview = isGuideReviewNotification(normalizedNotification)

      if (isReview) {
        await openReviewNotification(normalizedNotification)
        return
      }

      if (notification.status === 'unread') {
        await markCustomerNotificationAsRead(notification.id).catch(() => null)
        setUnreadCount((current) => Math.max(0, current - 1))
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  status: 'read',
                }
              : item,
          ),
        )
      }

      if (isSupportRequestNotification(normalizedNotification)) {
        const supportRequestId =
          extractSupportRequestId(normalizedNotification)
        const ticketCode =
          extractSupportTicketCode(normalizedNotification)

        setOpen(false)

        if (supportRequestId) {
          navigate(
            `/customer/profile?view=support&supportRequestId=${encodeURIComponent(
              supportRequestId,
            )}`,
          )
          return
        }

        if (ticketCode) {
          navigate(
            `/customer/profile?view=support&ticket=${encodeURIComponent(
              ticketCode,
            )}`,
          )
          return
        }

        navigate('/customer/profile?view=support')
        return
      }

      toast.info(normalizedNotification.title || 'Thông báo', {
        description: normalizedNotification.message,
      })
    } catch (error) {
      console.error('Không thể mở thông báo:', error)
      toast.error('Không thể mở thông báo. Vui lòng thử lại.')
    } finally {
      setOpeningId(null)
    }
  }

  async function handleReviewSubmitted() {
    const notificationId = reviewTarget?.notificationId

    try {
      if (notificationId) {
        await markCustomerNotificationAsRead(notificationId).catch(() => null)
      }

      toast.success('Đánh giá hướng dẫn viên thành công.')
      setReviewTarget(null)
      await loadNotifications()
    } catch (error) {
      console.error('Không thể cập nhật thông báo sau đánh giá:', error)
      setReviewTarget(null)
      await loadNotifications()
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
            <p className="mt-0.5 text-xs text-slate-500">
              {unreadCount} thông báo chưa đọc
            </p>
          </div>

          <div className="max-h-[430px] overflow-y-auto">
            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Đang tải thông báo...
              </div>
            ) : latestNotifications.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Bạn chưa có thông báo nào.
              </div>
            ) : (
              latestNotifications.map((notification) => {
                const isReview = isGuideReviewNotification(notification)
                const isUnread = notification.status === 'unread'
                const isOpening = openingId === notification.id

                return (
                  <div
                    key={notification.id}
                    className={`flex gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 ${
                      isUnread ? 'bg-blue-50/55' : 'bg-white'
                    }`}
                  >
                    <span
                      className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        isReview
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {isReview ? '★' : 'i'}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <strong className="line-clamp-1 text-sm text-slate-900">
                          {notification.title || 'Thông báo'}
                        </strong>
                        {isUnread ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        ) : null}
                      </div>

                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">
                        {notification.message}
                      </p>

                      <div className="mt-2 text-[11px] font-semibold text-slate-400">
                        {formatNotificationTime(notification.created_at)}
                      </div>

                      {isReview ? (
                        <button
                          type="button"
                          onClick={() =>
                            void handleNotificationAction(notification)
                          }
                          disabled={isOpening}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span aria-hidden="true">★</span>
                          {isOpening ? 'ĐANG MỞ FORM...' : 'ĐÁNH GIÁ NGAY'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void handleNotificationAction(notification)
                          }
                          disabled={isOpening}
                          className="mt-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isOpening ? 'Đang mở...' : 'Xem'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : null}

      <GuideReviewModal
        key={
          reviewTarget
            ? `${reviewTarget.booking.id}-${reviewTarget.guide.id}`
            : 'closed'
        }
        target={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSubmitted={() => void handleReviewSubmitted()}
      />
    </div>
  )
}
