import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import DestinationPlaceForm from '../../../components/admin/destinations/DestinationPlaceForm'
import { TOUR_ACTIVITY_OPTIONS } from '../../../constants/tourActivityTypes'
import { destinationApi } from '../../../services/destinationApi'
import destinationPlaceApi from '../../../services/destinationPlaceApi'

const defaultActivityType = TOUR_ACTIVITY_OPTIONS.find(
  (option) => option.value === 'sightseeing',
)?.value || 'sightseeing'

function DestinationPlaceEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [form, setForm] = useState({
    province_id: '',
    district_id: '',
    name: '',
    address: '',
    description: '',
    thumbnail_url: '',
    status: 'active',
    activity_types: [defaultActivityType],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [districtsLoading, setDistrictsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')

  useEffect(() => {
    Promise.all([
      destinationApi.getProvinces(),
      destinationPlaceApi.getById(id),
    ])
      .then(([provinceResponse, placeResponse]) => {
        const place = placeResponse?.data?.data || {}
        setProvinces(provinceResponse?.data?.data || [])
        setForm({
          province_id: String(place.province_id || place.province?.id || ''),
          district_id: String(place.district_id || ''),
          name: place.name || '',
          address: place.address || '',
          description: place.description || '',
          thumbnail_url: place.thumbnail_url || '',
          status: place.status || 'active',
          activity_types: Array.isArray(place.activity_types) && place.activity_types.length
            ? place.activity_types
            : [defaultActivityType],
        })
      })
      .catch((error) => setNotice(error?.response?.data?.message || 'Không tải được địa điểm trong tỉnh.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!form.province_id) {
      setDistricts([])
      return undefined
    }

    setDistrictsLoading(true)
    destinationApi.getProvinceDistricts(form.province_id)
      .then((response) => setDistricts(response?.data?.data || []))
      .catch(() => setDistricts([]))
      .finally(() => setDistrictsLoading(false))

    return undefined
  }, [form.province_id])

  const back = () => navigate(
    '/admin/destination-places' + (form.province_id ? '?province_id=' + form.province_id : ''),
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'province_id' ? { district_id: '' } : {}),
    }))
  }

  const submit = async (event) => {
    event.preventDefault()

    if (!form.activity_types.length) {
      setErrors({ activity_types: ['Vui lòng chọn ít nhất một loại hoạt động.'] })
      return
    }

    try {
      setSaving(true)
      setErrors({})
      setNotice('')
      await destinationPlaceApi.update(id, {
        ...form,
        province_id: Number(form.province_id),
        district_id: form.district_id ? Number(form.district_id) : null,
        name: form.name.trim(),
        address: form.address.trim(),
        description: form.description.trim(),
        thumbnail_url: form.thumbnail_url.trim() || null,
      })
      toast.success('Cập nhật địa điểm trong tỉnh thành công.')
      back()
    } catch (error) {
      setErrors(error?.response?.data?.errors || {})
      setNotice(error?.response?.data?.message || 'Không thể cập nhật địa điểm trong tỉnh.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-50/70 px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          breadcrumb={['ViVuGo', 'Quản lý Tour', 'Địa điểm theo tỉnh', 'Chỉnh sửa']}
          title="Chỉnh sửa địa điểm trong tỉnh"
          description="Cập nhật địa điểm và các loại hoạt động được phép dùng trong lịch trình."
        />
        {notice && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{notice}</div>}
        {loading
          ? <div className="rounded-2xl border bg-white px-6 py-20 text-center">Đang tải dữ liệu...</div>
          : (
            <DestinationPlaceForm
              form={{ ...form, districtsLoading }}
              provinces={provinces}
              districts={districts}
              errors={errors}
              saving={saving}
              submitLabel="Lưu thay đổi"
              onChange={handleChange}
              onActivityTypesChange={(activityTypes) => setForm((current) => ({ ...current, activity_types: activityTypes }))}
              onSubmit={submit}
              onCancel={back}
            />
          )}
      </div>
    </div>
  )
}

export default DestinationPlaceEditPage
