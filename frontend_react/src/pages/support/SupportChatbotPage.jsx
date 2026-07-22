import AdminPageHeader from '../../components/admin/AdminPageHeader'

function SupportChatbotPage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Nhân viên hỗ trợ', 'Chatbot AI']}
        title="Chatbot AI"
        description="Khu vực chatbot hỗ trợ khách hàng sẽ được triển khai trong giai đoạn tiếp theo."
      />

      <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 p-8 text-center text-slate-600 shadow-sm">
        Chatbot AI đang được chuẩn bị.
      </div>
    </section>
  )
}

export default SupportChatbotPage
