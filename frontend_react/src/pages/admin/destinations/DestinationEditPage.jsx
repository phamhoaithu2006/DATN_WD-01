import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import DestinationForm from '../../../components/admin/destinations/DestinationForm'
import { destinationApi } from '../../../services/destinationApi'
import { toSlug } from '../../../utils/slug'
import { validateDestinationImage } from '../../../utils/imageUpload'

const defaultForm = {
  name: '',
  slug: '',
  province_city: '',
  country: '',
  description: '',
  thumbnail_url: '',
  thumbnail_image: null,
  remove_thumbnail: false,
  status: 'active',
  province_ids: [],
}

function DestinationEditPage() {
  const [formData, setFormData] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [provinces, setProvinces] = useState([])

  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    destinationApi.getProvinces().then((response) => setProvinces(response?.data?.data || [])).catch(() => setProvinces([]))
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const destinationFromState = location.state?.destination

    if (destinationFromState) {
      setFormData({
        name: destinationFromState.name || '',
        slug: destinationFromState.slug || '',
        province_city: destinationFromState.province_city || '',
        country: destinationFromState.country || 'Việt Nam',
        description: destinationFromState.description || '',
        thumbnail_url: destinationFromState.thumbnail_url || '',
        thumbnail_image: null,
        remove_thumbnail: false,
        status: destinationFromState.status || 'active',
        province_ids: (destinationFromState.provinces || []).slice(0, 1).map((province) => province.id),
      })
      setSlugManuallyEdited(false)
      return
    }

    const fetchDestination = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await destinationApi.getOne(id)
        const destination = response.data?.data || response.data

        setFormData({
          name: destination.name || '',
          slug: destination.slug || '',
          province_city: destination.province_city || '',
          country: destination.country || 'Việt Nam',
          description: destination.description || '',
          thumbnail_url: destination.thumbnail_url || '',
          thumbnail_image: null,
          remove_thumbnail: false,
          status: destination.status || 'active',
          province_ids: (destination.provinces || []).slice(0, 1).map((province) => province.id),
        })
        setSlugManuallyEdited(false)
      } catch (err) {
        console.error(err)
        setError('Không thể tải thông tin địa chỉ tour')
      } finally {
        setLoading(false)
      }
    }

      void fetchDestination()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [id, location.state])

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

      await destinationApi.update(id, {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        province_city: formData.province_city.trim(),
        country: formData.country.trim(),
        description: formData.description.trim(),
        thumbnail_image: formData.thumbnail_image,
        remove_thumbnail: formData.remove_thumbnail,
        status: formData.status,
        province_ids: formData.province_ids,
      })

      navigate('/admin/destinations')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Cập nhật địa chỉ tour thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveThumbnail = () => {
    setFormData((prev) => ({
      ...prev,
      thumbnail_image: null,
      thumbnail_url: '',
      remove_thumbnail: true,
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
            Cập nhật địa chỉ tour
          </h1>
          <p className="mt-2 text-slate-500">
            Chỉnh sửa thông tin điểm đến trong hệ thống.
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
          <DestinationForm
            formData={formData}
            submitting={submitting}
            submitLabel="Cập nhật"
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
        )}
      </div>
    </section>
  )
}

export default DestinationEditPage
