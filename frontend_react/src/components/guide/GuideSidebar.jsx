import { NavLink } from 'react-router-dom'

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
    icon: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </>
    ),
  },
  {
    label: 'Lịch làm việc',
    path: '/guide/schedule',
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
    label: 'Lịch sử Tour',
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
    icon: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
  },
  {
    label: 'Cài đặt chung',
    path: '/guide/settings',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  },
]

function GuideSidebar({ collapsed, onLogout }) {
  return (
    <aside className={collapsed ? 'guide-sidebar collapsed' : 'guide-sidebar'}>
      <div className="guide-brand">
        <NavLink className="guide-brand-link" to="/guide">
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
              <span className="guide-brand-subtitle">TOURISM GUIDE</span>
            </div>
          )}
        </NavLink>
      </div>

      {!collapsed && <div className="guide-menu-header">MENU CHÍNH</div>}

      <nav className="guide-nav" aria-label="Điều hướng hướng dẫn viên">
        {guideMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/guide'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              isActive ? 'guide-nav-link active' : 'guide-nav-link'
            }
          >
            <svg className="guide-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              {item.icon}
            </svg>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button className="guide-logout-button" type="button" onClick={onLogout}>
        <svg className="guide-logout-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {!collapsed && <span>Đăng xuất</span>}
      </button>
    </aside>
  )
}

export default GuideSidebar
