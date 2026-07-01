import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GuideSidebar from '../components/guide/GuideSidebar'
import { logout as logoutApi } from '../services/authApi'
import { clearSession, readSession } from '../services/authStorage'
import '../styles/guide.css'

function getInitials(name) {
  return String(name || 'HDV')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function GuideLayout({ children }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const guide = readSession()

  async function handleLogout() {
    try {
      await logoutApi()
    } catch {
      // Token có thể đã hết hạn, vẫn cần xóa phiên local.
    }

    clearSession()
    navigate('/auth/login', { replace: true })
  }

  return (
    <div className={collapsed ? 'guide-shell sidebar-collapsed' : 'guide-shell'}>
      <GuideSidebar
        collapsed={collapsed}
        guide={guide}
        onLogout={handleLogout}
        onToggle={() => setCollapsed((current) => !current)}
      />
      <main className="guide-main">
        <div className="guide-topbar">
          <div className="guide-topbar-left-section">
            <button
              type="button"
              className="guide-sidebar-toggle-btn"
              onClick={() => setCollapsed((current) => !current)}
              title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="guide-topbar-title">
              <span>Bảng điều khiển HDV</span>
              <strong>Chào mừng trở lại, {guide?.full_name || guide?.name || 'Hướng dẫn viên'}</strong>
            </div>
          </div>
          
          <div className="guide-topbar-right-section">
            <div className="guide-topbar-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Tìm kiếm nhanh tour, lịch trình..." />
            </div>

            <div className="guide-topbar-notif">
              <button type="button" className="notif-btn" title="Thông báo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="notif-badge">3</span>
              </button>
            </div>

            <div className="guide-topbar-user">
              <span className="guide-topbar-avatar">
                {getInitials(guide?.full_name || guide?.name || 'Hướng dẫn viên')}
              </span>
              <div className="guide-topbar-meta">
                <strong>{guide?.full_name || guide?.name || 'Hướng dẫn viên'}</strong>
                <span>Hướng dẫn viên</span>
              </div>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}

export default GuideLayout
