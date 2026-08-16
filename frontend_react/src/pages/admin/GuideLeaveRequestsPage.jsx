import { useSearchParams } from 'react-router-dom'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminGuideLeaveRequestsPanel from '../../components/admin/guides/AdminGuideLeaveRequestsPanel.jsx'
import '../../styles/support-staff.css'

function GuideLeaveRequestsPage() {
  const [searchParams] = useSearchParams()
  const highlightedRequestId = searchParams.get('leaveRequestId') || ''

  return (
    <section className="guide-page admin-guide-leave-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Hướng Dẫn Viên', 'Đơn xin nghỉ']}
        title="Quản Lý Đơn Xin Nghỉ"
        description="Duyệt, từ chối và theo dõi lịch sử đơn xin nghỉ của hướng dẫn viên."
        showNotificationBell={false}
      />

      <AdminGuideLeaveRequestsPanel
        highlightRequestId={highlightedRequestId}
      />
    </section>
  )
}

export default GuideLeaveRequestsPage
