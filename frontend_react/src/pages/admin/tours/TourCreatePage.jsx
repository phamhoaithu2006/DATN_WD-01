import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import TourForm from '../../../components/admin/tours/TourForm'
import tourApi from '../../../services/toursApi'

function TourCreatePage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (payload) => {
  try {
    setSubmitting(true)

    await tourApi.create(payload)

    alert('Thêm tour thành công')
    navigate('/admin/tours')
  } catch (error) {
    console.error('CREATE TOUR ERROR:', error)
    console.error('STATUS:', error.response?.status)
    console.error('DATA:', error.response?.data)

    const status = error.response?.status
    const message = error.response?.data?.message
    const errors = error.response?.data?.errors

    if (status === 401) {
      alert('Bạn chưa đăng nhập hoặc token hết hạn')
      return
    }

    if (status === 404) {
      alert('Không tìm thấy API /api/admin/tours. Kiểm tra Laravel route.')
      return
    }

    if (errors) {
      alert(Object.values(errors).flat().join('\n'))
      return
    }

    if (message) {
      alert(message)
      return
    }

    alert('Thêm tour thất bại')
  } finally {
    setSubmitting(false)
  }
}

  return (
    <div className="p-6">
      <AdminPageHeader
        breadcrumb={["ViVuGo", "Quản Lý Tour", "Thêm tour"]}
        title="Thêm tour"
        description="Tạo tour mới cho hệ thống"
        actions={
          <Link
            to="/admin/tours"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            ← Quay lại danh sách
          </Link>
        }
      />

      <TourForm
        onSubmit={handleSubmit}
        submitting={submitting}
        submitText="Thêm tour"
      />
    </div>
  )
}

export default TourCreatePage