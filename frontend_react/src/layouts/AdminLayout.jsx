import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AdminSidebar from '../components/admin/AdminSidebar'
import { logout as logoutApi } from '../services/authApi'
import { clearSession, readSession } from '../services/authStorage'
import '../styles/admin.css'

function AdminLayout({ children }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const admin = readSession()

  async function handleLogout() {
    try {
      await logoutApi()
    } catch {
      // Token có thể đã hết hạn; vẫn cần xóa phiên đăng nhập ở trình duyệt.
    }

    clearSession()
    navigate('/auth', { replace: true })
  }

  return (
    <div className={collapsed ? 'admin-shell sidebar-collapsed' : 'admin-shell'}>
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />
      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <span>{t('admin.admin')}</span>
            <strong>{admin?.name || 'ViVuGo Admin'}</strong>
          </div>
          <button type="button" onClick={handleLogout}>
            {t('admin.logout')}
          </button>
        </div>
        {children}
      </main>
    </div>
  )
}

export default AdminLayout

