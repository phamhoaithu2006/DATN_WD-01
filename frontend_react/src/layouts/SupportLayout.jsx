import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SupportNotificationBell from '../components/support/SupportNotificationBell'
import SupportSidebar from '../components/support/SupportSidebar'
import apiClient from '../services/apiClient'
import { logout as logoutApi } from '../services/authApi'
import { clearSession } from '../services/authStorage'
import '../styles/guide.css'

function getInitials(name) {
  return String(name || 'NV')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function SupportLayout({ children }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const accountMenuRef = useRef(null)

  const supportProfile = currentUser?.support_staff || null
  const displayName =
    currentUser?.full_name ||
    supportProfile?.name ||
    supportProfile?.user?.full_name ||
    'Nhân viên hỗ trợ'
  const displayAvatar = currentUser?.avatar_url || supportProfile?.user?.avatar_url || ''

  async function handleLogout() {
    try {
      await logoutApi()
    } catch {
      // Token có thể đã hết hạn; vẫn cần xóa phiên local.
    }

    clearSession()
    navigate('/auth/login', { replace: true })
  }

  function goToProfile() {
    setAccountMenuOpen(false)
    navigate('/support/profile')
  }

  useEffect(() => {
    let active = true

    async function loadCurrentUser() {
      try {
        const response = await apiClient.get('/auth/me')
        const meUser = response?.data?.user || response?.data?.data || response?.data || null

        if (!active) return
        setCurrentUser(meUser)
      } catch {
        if (active) setCurrentUser(null)
      }
    }

    void loadCurrentUser()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function closeAccountMenu(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeAccountMenu)
    return () => document.removeEventListener('mousedown', closeAccountMenu)
  }, [])

  return (
    <div className={collapsed ? 'guide-shell sidebar-collapsed' : 'guide-shell'}>
      <SupportSidebar collapsed={collapsed} onLogout={handleLogout} />

      <main className="guide-main">
        <div className="guide-topbar">
          <div className="guide-topbar-left-section">
            <button
              type="button"
              className="guide-sidebar-toggle-btn"
              onClick={() => setCollapsed((current) => !current)}
              title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="guide-topbar-title">
              <span>Trang chủ</span>
              <strong>Xin chào, {displayName}</strong>
            </div>
          </div>

          <div className="guide-topbar-right-section">
            <SupportNotificationBell />
            <div className="guide-account-menu" ref={accountMenuRef}>
              <button
                type="button"
                className="guide-topbar-user"
                title="Tài khoản"
                aria-label="Mở menu tài khoản nhân viên hỗ trợ"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((current) => !current)}
              >
                <span className="guide-topbar-avatar">
                  {displayAvatar ? <img src={displayAvatar} alt={displayName} /> : getInitials(displayName)}
                </span>
                <div className="guide-topbar-meta">
                  <strong>{displayName}</strong>
                  <span>Nhân viên hỗ trợ</span>
                </div>
                <svg className="guide-account-caret" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {accountMenuOpen && (
                <div className="guide-account-dropdown" role="menu">
                  <button type="button" role="menuitem" onClick={goToProfile}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20 21a8 8 0 0 0-16 0" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Hồ sơ cá nhân
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}

export default SupportLayout
