import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { NavLink } from 'react-router-dom'
import { getGuideTours } from '../../services/guideTourApi'
import { getGuideUnreadNotificationCount } from '../../services/guideNotificationApi'

const TOUR_POLL_INTERVAL = 30000
const NOTIFICATION_POLL_INTERVAL = 60000
const CACHE_DURATION = 30000
const TOUR_EVENT_NAME = 'guide-tour:new-assignment-detected'
const TOUR_CLEAR_EVENT_NAME = 'guide-tour:new-assignment-cleared'
const NOTIFICATION_EVENT_NAME = 'guide-notification:changed'
const EVENT_SOURCE = 'guide-sidebar'

const guideMenuItems = [
  {
    label: 'Trang chủ',
    path: '/guide',
    icon: (
      <>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  {
    label: 'Tour của tôi',
    path: '/guide/tours',
    showNewTourBadge: true,
    icon: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
  },
  {
    label: 'Điểm danh',
    path: '/guide/attendance',
    icon: (
      <>
        <path d="M20 6 9 17l-5-5" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </>
    ),
  },
  {
    label: 'Lịch sử tour',
    path: '/guide/history',
    icon: (
      <>
        <path d="M12 8v4l3 3" />
        <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
      </>
    ),
  },
  {
    label: 'Đánh giá',
    path: '/guide/reviews',
    icon: (
      <>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </>
    ),
  },
  {
    label: 'Thông báo',
    path: '/guide/notifications',
    showNotificationBadge: true,
    icon: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
  },
]

function normalizeTourItems(response) {
  const payload = response?.data ?? response
  const data = payload?.data ?? payload

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
}

function getAssignmentKey(item) {
  return String(
    item?.assignment_id ||
      item?.assignment?.id ||
      item?.tour_guide_assignment_id ||
      item?.id ||
      '',
  )
}

function GuideSidebar({ collapsed, onLogout }) {
  const [newTourCount, setNewTourCount] = useState(0)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)

  const knownAssignmentIdsRef = useRef(new Set())
  const initializedRef = useRef(false)

  const tourRequestRef = useRef(null)
  const notificationRequestRef = useRef(null)

  const lastTourLoadedAtRef = useRef(0)
  const lastNotificationLoadedAtRef = useRef(0)

  const checkNewAssignedTours = useCallback(
    async ({ force = false } = {}) => {
      if (document.visibilityState !== 'visible') {
        return null
      }

      const now = Date.now()

      if (
        !force &&
        now - lastTourLoadedAtRef.current < CACHE_DURATION
      ) {
        return null
      }

      if (tourRequestRef.current) {
        return tourRequestRef.current
      }

      const request = getGuideTours({
        page: 1,
        per_page: 50,
      })
        .then((response) => {
          const items = normalizeTourItems(response)
          const currentIds = new Set(
            items.map(getAssignmentKey).filter(Boolean),
          )

          lastTourLoadedAtRef.current = Date.now()

          if (!initializedRef.current) {
            knownAssignmentIdsRef.current = currentIds
            initializedRef.current = true
            return currentIds
          }

          const newIds = [...currentIds].filter(
            (id) => !knownAssignmentIdsRef.current.has(id),
          )

          if (newIds.length > 0) {
            setNewTourCount((current) => current + newIds.length)

            window.dispatchEvent(
              new CustomEvent(TOUR_EVENT_NAME, {
                detail: {
                  ids: newIds,
                  source: EVENT_SOURCE,
                },
              }),
            )
          }

          knownAssignmentIdsRef.current = currentIds
          return currentIds
        })
        .catch((error) => {
          console.error('Không thể kiểm tra tour mới:', error)
          return null
        })
        .finally(() => {
          tourRequestRef.current = null
        })

      tourRequestRef.current = request
      return request
    },
    [],
  )

  const refreshUnreadNotificationCount = useCallback(
    async ({ force = false } = {}) => {
      if (document.visibilityState !== 'visible') {
        return null
      }

      const now = Date.now()

      if (
        !force &&
        now - lastNotificationLoadedAtRef.current < CACHE_DURATION
      ) {
        return null
      }

      if (notificationRequestRef.current) {
        return notificationRequestRef.current
      }

      const request = getGuideUnreadNotificationCount()
        .then((count) => {
          const nextCount = Number(count || 0)

          setUnreadNotificationCount(
            Number.isFinite(nextCount)
              ? Math.max(0, nextCount)
              : 0,
          )

          lastNotificationLoadedAtRef.current = Date.now()
          return nextCount
        })
        .catch((error) => {
          console.error(
            'Không thể tải số thông báo chưa đọc:',
            error,
          )
          return null
        })
        .finally(() => {
          notificationRequestRef.current = null
        })

      notificationRequestRef.current = request
      return request
    },
    [],
  )

  useEffect(() => {
    void checkNewAssignedTours({ force: true })

    const timer = window.setInterval(() => {
      void checkNewAssignedTours()
    }, TOUR_POLL_INTERVAL)

    function handleClearBadge() {
      setNewTourCount(0)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void checkNewAssignedTours({ force: true })
      }
    }

    function handleFocus() {
      void checkNewAssignedTours()
    }

    window.addEventListener(
      TOUR_CLEAR_EVENT_NAME,
      handleClearBadge,
    )
    window.addEventListener('focus', handleFocus)
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.clearInterval(timer)
      window.removeEventListener(
        TOUR_CLEAR_EVENT_NAME,
        handleClearBadge,
      )
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [checkNewAssignedTours])

  useEffect(() => {
    void refreshUnreadNotificationCount({ force: true })

    const timer = window.setInterval(() => {
      void refreshUnreadNotificationCount()
    }, NOTIFICATION_POLL_INTERVAL)

    function handleNotificationChanged(event) {
      if (event?.detail?.source === EVENT_SOURCE) {
        return
      }

      void refreshUnreadNotificationCount({ force: true })
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void refreshUnreadNotificationCount({ force: true })
      }
    }

    function handleFocus() {
      void refreshUnreadNotificationCount()
    }

    window.addEventListener(
      NOTIFICATION_EVENT_NAME,
      handleNotificationChanged,
    )
    window.addEventListener('focus', handleFocus)
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.clearInterval(timer)
      window.removeEventListener(
        NOTIFICATION_EVENT_NAME,
        handleNotificationChanged,
      )
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [refreshUnreadNotificationCount])

  function handleNavClick(item) {
    if (item.showNewTourBadge) {
      setNewTourCount(0)

      window.dispatchEvent(
        new CustomEvent(TOUR_CLEAR_EVENT_NAME, {
          detail: {
            source: EVENT_SOURCE,
          },
        }),
      )
    }

    if (item.showNotificationBadge) {
      void refreshUnreadNotificationCount({ force: true })
    }
  }

  return (
    <aside
      className={
        collapsed
          ? 'guide-sidebar collapsed'
          : 'guide-sidebar'
      }
    >
      <div className="guide-brand">
        <NavLink
          className="guide-brand-link"
          to="/guide"
        >
          <span
            className="guide-brand-logo-mark"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 48 48"
              role="img"
              aria-hidden="true"
            >
              <text
                x="24"
                y="31"
                fill="#fff"
                fontFamily="Segoe UI Symbol, Noto Sans Symbols 2, Apple Symbols, sans-serif"
                fontSize="34"
                fontWeight="700"
                textAnchor="middle"
                transform="rotate(-18 24 24)"
              >
                ✈
              </text>
            </svg>
          </span>

          {!collapsed && (
            <div className="guide-brand-text-col">
              <span className="guide-brand-name">
                <span className="brand-name-primary">
                  ViVu
                </span>
                <span className="brand-name-accent">
                  Go
                </span>
              </span>

              <span className="guide-brand-subtitle">
                TOURISM GUIDE
              </span>
            </div>
          )}
        </NavLink>
      </div>

      {!collapsed && (
        <div className="guide-menu-header">
          MENU CHÍNH
        </div>
      )}

      <nav
        className="guide-nav"
        aria-label="Điều hướng hướng dẫn viên"
      >
        {guideMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/guide'}
            title={collapsed ? item.label : undefined}
            onClick={() => handleNavClick(item)}
            className={({ isActive }) =>
              isActive
                ? 'guide-nav-link active'
                : 'guide-nav-link'
            }
          >
            <span className="guide-nav-icon-wrap">
              <svg
                className="guide-nav-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {item.icon}
              </svg>

              {item.showNewTourBadge &&
              newTourCount > 0 ? (
                <span className="guide-nav-badge">
                  {newTourCount > 99
                    ? '99+'
                    : newTourCount}
                </span>
              ) : null}

              {collapsed &&
              item.showNotificationBadge &&
              unreadNotificationCount > 0 ? (
                <span className="guide-nav-badge">
                  {unreadNotificationCount > 99
                    ? '99+'
                    : unreadNotificationCount}
                </span>
              ) : null}
            </span>

            {!collapsed && (
              <span className="guide-nav-label">
                {item.label}
              </span>
            )}

            {!collapsed &&
            item.showNotificationBadge &&
            unreadNotificationCount > 0 ? (
              <span className="guide-nav-count">
                {unreadNotificationCount > 99
                  ? '99+'
                  : unreadNotificationCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <button
        className="guide-logout-button"
        type="button"
        onClick={onLogout}
      >
        <svg
          className="guide-logout-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>

        {!collapsed && (
          <span className="guide-logout-label">
            Đăng xuất
          </span>
        )}
      </button>
    </aside>
  )
}

export default GuideSidebar