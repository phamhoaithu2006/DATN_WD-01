import AdminPageHeader from '../../components/admin/AdminPageHeader'

function SupportWorkSchedulePage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Nhân viên hỗ trợ', 'Lịch làm việc']}
        title="Lịch làm việc"
        description="Xem lịch làm việc và các ca được phân công."
      />

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-sm">
        Lịch làm việc của nhân viên hỗ trợ sẽ hiển thị tại đây.
      </div>
    </section>
  )
}

export default SupportWorkSchedulePage
