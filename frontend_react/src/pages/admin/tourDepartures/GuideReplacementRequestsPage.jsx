import { useSearchParams } from 'react-router-dom'
import AdminGuideReplacementRequestsPanel from '../../../components/admin/guides/AdminGuideReplacementRequestsPanel.jsx'
import AdminPageHeader from '../../../components/admin/AdminPageHeader.jsx'

export default function GuideReplacementRequestsPage() {
  const [searchParams] = useSearchParams()

  return (
    <div className="p-6">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Lịch Khởi Hành', 'Đơn yêu cầu đổi HDV']}
        title="Đơn yêu cầu đổi HDV"
        description="Tiếp nhận, xử lý và theo dõi lịch sử các yêu cầu đổi hướng dẫn viên."
      />
      <AdminGuideReplacementRequestsPanel
        highlightRequestId={searchParams.get('replacementRequestId') || ''}
        initialTab={searchParams.get('tab') === 'history' ? 'history' : 'pending'}
      />
    </div>
  )
}
