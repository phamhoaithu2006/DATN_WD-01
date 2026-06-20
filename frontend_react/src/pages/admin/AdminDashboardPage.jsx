import { Navigate, Route, Routes } from 'react-router-dom'

import AdminLayout from '../../layouts/AdminLayout'
import GuideManagementPage from './GuideManagementPage'

// Danh mục tour / loại tour
import TourTypeCreatePage from './categories/TourTypeCreatePage'
import TourTypeEditPage from './categories/TourTypeEditPage'
import TourTypeListPage from './categories/TourTypeListPage'
import TourTypeTrashPage from './categories/TourTypeTrashPage'

// Quản lý tour
import TourCreatePage from './tours/TourCreatePage'
import TourEditPage from './tours/TourEditPage'
import TourHiddenPage from './tours/TourHiddenPage'
import TourListPage from './tours/TourListPage'
// quản lý địa chỉ tour
import DestinationCreatePage from './destinations/DestinationCreatePage'
import DestinationEditPage from './destinations/DestinationEditPage'
import DestinationListPage from './destinations/DestinationListPage'
import DestinationTrashPage from './destinations/DestinationTrashPage'
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
        {/* Router danh mục tour */}
        <Route path="categories" element={<TourTypeListPage />} />
        <Route path="categories/create" element={<TourTypeCreatePage />} />
        <Route path="categories/:id/edit" element={<TourTypeEditPage />} />
        <Route path="categories/trash" element={<TourTypeTrashPage />} />
        {/* Router quản lý tour */}
        <Route path="tours" element={<TourListPage />} />
        <Route path="tours/create" element={<TourCreatePage />} />
        <Route path="tours/:id/edit" element={<TourEditPage />} />
        <Route path="tours/hidden" element={<TourHiddenPage />} />
        {/* Router địa chỉ tour / điểm đến */}
        <Route path="destinations" element={<DestinationListPage />} />
        <Route path="destinations/create" element={<DestinationCreatePage />} />
        <Route path="destinations/:id/edit" element={<DestinationEditPage />} />
        <Route path="destinations/trash" element={<DestinationTrashPage />} />
        {/* Router hướng dẫn viên */}
        <Route path="guides" element={<GuideManagementPage />} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}

export default AdminDashboardPage;
