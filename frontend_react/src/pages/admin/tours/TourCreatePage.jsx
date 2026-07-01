import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import TourForm from '../../../components/admin/tours/TourForm'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
).replace(/\/$/, '')

const getAuthToken = () => {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('authToken')
  )
}

function TourCreatePage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true)

      const token = getAuthToken()

      if (!token) {
        alert('Bạn chưa đăng nhập hoặc token không tồn tại. Vui lòng đăng nhập lại.')
        return
      }

      const response = await fetch(`${API_BASE_URL}/admin/tours`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        console.error('CREATE TOUR ERROR RESPONSE:', data)

        if (response.status === 401) {
          alert('Bạn chưa đăng nhập hoặc token hết hạn')
          return
        }

        if (response.status === 404) {
          alert('Không tìm thấy API /api/admin/tours. Kiểm tra Laravel route.')
          return
        }

        if (response.status === 422 && data?.errors) {
          alert(Object.values(data.errors).flat().join('\n'))
          return
        }

        if (data?.message) {
          alert(data.message)
          return
        }

        alert('Thêm tour thất bại')
        return
      }

      alert('Thêm tour thành công')
      navigate('/admin/tours')
    } catch (error) {
      console.error('CREATE TOUR ERROR:', error)
      alert(error.message || 'Thêm tour thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Tour', 'Thêm tour']}
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