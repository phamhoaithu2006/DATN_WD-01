import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import TourForm from '../../../components/admin/tours/TourForm'
import { readToken } from '../../../services/authStorage'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
).replace(/\/$/, '')

function TourCreatePage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true)

      const token = readToken()

      if (!token) {
        toast.error('Bạn chưa đăng nhập', {
          description: 'Token không tồn tại. Vui lòng đăng nhập lại.',
        })
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
          toast.error('Bạn chưa đăng nhập', {
            description: 'Token đã hết hạn. Vui lòng đăng nhập lại.',
          })
          return
        }

        if (response.status === 404) {
          toast.error('Không tìm thấy API', {
            description: 'Không tìm thấy /api/admin/tours. Kiểm tra Laravel route.',
          })
          return
        }

        if (response.status === 422 && data?.errors) {
          toast.error('Dữ liệu không hợp lệ', {
            description: Object.values(data.errors).flat().join('\n'),
          })
          return
        }

        if (data?.message) {
          toast.error('Thêm tour thất bại', {
            description: data.message,
          })
          return
        }

        toast.error('Thêm tour thất bại', {
          description: 'Vui lòng kiểm tra lại dữ liệu và thử lại.',
        })
        return
      }

      toast.success('Thành công', {
        description: 'Thêm tour thành công',
      })

      window.setTimeout(() => {
        navigate('/admin/tours')
      }, 600)
    } catch (error) {
      console.error('CREATE TOUR ERROR:', error)

      toast.error('Thêm tour thất bại', {
        description: error.message || 'Có lỗi xảy ra. Vui lòng thử lại.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Tour', 'Thêm tour']}
        title="Thêm tour"
        description="Tạo tour mới cho hệ thống."
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
