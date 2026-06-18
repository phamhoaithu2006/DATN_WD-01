import { Route, Routes } from 'react-router-dom'
// danh muc Tour(loại tour)
import AdminLayout from '../../layouts/AdminLayout'
import TourTypeCreatePage from './categories/TourTypeCreatePage'
import TourTypeEditPage from './categories/TourTypeEditPage'
import TourTypeListPage from './categories/TourTypeListPage'
import TourTypeTrashPage from './categories/TourTypeTrashPage'
// quản lý Tour
import TourListPage from './tours/TourListPage'
import TourCreatePage from './tours/TourCreatePage'
import TourEditPage from './tours/TourEditPage'
import TourHiddenPage from './tours/TourHiddenPage'
function DashboardHome() {
  return (
    <section className="admin-page-header">
      <p>Tổng quan vận hành</p>
      <h1>Admin Dashboard</h1>
    </section>
  )
}
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import GuideManagementPage from './GuideManagementPage'

function AdminDashboardPage() {
  return (
    <AdminLayout>
      <Routes>
        {/* router danh mục tour */}
       <Route index element={<DashboardHome />} />
        <Route path="categories" element={<TourTypeListPage />} />
        <Route path="categories/create" element={<TourTypeCreatePage />} />
        <Route path="categories/:id/edit" element={<TourTypeEditPage />} />
        <Route path="categories/trash" element={<TourTypeTrashPage />} />
        {/*  router quản lý Tour */}
        <Route path="tours" element={<TourListPage />} />
        <Route path="tours/create" element={<TourCreatePage />} />
        <Route path="tours/:id/edit" element={<TourEditPage />} />
        <Route path="tours/hidden" element={<TourHiddenPage />} />
      </Routes>
    </AdminLayout>
  )
}

export default AdminDashboardPage