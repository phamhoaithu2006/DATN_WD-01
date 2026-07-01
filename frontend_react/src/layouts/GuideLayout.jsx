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
          <div className="guide-topbar-title">
            <span>Bảng điều khiển HDV</span>
            <strong>Chào mừng trở lại, {guide?.full_name || guide?.name || 'Hướng dẫn viên'}</strong>
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
        {children}
      </main>
    </div>
  )
}

export default GuideLayout
