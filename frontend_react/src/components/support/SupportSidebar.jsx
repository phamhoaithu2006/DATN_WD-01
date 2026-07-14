import { NavLink } from 'react-router-dom'

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
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
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

function SupportSidebar({ collapsed, onLogout }) {
  return (
    <aside className={collapsed ? 'guide-sidebar collapsed' : 'guide-sidebar'}>
      <div className="guide-brand">
        <NavLink className="guide-brand-link" to="/support">
          <span className="guide-brand-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
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
                <span className="brand-name-primary">ViVu</span>
                <span className="brand-name-accent">Go</span>
              </span>
              <span className="guide-brand-subtitle">TOURISM SUPPORT</span>
            </div>
          )}
        </NavLink>
      </div>

      {!collapsed && <div className="guide-menu-header">MENU CHÍNH</div>}

      <nav className="guide-nav" aria-label="Điều hướng nhân viên hỗ trợ">
        {supportMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/support'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              isActive ? 'guide-nav-link active' : 'guide-nav-link'
            }
          >
            <span className="guide-nav-icon-wrap">
              <svg className="guide-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                {item.icon}
              </svg>
            </span>

            {!collapsed && <span className="guide-nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button className="guide-logout-button" type="button" onClick={onLogout}>
        <svg className="guide-logout-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {!collapsed && <span className="guide-logout-label">Đăng xuất</span>}
      </button>
    </aside>
  )
}

export default SupportSidebar
