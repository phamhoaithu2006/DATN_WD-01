import AdminPageHeader from '../../components/admin/AdminPageHeader'

function DashboardHome() {
  return (
    <AdminPageHeader
      breadcrumb={["ViVuGo", "Admin Dashboard"]}
      title="Admin Dashboard"
      description="Tổng quan vận hành"
    />
  )
}

export default DashboardHome