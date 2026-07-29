import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import CategoryForm from '../../../components/admin/categories/CategoryForm'
import { categoryApi } from '../../../services/categoryApi'

const defaultForm = {
  name: '',
  description: '',
  status: 'active',
}

const mapCategoryToFormData = (category) => ({
  name: category?.name || '',
  description: category?.description || '',
  status: category?.status || 'active',
})

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

function TourTypeEditPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [formData, setFormData] = useState(() =>
    location.state?.category
      ? mapCategoryToFormData(location.state.category)
      : defaultForm,
  )
  const [loading, setLoading] = useState(!location.state?.category)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    let active = true

    async function fetchCategoryFromList() {
      if (location.state?.category) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setPageError('')

        const response = await categoryApi.getAll()
        const list = Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data)
            ? response.data
            : []

        const category = list.find(
          (item) => String(item.id) === String(id),
        )

        if (!active) return

        if (!category) {
          setPageError('Không tìm thấy loại tour cần sửa.')
          return
        }

        setFormData(mapCategoryToFormData(category))
      } catch (err) {
        if (!active) return

        console.error('LOAD CATEGORY ERROR:', err)
        setPageError(
          err?.response?.data?.message ||
            'Không thể tải thông tin loại tour.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchCategoryFromList()

    return () => {
      active = false
    }
  }, [id, location.state])

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

      await categoryApi.update(id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
      })

      navigate('/admin/categories', {
        replace: true,
        state: {
          notice: {
            type: 'success',
            title: 'Cập nhật loại tour thành công',
            message: `Loại tour “${formData.name.trim()}” đã được cập nhật.`,
          },
        },
      })
    } catch (err) {
      console.error('UPDATE CATEGORY ERROR:', err)

      if (err?.response?.status === 422) {
        setErrors(normalizeErrors(err.response?.data?.errors))
        return
      }

      setPageError(
        err?.response?.data?.message ||
          'Cập nhật loại tour thất bại. Vui lòng thử lại.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-sky-600">
            Quản lý danh mục tour
          </p>

          <h1 className="text-3xl font-extrabold text-slate-950">
            Cập nhật loại tour
          </h1>

          <p className="mt-2 text-slate-500">
            Chỉnh sửa tên, mô tả và trạng thái của loại tour.
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

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
            Đang tải dữ liệu...
          </div>
        ) : (
          <CategoryForm
            formData={formData}
            errors={errors}
            submitting={submitting}
            submitLabel="Cập nhật"
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/admin/categories')}
          />
        )}
      </div>
    </section>
  )
}

export default TourTypeEditPage