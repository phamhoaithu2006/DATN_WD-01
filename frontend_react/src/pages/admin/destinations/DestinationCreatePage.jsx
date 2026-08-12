import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DestinationForm from '../../../components/admin/destinations/DestinationForm'
import { destinationApi } from '../../../services/destinationApi'
import { toSlug } from '../../../utils/slug'
import { validateDestinationImage } from '../../../utils/imageUpload'

const defaultForm = {
  name: '',
  slug: '',
  province_city: '',
  country: 'Việt Nam',
  description: '',
  thumbnail_url: '',
  thumbnail_image: null,
  remove_thumbnail: false,
  status: 'active',
  province_ids: [],
}

function DestinationCreatePage() {
  const [formData, setFormData] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [provinces, setProvinces] = useState([])

  const navigate = useNavigate()

  useEffect(() => {
    destinationApi.getProvinces().then((response) => setProvinces(response?.data?.data || [])).catch(() => setProvinces([]))
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'name') {
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: slugManuallyEdited ? prev.slug : toSlug(value),
      }))
      return
    }

    if (name === 'slug') {
      setSlugManuallyEdited(true)
      setFormData((prev) => ({
        ...prev,
        slug: toSlug(value),
      }))
      return
    }

    if (name === 'thumbnail_image') {
      const file = event.target.files?.[0] || null
      const imageError = validateDestinationImage(file)

      if (imageError) {
        event.target.value = ''
        setError(imageError)
        return
      }

      setFormData((prev) => ({
        ...prev,
        thumbnail_image: file,
        remove_thumbnail: false,
      }))
      setError('')
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

    if (!formData.province_ids?.[0]) {
      setError('Vui lòng chọn Tỉnh / Thành phố thuộc hệ thống')
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

    const imageError = validateDestinationImage(formData.thumbnail_image)

    if (imageError) {
      setError(imageError)
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
        thumbnail_image: formData.thumbnail_image,
        status: formData.status,
        province_ids: formData.province_ids,
      })

      navigate('/admin/destinations')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Thêm địa chỉ tour thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveThumbnail = () => {
    setFormData((prev) => ({
      ...prev,
      thumbnail_image: null,
      thumbnail_url: '',
      remove_thumbnail: false,
    }))
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
          onRemoveThumbnail={handleRemoveThumbnail}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/destinations')}
          provinces={provinces}
          onProvinceSelect={(selectedOption) => setFormData((prev) => ({
            ...prev,
            province_ids: selectedOption ? [selectedOption.value] : [],
            province_city: selectedOption?.label || '',
          }))}
        />
      </div>
    </section>
  )
}

export default DestinationCreatePage
