import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import DestinationPlaceForm from '../../../components/admin/destinations/DestinationPlaceForm'
import { destinationApi } from '../../../services/destinationApi'
import destinationPlaceApi from '../../../services/destinationPlaceApi'

const unwrapList = (response) => response?.data?.data?.data || response?.data?.data || response?.data || []

function DestinationPlaceCreatePage() {
  const [params] = useSearchParams(); const navigate = useNavigate()
  const [destinations, setDestinations] = useState([]); const [districtGroups, setDistrictGroups] = useState([])
  const [form, setForm] = useState({ destination_id: params.get('destination_id') || '', district_id: '', name: '', address: '', description: '', thumbnail_url: '', status: 'active' })
  const [errors, setErrors] = useState({}); const [notice, setNotice] = useState(''); const [saving, setSaving] = useState(false); const [districtsLoading, setDistrictsLoading] = useState(false)
  useEffect(() => { destinationApi.getAll().then((r) => setDestinations(unwrapList(r))).catch(() => setNotice('Không tải được danh sách điểm đến chính.')) }, [])
  useEffect(() => { if (!form.destination_id) { setDistrictGroups([]); return } setDistrictsLoading(true); destinationApi.getDistricts(form.destination_id).then((r) => setDistrictGroups(r?.data?.data || [])).catch(() => setDistrictGroups([])).finally(() => setDistrictsLoading(false)) }, [form.destination_id])
  const back = () => navigate(`/admin/destination-places${form.destination_id ? `?destination_id=${form.destination_id}` : ''}`)
  const submit = async (event) => { event.preventDefault(); try { setSaving(true); setErrors({}); setNotice(''); await destinationPlaceApi.create({ ...form, destination_id: Number(form.destination_id), district_id: form.district_id ? Number(form.district_id) : null, name: form.name.trim(), address: form.address.trim(), description: form.description.trim(), thumbnail_url: form.thumbnail_url.trim() || null }); toast.success('Thêm điểm đến chi tiết thành công.'); back() } catch (error) { setErrors(error?.response?.data?.errors || {}); setNotice(error?.response?.data?.message || 'Không thể thêm điểm đến chi tiết.') } finally { setSaving(false) } }
  return <div className="min-h-full bg-slate-50/70 px-8 py-8"><div className="mx-auto max-w-5xl"><AdminPageHeader breadcrumb={['ViVuGo', 'Quản lý Tour', 'Điểm đến chi tiết', 'Thêm mới']} title="Thêm điểm đến chi tiết" description="Tạo địa danh mới để sử dụng trong lịch trình tour." />{notice && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{notice}</div>}<DestinationPlaceForm form={form} destinations={destinations} districtGroups={districtGroups} districtsLoading={districtsLoading} errors={errors} saving={saving} submitLabel="Thêm điểm đến" onChange={(e) => setForm((v) => ({ ...v, [e.target.name]: e.target.value }))} onSubmit={submit} onCancel={back} /></div></div>
}
export default DestinationPlaceCreatePage
