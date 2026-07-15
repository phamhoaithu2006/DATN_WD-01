import AdminPageHeader from '../../components/admin/AdminPageHeader'

function SupportDashboardPage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Nhân viên hỗ trợ']}
        title="Trang chủ"
        description="Tổng quan nhanh cho nhân viên hỗ trợ."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Yêu cầu hỗ trợ</p>
          <strong className="mt-2 block text-3xl font-black text-slate-900">0</strong>
          <p className="mt-2 text-sm text-slate-500">Chưa có yêu cầu mới.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Lịch làm việc</p>
          <strong className="mt-2 block text-3xl font-black text-slate-900">0</strong>
          <p className="mt-2 text-sm text-slate-500">Chưa có lịch được phân công.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Thông báo</p>
          <strong className="mt-2 block text-3xl font-black text-slate-900">0</strong>
          <p className="mt-2 text-sm text-slate-500">Không có thông báo chưa đọc.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Trạng thái</p>
          <strong className="mt-2 block text-3xl font-black text-slate-900">Hoạt động</strong>
          <p className="mt-2 text-sm text-slate-500">Sẵn sàng tiếp nhận công việc.</p>
        </div>
      </div>
    </section>
  )
}

export default SupportDashboardPage
