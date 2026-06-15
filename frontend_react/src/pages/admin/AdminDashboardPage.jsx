import { Route, Routes } from 'react-router-dom'

import AdminLayout from '../../layouts/AdminLayout'
import TourTypeCreatePage from './categories/TourTypeCreatePage'
import TourTypeEditPage from './categories/TourTypeEditPage'
import TourTypeListPage from './categories/TourTypeListPage'
import TourTypeTrashPage from './categories/TourTypeTrashPage'

function DashboardHome() {
  return (
    <section className="admin-page-header">
      <p>Tổng quan vận hành</p>
      <h1>Admin Dashboard</h1>
    </section>
  )
}

function AdminDashboardPage() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="tours" element={<TourTypeListPage />} />
        <Route path="tours/create" element={<TourTypeCreatePage />} />
        <Route path="tours/:id/edit" element={<TourTypeEditPage />} />
        <Route path="tours/trash" element={<TourTypeTrashPage />} />
      </Routes>
    </AdminLayout>
  )
}

export default AdminDashboardPage