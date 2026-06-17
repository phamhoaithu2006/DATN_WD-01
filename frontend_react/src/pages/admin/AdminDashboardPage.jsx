import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import GuideManagementPage from './GuideManagementPage'

function AdminDashboardPage() {
  return (
    <AdminLayout>
      <Routes>
        <Route
          index
          element={
            <section className="admin-page-header">
              <p>Tổng quan vận hành</p>
              <h1>Admin Dashboard</h1>
            </section>
          }
        />
        <Route path="guides" element={<GuideManagementPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  )
}

export default AdminDashboardPage
