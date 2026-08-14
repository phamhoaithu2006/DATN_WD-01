import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import DestinationPlaceForm from '../../../components/admin/destinations/DestinationPlaceForm'
import { TOUR_ACTIVITY_OPTIONS } from '../../../constants/tourActivityTypes'
import { destinationApi } from '../../../services/destinationApi'
import destinationPlaceApi from '../../../services/destinationPlaceApi'

const defaultActivityType = TOUR_ACTIVITY_OPTIONS.find(
  (option) => option.value === 'sightseeing',
)?.value || 'sightseeing'

function DestinationPlaceCreatePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [form, setForm] = useState({
    province_id: params.get('province_id') || '',
    district_id: '',
    name: '',
    address: '',
    description: '',
    thumbnail_url: '',
    status: 'active',
    activity_types: [defaultActivityType],
  })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [districtsLoading, setDistrictsLoading] = useState(false)

  useEffect(() => {
    destinationApi.getProvinces()
      .then((response) => setProvinces(response?.data?.data || []))
      .catch(() => setNotice('Không tải được danh sách tỉnh/thành đã đồng bộ.'))
  }, [])

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
      await destinationPlaceApi.create({
        ...form,
        province_id: Number(form.province_id),
        district_id: form.district_id ? Number(form.district_id) : null,
        name: form.name.trim(),
        address: form.address.trim(),
        description: form.description.trim(),
        thumbnail_url: form.thumbnail_url.trim() || null,
      })
      toast.success('Thêm địa điểm trong tỉnh thành công.')
      back()
    } catch (error) {
      setErrors(error?.response?.data?.errors || {})
      setNotice(error?.response?.data?.message || 'Không thể thêm địa điểm trong tỉnh.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-50/70 px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          breadcrumb={['ViVuGo', 'Quản lý Tour', 'Địa điểm theo tỉnh', 'Thêm mới']}
          title="Thêm địa điểm trong tỉnh"
          description="Tạo địa điểm để hệ thống gợi ý trong lịch trình theo loại hoạt động."
        />
        {notice && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{notice}</div>}
        <DestinationPlaceForm
          form={{ ...form, districtsLoading }}
          provinces={provinces}
          districts={districts}
          errors={errors}
          saving={saving}
          submitLabel="Thêm địa điểm"
          onChange={handleChange}
          onActivityTypesChange={(activityTypes) => setForm((current) => ({ ...current, activity_types: activityTypes }))}
          onSubmit={submit}
          onCancel={back}
        />
      </div>
    </div>
  )
}

export default DestinationPlaceCreatePage
