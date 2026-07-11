import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { tourDepartureApi } from '../../services/tourDepartureApi'

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
    label: 'Tour',
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
    label: 'Lịch Khởi Hành',
    path: '/admin/tour-departures',
    showUnassignedDepartureBadge: true,
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4" />
        <path d="M8 3v4" />
        <path d="M3 11h18" />
        <path d="M8 15h2" />
        <path d="M12 15h2" />
        <path d="M16 15h2" />
      </>
    ),
  },
  {
    label: 'Booking',
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
    label: 'Người Dùng',
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
    label: 'Thông Báo',
    path: '/admin/notifications',
    icon: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
  },
  {
    label: 'Cài Đặt Hệ Thống',
    path: '/admin/settings',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.08A1.8 1.8 0 0 0 8.6 19a1.8 1.8 0 0 0-1.98.36l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.08A1.8 1.8 0 0 0 5 8.6a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.08A1.8 1.8 0 0 0 15.4 5a1.8 1.8 0 0 0 1.98-.36l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.8 1.8 0 0 0 19.4 9c.22.38.58.64 1 .72.18.04.36.06.54.06H21a2 2 0 1 1 0 4h-.08A1.8 1.8 0 0 0 19.4 15Z" />
      </>
    ),
  },
]

function unwrapList(response) {
  const payload = response?.data

  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload)) return payload

  return []
}

function getDateKey(value) {
  if (!value) return ''

  const matchedDate = String(value).match(/^\d{4}-\d{2}-\d{2}/)

  return matchedDate ? matchedDate[0] : ''
}

function getTodayKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDepartureTimeGroup(departure) {
  const departureDate = getDateKey(departure?.departure_date)
  const returnDate = getDateKey(departure?.return_date) || departureDate

  if (departureDate) {
    const today = getTodayKey()

    if (today < departureDate) return 'upcoming'
    if (today >= departureDate && today <= returnDate) return 'ongoing'

    return 'past'
  }

  const scheduleGroup = departure?.schedule_group

  if (['upcoming', 'ongoing', 'past'].includes(scheduleGroup)) {
    return scheduleGroup
  }

  return 'upcoming'
}

function getAssignments(departure) {
  if (Array.isArray(departure?.assigned_guides)) return departure.assigned_guides
  if (Array.isArray(departure?.guide_assignments)) return departure.guide_assignments
  if (Array.isArray(departure?.guideAssignments)) return departure.guideAssignments

  return []
}

function hasAssignedGuide(departure) {
  if (departure?.assignment_state === 'assigned') return true
  if (departure?.has_assigned_guide === true) return true

  return getAssignments(departure).some(
    (assignment) => !assignment.status || assignment.status === 'assigned'
  )
}

function isActionableUnassignedDeparture(departure) {
  const group = getDepartureTimeGroup(departure)

  return ['upcoming', 'ongoing'].includes(group) && !hasAssignedGuide(departure)
}

function getTourIdFromDeparture(departure) {
  return departure?.tour_id || departure?.tour?.id || departure?.tourId || null
}

function uniqueDepartures(items = []) {
  const map = new Map()

  items.forEach((item) => {
    if (!item?.id) return

    map.set(String(item.id), item)
  })

  return Array.from(map.values())
}

function formatBadgeValue(value) {
  const count = Number(value || 0)

  if (count > 99) return '99+'

  return String(count)
}

function AdminSidebar({
  collapsed,
  onToggle,
  role = 'admin',
  tourDepartureWarningCount,
}) {
  const [internalWarningCount, setInternalWarningCount] = useState(0)

  const visibleMenuItems = useMemo(() => {
    return role === 'admin' ? menuItems : []
  }, [role])

  const loadTourDepartureWarningCount = useCallback(async () => {
    if (role !== 'admin') {
      setInternalWarningCount(0)
      return
    }

    try {
      let departures = []

      if (typeof tourDepartureApi.getAllDepartures === 'function') {
        const response = await tourDepartureApi.getAllDepartures()
        departures = unwrapList(response)
      } else {
        const toursResponse = await tourDepartureApi.getTours()
        const tours = unwrapList(toursResponse)

        const responses = await Promise.all(
          tours.map(async (tour) => {
            const response = await tourDepartureApi.getByTour(tour.id)

            return unwrapList(response).map((departure) => ({
              ...departure,
              tour_id: getTourIdFromDeparture(departure) || tour.id,
              tour: departure.tour || tour,
            }))
          })
        )

        departures = responses.flat()
      }

      const count = uniqueDepartures(departures).filter(
        isActionableUnassignedDeparture
      ).length

      setInternalWarningCount(count)
    } catch (error) {
      console.error(error)
      setInternalWarningCount(0)
    }
  }, [role])

  useEffect(() => {
    void loadTourDepartureWarningCount()
  }, [loadTourDepartureWarningCount])

  useEffect(() => {
    const handleRefresh = () => {
      void loadTourDepartureWarningCount()
    }

    window.addEventListener('focus', handleRefresh)
    window.addEventListener('tour-departures:changed', handleRefresh)
    window.addEventListener('tour-departure-assignment:changed', handleRefresh)

    return () => {
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener('tour-departures:changed', handleRefresh)
      window.removeEventListener('tour-departure-assignment:changed', handleRefresh)
    }
  }, [loadTourDepartureWarningCount])

  const assignmentWarningCount = Number(
    tourDepartureWarningCount ?? internalWarningCount ?? 0
  )

  return (
    <aside className={collapsed ? 'admin-sidebar collapsed' : 'admin-sidebar'}>
      <div className="admin-brand">
        <NavLink className="admin-brand-link" to="/admin">
          <span className="admin-brand-logo-mark" aria-hidden="true">
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

          <div className="admin-brand-text-col">
            <span className="admin-brand-name">
              <span className="brand-name-primary">ViVu</span>
              <span className="brand-name-accent">Go</span>
            </span>

            <span className="admin-brand-subtitle">ADMIN PANEL</span>
          </div>
        </NavLink>
      </div>

      <nav className="admin-nav" aria-label="Điều hướng quản trị">
        {visibleMenuItems.map((item) => {
          const badgeCount = item.showUnassignedDepartureBadge
            ? assignmentWarningCount
            : 0

          return (
            <NavLink
              className={({ isActive }) =>
                isActive ? 'admin-nav-link active' : 'admin-nav-link'
              }
              end={item.path === '/admin'}
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              style={{ position: 'relative' }}
            >
              <svg className="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                {item.icon}
              </svg>

              <span className="admin-nav-label">{item.label}</span>

              {badgeCount > 0 ? (
                <span
                  aria-label={`${badgeCount} lịch khởi hành chưa phân công`}
                  title={`${badgeCount} lịch sắp tới/đang diễn ra chưa phân công HDV`}
                  style={{
                    position: 'absolute',
                    right: collapsed ? 8 : 12,
                    top: collapsed ? 6 : 8,
                    display: 'inline-flex',
                    minWidth: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    lineHeight: 1,
                    padding: '0 5px',
                    boxShadow: '0 0 0 2px #fff',
                  }}
                >
                  {formatBadgeValue(badgeCount)}
                </span>
              ) : null}
            </NavLink>
          )
        })}
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