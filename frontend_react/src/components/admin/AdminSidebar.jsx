import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { tourDepartureApi } from '../../services/tourDepartureApi'
import adminBookingDisruptionApi from '../../services/adminBookingDisruptionApi'
import adminBookingRefundApi from '../../services/adminBookingRefundApi'
import adminGuideLeaveRequestApi from '../../services/adminGuideLeaveRequestApi'
import { getAdminReceivedUnreadCount } from '../../services/supportWorkflowApi'

const ADMIN_RECEIVED_NOTIFICATIONS_PATH =
  '/admin/notifications/received'

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
    children: [
      { label: 'Quản lý điểm đến theo tỉnh', path: '/admin/destination-places' },
      { label: 'Quản lý danh mục tour', path: '/admin/categories' },
      { label: 'Quản lý tour', path: '/admin/tours' },
    ],
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
    children: [
      { label: 'Quản lý lịch khởi hành', path: '/admin/tour-departures' },
      { label: 'Đơn yêu cầu đổi HDV', path: '/admin/tour-departures/guide-replacement-requests' },
    ],
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
    children: [
      { label: 'Danh sách booking', path: '/admin/bookings' },
      { label: 'Yêu cầu hủy booking', path: '/admin/booking-cancellation-requests' },
      { label: 'Hoàn tiền booking', path: '/admin/booking-refunds' },
    ],
    showBookingDisruptionBadge: true,
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
    children: [
      { label: 'Khách hàng', path: '/admin/users/customers' },
      { label: 'Quản trị viên', path: '/admin/users/admins' },
      { label: 'Nhân viên hỗ trợ', path: '/admin/users/support-staff' },
      { label: 'Hướng dẫn viên', path: '/admin/users/tour-guides' },
    ],
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
    children: [
      { label: 'Quản lý ngôn ngữ', path: '/admin/languages' },
      { label: 'Quản lý chứng chỉ', path: '/admin/certificates' },
      { label: 'Đơn xin nghỉ', path: '/admin/guide-leave-requests' },
      { label: 'Quản lý HDV', path: '/admin/guides' },
    ],
    showGuideLeaveBadge: true,
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
  label: 'Quản Lý Đánh Giá',
  path: '/admin/reviews',
  icon: (
    <>
      <path d="m12 3 2.7 5.47 6.04.88-4.37 4.26 1.03 6.02L12 16.8l-5.4 2.83 1.03-6.02-4.37-4.26 6.04-.88L12 3Z" />
      <path d="M8 21h8" />
    </>
  ),
},
  {
    label: 'Thông báo',
    path: ADMIN_RECEIVED_NOTIFICATIONS_PATH,
    children: [
      {
        label: 'Gửi thông báo',
        path: '/admin/notifications',
      },
      {
        label: 'Thông báo đã nhận',
        path: ADMIN_RECEIVED_NOTIFICATIONS_PATH,
        excludeSearch: 'filter',
      },
      {
        label: 'Yêu cầu hỗ trợ NVHT',
        path: `${ADMIN_RECEIVED_NOTIFICATIONS_PATH}?filter=support_admin_request`,
        search: 'filter=support_admin_request',
      },
    ],
    showReceivedNotificationBadge: true,
    icon: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
  const status = String(departure?.status || '').toLowerCase()

  if (status === 'cancelled' || status === 'canceled') return 'cancelled'
  if (status === 'completed') return 'past'

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
  return getDepartureTimeGroup(departure) === 'upcoming' && !hasAssignedGuide(departure)
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
  const location = useLocation()
  const [internalWarningCount, setInternalWarningCount] = useState(0)
  const [guideLeavePendingCount, setGuideLeavePendingCount] = useState(0)
  const [receivedNotificationUnreadCount, setReceivedNotificationUnreadCount] = useState(0)
  const [bookingDisruptionPendingCount, setBookingDisruptionPendingCount] = useState(0)
  const [bookingRefundPendingCount, setBookingRefundPendingCount] = useState(0)
  const isTourSuiteActive =
    location.pathname.startsWith('/admin/tours') ||
    location.pathname.startsWith('/admin/categories') ||
    location.pathname.startsWith('/admin/destination-places')
  const [isTourMenuOpen, setIsTourMenuOpen] = useState(isTourSuiteActive)
  const isUserSuiteActive = location.pathname.startsWith('/admin/users')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(isUserSuiteActive)
  const isDepartureSuiteActive = location.pathname.startsWith('/admin/tour-departures')
  const [isDepartureMenuOpen, setIsDepartureMenuOpen] = useState(isDepartureSuiteActive)
  const isBookingSuiteActive =
    location.pathname.startsWith('/admin/bookings') ||
    location.pathname.startsWith('/admin/booking-cancellation-requests') ||
    location.pathname.startsWith('/admin/booking-refunds')
  const [isBookingMenuOpen, setIsBookingMenuOpen] = useState(isBookingSuiteActive)
  const isGuideSuiteActive =
    location.pathname.startsWith('/admin/guides') ||
    location.pathname.startsWith('/admin/guide-leave-requests') ||
    location.pathname.startsWith('/admin/languages') ||
    location.pathname.startsWith('/admin/certificates')
  const [isGuideMenuOpen, setIsGuideMenuOpen] = useState(isGuideSuiteActive)
  const isNotificationSuiteActive = location.pathname.startsWith('/admin/notifications')
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(isNotificationSuiteActive)

  const visibleMenuItems = useMemo(() => {
    return role === 'admin' ? menuItems : []
  }, [role])

  useEffect(() => {
    setIsTourMenuOpen(isTourSuiteActive)
  }, [isTourSuiteActive])

  useEffect(() => {
    setIsUserMenuOpen(isUserSuiteActive)
  }, [isUserSuiteActive])

  useEffect(() => {
    setIsDepartureMenuOpen(isDepartureSuiteActive)
  }, [isDepartureSuiteActive])

  useEffect(() => {
    setIsBookingMenuOpen(isBookingSuiteActive)
  }, [isBookingSuiteActive])

  useEffect(() => {
    setIsGuideMenuOpen(isGuideSuiteActive)
  }, [isGuideSuiteActive])

  useEffect(() => {
    setIsNotificationMenuOpen(isNotificationSuiteActive)
  }, [isNotificationSuiteActive])

  const loadTourDepartureWarningCount = useCallback(async () => {
    if (role !== 'admin') {
      setInternalWarningCount(0)
      return
    }

    try {
      let departures = []

      const response = await tourDepartureApi.getAllDepartures()
      departures = unwrapList(response)

      const assignmentCount = uniqueDepartures(departures).filter(
        isActionableUnassignedDeparture
      ).length

      setInternalWarningCount(assignmentCount)
    } catch (error) {
      console.error(error)
      setInternalWarningCount(0)
    }
  }, [role])

  const loadGuideLeavePendingCount = useCallback(async () => {
    if (role !== 'admin') {
      setGuideLeavePendingCount(0)
      return
    }

    try {
      const count = await adminGuideLeaveRequestApi.getPendingCount()
      setGuideLeavePendingCount(Number(count || 0))
    } catch (error) {
      console.error(error)
      setGuideLeavePendingCount(0)
    }
  }, [role])

  const loadReceivedNotificationUnreadCount = useCallback(async () => {
    if (role !== 'admin') {
      setReceivedNotificationUnreadCount(0)
      return
    }

    try {
      const count = await getAdminReceivedUnreadCount()
      setReceivedNotificationUnreadCount(Number(count || 0))
    } catch (error) {
      console.error(error)
      setReceivedNotificationUnreadCount(0)
    }
  }, [role])

  const loadBookingDisruptionPendingCount = useCallback(async () => {
    if (role !== 'admin') {
      setBookingDisruptionPendingCount(0)
      return
    }

    try {
      const count = await adminBookingDisruptionApi.getPendingCount()
      setBookingDisruptionPendingCount(Number(count || 0))
    } catch (error) {
      console.error(error)
      setBookingDisruptionPendingCount(0)
    }
  }, [role])

  const loadBookingRefundPendingCount = useCallback(async () => {
    if (role !== 'admin') {
      setBookingRefundPendingCount(0)
      return
    }

    try {
      const count = await adminBookingRefundApi.getPendingCount()
      setBookingRefundPendingCount(Number(count || 0))
    } catch (error) {
      console.error(error)
      setBookingRefundPendingCount(0)
    }
  }, [role])

  useEffect(() => {
    const loadTimeout = window.setTimeout(() => {
      void loadTourDepartureWarningCount()
      void loadGuideLeavePendingCount()
      void loadReceivedNotificationUnreadCount()
      void loadBookingDisruptionPendingCount()
      void loadBookingRefundPendingCount()
    }, 0)

    return () => window.clearTimeout(loadTimeout)
  }, [
    loadTourDepartureWarningCount,
    loadGuideLeavePendingCount,
    loadReceivedNotificationUnreadCount,
    loadBookingDisruptionPendingCount,
    loadBookingRefundPendingCount,
  ])

  useEffect(() => {
    const handleRefresh = () => {
      void loadTourDepartureWarningCount()
      void loadGuideLeavePendingCount()
      void loadReceivedNotificationUnreadCount()
      void loadBookingDisruptionPendingCount()
      void loadBookingRefundPendingCount()
    }

    window.addEventListener('focus', handleRefresh)
    window.addEventListener('tour-departures:changed', handleRefresh)
    window.addEventListener('tour-departure-assignment:changed', handleRefresh)
    window.addEventListener('admin-guide-replacement:changed', handleRefresh)
    window.addEventListener('admin-guide-leave-request:changed', handleRefresh)
    window.addEventListener('admin-notification:changed', handleRefresh)
    window.addEventListener('admin-booking-disruption:changed', handleRefresh)
    window.addEventListener('admin-booking-refund:changed', handleRefresh)

    return () => {
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener('tour-departures:changed', handleRefresh)
      window.removeEventListener('tour-departure-assignment:changed', handleRefresh)
      window.removeEventListener('admin-guide-replacement:changed', handleRefresh)
      window.removeEventListener('admin-guide-leave-request:changed', handleRefresh)
      window.removeEventListener('admin-notification:changed', handleRefresh)
      window.removeEventListener('admin-booking-disruption:changed', handleRefresh)
      window.removeEventListener('admin-booking-refund:changed', handleRefresh)
    }
  }, [
    loadTourDepartureWarningCount,
    loadGuideLeavePendingCount,
    loadReceivedNotificationUnreadCount,
    loadBookingDisruptionPendingCount,
    loadBookingRefundPendingCount,
  ])

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
          const badgeCount = item.path === '/admin/bookings'
            ? bookingDisruptionPendingCount + bookingRefundPendingCount
            : item.showUnassignedDepartureBadge
            ? assignmentWarningCount
            : item.showGuideLeaveBadge
              ? guideLeavePendingCount
            : item.showReceivedNotificationBadge
              ? receivedNotificationUnreadCount
              : item.showBookingDisruptionBadge
                ? bookingDisruptionPendingCount
              : 0

          if (item.children) {
            const isDepartureGroup = item.path === '/admin/tour-departures'
            const isBookingGroup = item.path === '/admin/bookings'
            const isUserGroup = item.path === '/admin/users'
            const isGuideGroup = item.path === '/admin/guides'
            const isNotificationGroup = item.path === ADMIN_RECEIVED_NOTIFICATIONS_PATH
            const isGroupActive = isDepartureGroup
              ? isDepartureSuiteActive
              : isBookingGroup
                ? isBookingSuiteActive
                : isUserGroup
                  ? isUserSuiteActive
                : isGuideGroup
                  ? isGuideSuiteActive
                  : isNotificationGroup
                    ? isNotificationSuiteActive
                  : isTourSuiteActive
            const isGroupOpen = isDepartureGroup
              ? isDepartureMenuOpen
              : isBookingGroup
                ? isBookingMenuOpen
                : isUserGroup
                  ? isUserMenuOpen
                : isGuideGroup
                  ? isGuideMenuOpen
                  : isNotificationGroup
                    ? isNotificationMenuOpen
                  : isTourMenuOpen
            const setGroupOpen = isDepartureGroup
              ? setIsDepartureMenuOpen
              : isBookingGroup
                ? setIsBookingMenuOpen
                : isUserGroup
                  ? setIsUserMenuOpen
                : isGuideGroup
                  ? setIsGuideMenuOpen
                  : isNotificationGroup
                    ? setIsNotificationMenuOpen
                  : setIsTourMenuOpen
            const submenuId = isDepartureGroup
              ? 'admin-departure-submenu'
              : isBookingGroup
                ? 'admin-booking-submenu'
                : isUserGroup
                  ? 'admin-user-submenu'
                : isGuideGroup
                  ? 'admin-guide-submenu'
                  : isNotificationGroup
                    ? 'admin-notification-submenu'
                  : 'admin-tour-submenu'

            return (
              <div className="admin-nav-group" key={item.path}>
                <button
                  type="button"
                  className={`admin-nav-link admin-nav-parent${isGroupActive ? ' active' : ''}`}
                  aria-expanded={isGroupOpen}
                  aria-controls={submenuId}
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    if (collapsed) onToggle()
                    setGroupOpen((open) => !open)
                  }}
                >
                  <svg className="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                    {item.icon}
                  </svg>
                  <span className="admin-nav-label">{item.label}</span>
                  {badgeCount > 0 ? (
                    <span className="admin-nav-badge" aria-label={`${badgeCount} việc cần xử lý`}>
                      {formatBadgeValue(badgeCount)}
                    </span>
                  ) : null}
                  <svg className={`admin-nav-chevron${isGroupOpen ? ' open' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>

                {isGroupOpen && !collapsed ? (
                  <div className="admin-nav-submenu" id={submenuId}>
                    {item.children.map((child) => {
                      const childBadgeCount =
                        child.path === '/admin/booking-cancellation-requests'
                          ? bookingDisruptionPendingCount
                          : child.path === '/admin/booking-refunds'
                            ? bookingRefundPendingCount
                          : child.path === '/admin/guide-leave-requests'
                            ? guideLeavePendingCount
                            : child.path === `${ADMIN_RECEIVED_NOTIFICATIONS_PATH}?filter=support_admin_request`
                              ? receivedNotificationUnreadCount
                              : 0

                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end={child.path === '/admin/tours' || child.path === '/admin/tour-departures' || child.path === '/admin/bookings' || child.path === '/admin/notifications'}
                          className={({ isActive }) => {
                            const searchParams = new URLSearchParams(location.search)
                            const matchesSearch = child.search
                              ? location.search.includes(child.search)
                              : child.excludeSearch
                                ? !searchParams.has(child.excludeSearch)
                                : true

                            return isActive && matchesSearch
                              ? 'admin-nav-sublink active'
                              : 'admin-nav-sublink'
                          }}
                        >
                          <span>{child.label}</span>
                          {childBadgeCount > 0 ? (
                            <span
                              className="admin-nav-sublink-badge"
                              aria-label={`${childBadgeCount} việc cần xử lý`}
                              title={`${childBadgeCount} việc cần xử lý`}
                            >
                              {formatBadgeValue(childBadgeCount)}
                            </span>
                          ) : null}
                        </NavLink>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          }

          return (
            <NavLink
              className={({ isActive }) =>
                isActive ? 'admin-nav-link active' : 'admin-nav-link'
              }
              end={item.path === '/admin' || item.path === '/admin/notifications'}
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
                  aria-label={`${badgeCount} việc cần xử lý`}
                  title={`${badgeCount} việc cần xử lý`}
                  style={{
                    position: 'absolute',
                    right: collapsed ? 6 : 24,
                    top: collapsed ? 6 : '50%',
                    transform: collapsed ? 'none' : 'translateY(-50%)',
                    display: 'inline-flex',
                    minWidth: collapsed ? 16 : 18,
                    height: collapsed ? 16 : 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: collapsed ? 10 : 11,
                    fontWeight: 800,
                    lineHeight: 1,
                    padding: collapsed ? '0 4px' : '0 5px',
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
