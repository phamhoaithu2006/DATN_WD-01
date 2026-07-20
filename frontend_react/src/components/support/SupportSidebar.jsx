import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getSupportRequestBadgeCount } from '../../services/supportRequestApi'

const supportMenuItems = [
  {
    label: 'Trang chủ',
    path: '/support',
    icon: (
      <>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  {
    label: 'Lịch làm việc',
    path: '/support/work-schedule',
    icon: (
      <>
        <rect
          x="3"
          y="4"
          width="18"
          height="18"
          rx="2"
          ry="2"
        />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
  },
  {
    label: 'Yêu cầu hỗ trợ',
    path: '/support/requests',
    icon: (
      <>
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 8v4" />
        <circle cx="12" cy="16" r="1" />
      </>
    ),
  },
  {
    label: 'Thông báo',
    path: '/support/notifications',
    icon: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
  },
]

function SupportSidebar({
  collapsed = false,
  onLogout,
}) {
  const [requestBadge, setRequestBadge] =
    useState(0)

  /*
  |--------------------------------------------------------------------------
  | Load số lượng yêu cầu cần xử lý
  |--------------------------------------------------------------------------
  |
  | Badge = Chưa hỗ trợ + Đang hỗ trợ
  |
  */
  const loadRequestBadge =
    useCallback(async () => {
      try {
        const count =
          await getSupportRequestBadgeCount()

        setRequestBadge(
          Number(count || 0),
        )
      } catch (error) {
        console.error(
          'Không thể tải số lượng yêu cầu hỗ trợ:',
          error,
        )
      }
    }, [])

  /*
  |--------------------------------------------------------------------------
  | Tự động cập nhật badge
  |--------------------------------------------------------------------------
  |
  | - Load ngay khi sidebar xuất hiện
  | - Polling 30 giây/lần
  | - Cho phép trang SupportRequestsPage gọi event để refresh ngay
  |
  */
  useEffect(() => {
    void loadRequestBadge()

    const intervalId =
      window.setInterval(() => {
        void loadRequestBadge()
      }, 30000)

    function handleRequestCountChanged() {
      void loadRequestBadge()
    }

    window.addEventListener(
      'support-request-count-changed',
      handleRequestCountChanged,
    )

    return () => {
      window.clearInterval(intervalId)

      window.removeEventListener(
        'support-request-count-changed',
        handleRequestCountChanged,
      )
    }
  }, [loadRequestBadge])

  return (
    <aside
      className={
        collapsed
          ? 'guide-sidebar collapsed'
          : 'guide-sidebar'
      }
    >
      {/* ================= LOGO ================= */}
      <div className="guide-brand">
        <NavLink
          className="guide-brand-link"
          to="/support"
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
                TOURISM SUPPORT
              </span>
            </div>
          )}
        </NavLink>
      </div>

      {/* ================= MENU TITLE ================= */}
      {!collapsed && (
        <div className="guide-menu-header">
          MENU CHÍNH
        </div>
      )}

      {/* ================= NAVIGATION ================= */}
      <nav
        className="guide-nav"
        aria-label="Điều hướng nhân viên hỗ trợ"
      >
        {supportMenuItems.map((item) => {
          const isRequestMenu =
            item.path ===
            '/support/requests'

          const showBadge =
            isRequestMenu &&
            requestBadge > 0

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={
                item.path === '/support'
              }
              title={
                collapsed
                  ? showBadge
                    ? `${item.label} (${requestBadge})`
                    : item.label
                  : undefined
              }
              className={({
                isActive,
              }) =>
                isActive
                  ? 'guide-nav-link active'
                  : 'guide-nav-link'
              }
            >
              {/* Icon + tên menu */}
              <span className="guide-nav-main">
                <span className="guide-nav-icon-wrap">
                  <svg
                    className="guide-nav-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </svg>
                </span>

                {!collapsed && (
                  <span className="guide-nav-label">
                    {item.label}
                  </span>
                )}
              </span>

              {/* Badge yêu cầu cần xử lý */}
              {showBadge && (
                <span
                  className="guide-nav-badge"
                  aria-label={`${requestBadge} yêu cầu cần xử lý`}
                >
                  {requestBadge > 99
                    ? '99+'
                    : requestBadge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* ================= LOGOUT ================= */}
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

          <line
            x1="21"
            y1="12"
            x2="9"
            y2="12"
          />
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

export default SupportSidebar