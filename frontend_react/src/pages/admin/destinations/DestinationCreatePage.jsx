import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DestinationForm from '../../../components/admin/destinations/DestinationForm'
import { destinationApi } from '../../../services/destinationApi'

const defaultForm = {
  name: '',
  slug: '',
  province_city: '',
  country: 'Việt Nam',
  description: '',
  thumbnail_url: '',
  status: 'active',
}

const toSlug = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

function DestinationCreatePage() {
  const [formData, setFormData] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'name') {
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: prev.slug ? prev.slug : toSlug(value),
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên điểm đến')
      return
    }

    if (!formData.slug.trim()) {
      setError('Vui lòng nhập slug')
      return
    }

    if (!formData.province_city.trim()) {
      setError('Vui lòng nhập tỉnh / thành phố')
      return
    }

    if (!formData.country.trim()) {
      setError('Vui lòng nhập quốc gia')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      await destinationApi.create({
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        province_city: formData.province_city.trim(),
        country: formData.country.trim(),
        description: formData.description.trim(),
        thumbnail_url: formData.thumbnail_url.trim(),
        status: formData.status,
      })

      navigate('/admin/destinations')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Thêm địa chỉ tour thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="min-h-screen bg-[#f6f9fd] px-6 py-7 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-emerald-600">
            Quản lý địa chỉ tour
          </p>
          <h1 className="text-3xl font-extrabold text-slate-950">
            Thêm địa chỉ tour
          </h1>
          <p className="mt-2 text-slate-500">
            Tạo mới điểm đến để gán cho các tour du lịch.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 font-semibold text-red-700">
            {error}
          </div>
        )}

        <DestinationForm
          formData={formData}
          submitting={submitting}
          submitLabel="Thêm mới"
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/destinations')}
        />
      </div>
    </section>
  )
}

export default DestinationCreatePage