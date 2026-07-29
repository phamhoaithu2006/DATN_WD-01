import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import CategoryForm from '../../../components/admin/categories/CategoryForm'
import { categoryApi } from '../../../services/categoryApi'

const defaultForm = {
  name: '',
  description: '',
  status: 'active',
}

function normalizeErrors(errors) {
  if (!errors || typeof errors !== 'object') return {}

  return Object.fromEntries(
    Object.entries(errors).map(([field, value]) => [
      field,
      Array.isArray(value) ? value[0] : String(value),
    ]),
  )
}

function validateForm(formData) {
  const errors = {}
  const name = String(formData.name || '').trim()
  const description = String(formData.description || '').trim()

  if (!name) {
    errors.name = 'Vui lòng nhập tên loại tour.'
  } else if (name.length < 2) {
    errors.name = 'Tên loại tour phải có ít nhất 2 ký tự.'
  } else if (name.length > 100) {
    errors.name = 'Tên loại tour không được vượt quá 100 ký tự.'
  }

  if (description.length > 500) {
    errors.description = 'Mô tả không được vượt quá 500 ký tự.'
  }

  if (!['active', 'inactive'].includes(formData.status)) {
    errors.status = 'Trạng thái không hợp lệ.'
  }

  return errors
}

function TourTypeCreatePage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [pageError, setPageError] = useState('')
  const [successCardOpen, setSuccessCardOpen] = useState(false)

  const clearFieldError = (field) => {
    setErrors((current) => {
      if (!current[field]) return current

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    clearFieldError(name)
    setPageError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (submitting) return

    const clientErrors = validateForm(formData)
    setErrors(clientErrors)
    setPageError('')

    if (Object.keys(clientErrors).length > 0) {
      return
    }

    try {
      setSubmitting(true)

      await categoryApi.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
      })

      setSuccessCardOpen(true)

      window.setTimeout(() => {
        navigate('/admin/categories', { replace: true })
      }, 1600)
    } catch (err) {
      console.error('CREATE CATEGORY ERROR:', err)

      if (err?.response?.status === 422) {
        setErrors(normalizeErrors(err.response?.data?.errors))
        return
      }

      setPageError(
        err?.response?.data?.message ||
          'Thêm loại tour thất bại. Vui lòng thử lại.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="w-full">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-slate-500">
          Quản lý danh mục tour
        </p>

        <h1 className="text-3xl font-extrabold text-slate-950">
          Thêm loại tour
        </h1>

        <p className="mt-2 text-slate-500">
          Tạo mới một loại tour để phân loại các tour du lịch.
        </p>
      </div>

      {pageError ? (
        <div
          className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
          role="alert"
        >
          {pageError}
        </div>
      ) : null}

      <CategoryForm
        formData={formData}
        errors={errors}
        submitting={submitting}
        submitLabel="Thêm mới"
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin/categories')}
      />

      {successCardOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-create-success-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_30px_90px_-28px_rgba(15,23,42,0.65)]">
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
                    id="category-create-success-title"
                    className="mt-0.5 text-xl font-black"
                  >
                    Thêm loại tour thành công
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
                Loại tour “{formData.name.trim()}” đã được lưu vào hệ thống.
              </p>

              <p className="mt-1 text-xs font-medium text-slate-400">
                Đang chuyển về danh sách loại tour...
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate('/admin/categories', { replace: true })
                }
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              >
                Về danh sách loại tour
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default TourTypeCreatePage