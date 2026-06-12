import { useState } from 'react'
import AdminSidebar from '../components/admin/AdminSidebar'
import '../styles/admin.css'

function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={collapsed ? 'admin-shell sidebar-collapsed' : 'admin-shell'}>
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />
      <main className="admin-main">{children}</main>
    </div>
  )
}

export default AdminLayout
