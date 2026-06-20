import { NavLink } from 'react-router-dom'

const menuItems = [
  {
    label: 'Tổng Quan',
    path: '/admin',
    icon: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1.2" />
        <rect x="14" y="4" width="6" height="6" rx="1.2" />
        <rect x="4" y="14" width="6" height="6" rx="1.2" />
        <rect x="14" y="14" width="6" height="6" rx="1.2" />
      </>
    ),
  },
  {
    label: 'Quản Lý Tour',
    path: '/admin/tours',
    icon: (
      <>
        <path d="M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2-6-2Z" />
        <path d="M9 4v14" />
        <path d="M15 6v14" />
      </>
    ),
  },
  {
    label: 'Quản Lý Booking',
    path: '/admin/bookings',
    icon: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 1 4 16.5v-11Z" />
        <path d="M8 7h8" />
        <path d="M8 11h7" />
      </>
    ),
  },
  {
    label: 'Quản Lý Người Dùng',
    path: '/admin/users',
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    label: 'Nhân Viên Hỗ Trợ',
    path: '/admin/support',
    icon: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0" />
        <path d="M4 13v4a2 2 0 0 0 2 2h1v-8H6a2 2 0 0 0-2 2Z" />
        <path d="M20 13v4a2 2 0 0 1-2 2h-1v-8h1a2 2 0 0 1 2 2Z" />
      </>
    ),
  },
  {
    label: 'Hướng Dẫn Viên',
    path: '/admin/guides',
    icon: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4" />
        <path d="M16 11l2 2 4-4" />
        <path d="M18 13v8" />
      </>
    ),
  },
  {
    label: 'Dịch Vụ Đối Tác',
    path: '/admin/partners',
    icon: (
      <>
        <path d="M4 21V7a2 2 0 0 1 2-2h5v16" />
        <path d="M13 21V3h5a2 2 0 0 1 2 2v16" />
        <path d="M8 9h1" />
        <path d="M8 13h1" />
        <path d="M16 7h1" />
        <path d="M16 11h1" />
        <path d="M2 21h20" />
      </>
    ),
  },
  {
    label: 'Báo Cáo & Thống Kê',
    path: '/admin/reports',
    icon: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V8" />
        <path d="M16 16v-3" />
      </>
    ),
  },
  {
    label: 'Cài Đặt',
    path: '/admin/settings',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.08A1.8 1.8 0 0 0 8.6 19a1.8 1.8 0 0 0-1.98.36l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.08A1.8 1.8 0 0 0 5 8.6a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.08A1.8 1.8 0 0 0 15.4 5a1.8 1.8 0 0 0 1.98-.36l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.8 1.8 0 0 0 19.4 9c.22.38.58.64 1 .72.18.04.36.06.54.06H21a2 2 0 1 1 0 4h-.08A1.8 1.8 0 0 0 19.4 15Z" />
      </>
    ),
  },
]

function AdminSidebar({ collapsed, onToggle }) {
  return (
    <aside className={collapsed ? 'admin-sidebar collapsed' : 'admin-sidebar'}>
      <div className="admin-brand">
        <span className="admin-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3a14 14 0 0 1 0 18" />
            <path d="M12 3a14 14 0 0 0 0 18" />
          </svg>
        </span>
        <span className="admin-brand-copy">
          <strong>
            ViVu<span>Go</span>
          </strong>
          <small>Admin Dashboard</small>
        </span>
      </div>

      <nav className="admin-nav" aria-label="Điều hướng quản trị">
        {menuItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              isActive ? 'admin-nav-link active' : 'admin-nav-link'
            }
            end={item.path === '/admin'}
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              {item.icon}
            </svg>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button className="collapse-button" type="button" onClick={onToggle}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span>{collapsed ? 'Mở rộng' : 'Thu gọn'}</span>
      </button>
    </aside>
  )
}

export default AdminSidebar
