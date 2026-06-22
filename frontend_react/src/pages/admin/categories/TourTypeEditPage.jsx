import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import CategoryForm from '../../../components/admin/categories/CategoryForm'
import { categoryApi } from '../../../services/categoryApi'

const defaultForm = {
  name: '',
  description: '',
  status: 'active',
}

function TourTypeEditPage() {
  const [formData, setFormData] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const categoryFromState = location.state?.category

    if (categoryFromState) {
      setFormData({
        name: categoryFromState.name || '',
        description: categoryFromState.description || '',
        status: categoryFromState.status || 'active',
      })
      return
    }

    const fetchCategoryFromList = async () => {
      try {
        setLoading(true)

        const response = await categoryApi.getAll()
        const list = response.data?.data || []
        const category = list.find((item) => String(item.id) === String(id))

        if (!category) {
          setError('Không tìm thấy loại tour cần sửa')
          return
        }

        setFormData({
          name: category.name || '',
          description: category.description || '',
          status: category.status || 'active',
        })
      } catch (err) {
        console.error(err)
        setError('Không thể tải thông tin loại tour')
      } finally {
        setLoading(false)
      }
    }

    fetchCategoryFromList()
  }, [id, location.state])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên loại tour')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      await categoryApi.update(id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
      })

      navigate('/admin/categories')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Cập nhật loại tour thất bại')
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
          Chỉnh sửa tên, mô tả và trạng thái loại tour.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
          Đang tải dữ liệu...
        </div>
      ) : (
        <CategoryForm
          formData={formData}
          submitting={submitting}
          submitLabel="Cập nhật"
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/tours')}
        />
      )}
    </div>
  </section>
)
}

export default TourTypeEditPage