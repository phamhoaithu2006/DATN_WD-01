import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import CategoryForm from '../../../components/admin/categories/CategoryForm'
import { categoryApi } from '../../../services/categoryApi'

const defaultForm = {
  name: '',
  description: '',
  status: 'active',
}

function TourTypeCreatePage() {
  const [formData, setFormData] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

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

      await categoryApi.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
      })
      
      navigate('/admin/categories')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Thêm loại tour thất bại')
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

      {error && (
        <div className="mb-5 rounded-xl bg-red-100 px-4 py-3 font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <CategoryForm
          formData={formData}
          submitting={submitting}
          submitLabel="Thêm mới"
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/tours')}
        />
      </div>
    </section>
  )
}

export default TourTypeCreatePage