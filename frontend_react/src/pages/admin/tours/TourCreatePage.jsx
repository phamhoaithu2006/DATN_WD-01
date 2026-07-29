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
  const [errors, setErrors] = useState({})
  const [successCardOpen, setSuccessCardOpen] = useState(false)

  const clearFieldError = (fieldName) => {
    setErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors
      }

      const nextErrors = { ...currentErrors }
      delete nextErrors[fieldName]

      return nextErrors
    })
  }

  const handleSubmit = async (payload) => {
    if (submitting) return

    setSubmitting(true)
    setErrors({})

    try {
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
            description:
              'Không tìm thấy /api/admin/tours. Kiểm tra Laravel route.',
          })
          return
        }

        if (response.status === 422) {
          const validationErrors =
            data?.errors && typeof data.errors === 'object'
              ? data.errors
              : {
                  form: [
                    data?.message ||
                      'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
                  ],
                }

          setErrors(validationErrors)
          return
        }

        const serverMessage = String(data?.message || '')

        // Không hiển thị SQLSTATE hoặc câu SQL thô cho người dùng.
        if (
          response.status === 500 &&
          (
            serverMessage.includes('SQLSTATE[22003]') ||
            serverMessage.includes('base_price') ||
            serverMessage.includes('Out of range value')
          )
        ) {
          setErrors({
            base_price: [
              'Giá gốc tour quá lớn. Vui lòng nhập giá không vượt quá 99.999.999 đ.',
            ],
          })
          return
        }

        toast.error('Thêm tour thất bại', {
          description:
            response.status >= 500
              ? 'Máy chủ không thể xử lý yêu cầu. Vui lòng kiểm tra dữ liệu và thử lại.'
              : serverMessage || 'Vui lòng kiểm tra lại dữ liệu và thử lại.',
        })
        return
      }

      setSuccessCardOpen(true)

      window.setTimeout(() => {
        navigate('/admin/tours')
      }, 1600)
    } catch (error) {
      console.error('CREATE TOUR ERROR:', error)

      toast.error('Thêm tour thất bại', {
        description: error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.',
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
        errors={errors}
        onClearError={clearFieldError}
      />

      {successCardOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-create-success-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)]">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-50">
                    Hoàn tất
                  </p>
                  <h2
                    id="tour-create-success-title"
                    className="mt-0.5 text-xl font-black"
                  >
                    Thêm tour thành công
                  </h2>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 2.5 2.5L16.5 9" />
                </svg>
              </div>

              <p className="mt-5 text-sm font-semibold leading-6 text-slate-600">
                Tour mới đã được lưu vào hệ thống.
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                Đang chuyển về danh sách tour...
              </p>

              <button
                type="button"
                onClick={() => navigate('/admin/tours')}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              >
                Về danh sách tour
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default TourCreatePage