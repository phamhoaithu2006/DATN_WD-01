import AdminPageHeader from '../../components/admin/AdminPageHeader'

function SupportRequestsPage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Nhân viên hỗ trợ', 'Yêu cầu hỗ trợ']}
        title="Yêu cầu hỗ trợ"
        description="Quản lý các yêu cầu hỗ trợ từ khách hàng và hệ thống."
      />

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-sm">
        Danh sách yêu cầu hỗ trợ sẽ hiển thị tại đây.
      </div>
    </section>
  )
}

export default SupportRequestsPage
