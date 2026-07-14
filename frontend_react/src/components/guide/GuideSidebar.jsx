import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getGuideTours } from '../../services/guideTourApi'

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
    label: 'Lịch làm việc',
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
    label: 'Tour của tôi',
    path: '/guide/schedule',
    icon: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
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
  const knownAssignmentIdsRef = useRef(new Set())
  const initializedRef = useRef(false)

  useEffect(() => {
    let active = true

    async function checkNewAssignedTours() {
      try {
        const response = await getGuideTours({
          page: 1,
          per_page: 50,
        })

        if (!active) return

        const items = normalizeTourItems(response)
        const currentIds = new Set(items.map(getAssignmentKey).filter(Boolean))

        if (!initializedRef.current) {
          knownAssignmentIdsRef.current = currentIds
          initializedRef.current = true
          return
        }

        const newIds = [...currentIds].filter(
          (id) => !knownAssignmentIdsRef.current.has(id),
        )

        if (newIds.length > 0) {
          setNewTourCount((current) => current + newIds.length)

          window.dispatchEvent(
            new CustomEvent('guide-tour:new-assignment-detected', {
              detail: {
                ids: newIds,
              },
            }),
          )
        }

        knownAssignmentIdsRef.current = currentIds
      } catch (error) {
        console.error(error)
      }
    }

    void checkNewAssignedTours()

    const timer = window.setInterval(checkNewAssignedTours, 30000)

    const clearBadge = () => setNewTourCount(0)
    window.addEventListener('guide-tour:new-assignment-cleared', clearBadge)

    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('guide-tour:new-assignment-cleared', clearBadge)
    }
  }, [])

  function handleNavClick(item) {
    if (item.showNewTourBadge) {
      setNewTourCount(0)
      window.dispatchEvent(new Event('guide-tour:new-assignment-cleared'))
    }
  }

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
            onClick={() => handleNavClick(item)}
            className={({ isActive }) =>
              isActive ? 'guide-nav-link active' : 'guide-nav-link'
            }
          >
            <span className="guide-nav-icon-wrap">
              <svg className="guide-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                {item.icon}
              </svg>

              {item.showNewTourBadge && newTourCount > 0 ? (
                <span className="guide-nav-badge">
                  {newTourCount > 99 ? '99+' : newTourCount}
                </span>
              ) : null}
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

export default GuideSidebar
