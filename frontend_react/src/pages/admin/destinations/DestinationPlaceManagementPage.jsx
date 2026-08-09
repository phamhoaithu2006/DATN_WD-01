import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import { destinationApi } from '../../../services/destinationApi'
import destinationPlaceApi from '../../../services/destinationPlaceApi'

const EMPTY_FORM = {
  name: '',
  address: '',
  description: '',
  thumbnail_url: '',
  status: 'active',
}

function unwrapList(response) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

function DestinationPlaceManagementPage() {
  const [destinations, setDestinations] = useState([])
  const [destinationId, setDestinationId] = useState('')
  const [places, setPlaces] = useState([])
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 })
  const [searchValue, setSearchValue] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlace, setEditingPlace] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    destinationApi.getAll()
      .then((response) => setDestinations(unwrapList(response)))
      .catch(() => setNotice({ type: 'error', text: 'Không tải được danh sách điểm đến.' }))
  }, [])

  const fetchPlaces = useCallback(async (page = 1, overrides = {}) => {
    if (!destinationId) {
      setPlaces([])
      setPagination({ current: 1, last: 1, total: 0 })
      return
    }

    try {
      setLoading(true)
      const response = await destinationPlaceApi.getAll({
        destination_id: destinationId,
        search: (overrides.search ?? appliedSearch).trim() || undefined,
        status: (overrides.status ?? appliedStatus) || undefined,
        page,
        per_page: 10,
      })
      const paginator = response?.data?.data || {}
      setPlaces(Array.isArray(paginator.data) ? paginator.data : [])
      setPagination({
        current: Number(paginator.current_page || 1),
        last: Number(paginator.last_page || 1),
        total: Number(paginator.total || 0),
      })
    } catch (error) {
      setNotice({ type: 'error', text: error?.response?.data?.message || 'Không tải được điểm đến chi tiết.' })
    } finally {
      setLoading(false)
    }
  }, [destinationId, appliedSearch, appliedStatus])

  useEffect(() => {
    void fetchPlaces(1)
  }, [fetchPlaces])

  const openCreate = () => {
    if (!destinationId) return
    setEditingPlace(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (place) => {
    setEditingPlace(place)
    setForm({
      name: place.name || '',
      address: place.address || '',
      description: place.description || '',
      thumbnail_url: place.thumbnail_url || '',
      status: place.status || 'active',
    })
    setErrors({})
    setModalOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true)
      setErrors({})
      const payload = { ...form, destination_id: Number(destinationId) }
      if (editingPlace) {
        await destinationPlaceApi.update(editingPlace.id, payload)
      } else {
        await destinationPlaceApi.create(payload)
      }
      setModalOpen(false)
      setSearchValue('')
      setAppliedSearch('')
      setStatusFilter('')
      setAppliedStatus('')
      setNotice({ type: 'success', text: editingPlace ? 'Cập nhật địa điểm thành công.' : 'Thêm địa điểm thành công.' })
      await fetchPlaces(1, { search: '', status: '' })
    } catch (error) {
      setErrors(error?.response?.data?.errors || {})
      setNotice({ type: 'error', text: error?.response?.data?.message || 'Không thể lưu địa điểm.' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (place) => {
    if (!window.confirm(`Xóa địa điểm “${place.name}”?`)) return
    try {
      await destinationPlaceApi.remove(place.id)
      setNotice({ type: 'success', text: 'Xóa địa điểm thành công.' })
      await fetchPlaces(places.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current)
    } catch (error) {
      setNotice({ type: 'error', text: error?.response?.data?.message || 'Không thể xóa địa điểm.' })
    }
  }

  const selectedDestination = destinations.find((item) => String(item.id) === String(destinationId))

  const handleSearch = () => {
    setAppliedSearch(searchValue.trim())
  }

  const applyFilter = () => {
    setAppliedStatus(statusFilter)
    setFilterOpen(false)
  }

  const resetFilter = () => {
    setStatusFilter('')
    setAppliedStatus('')
  }

  return (
    <div className="min-h-full bg-slate-50/70 px-8 py-8">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản lý Tour', 'Điểm đến chi tiết']}
        title="Quản lý điểm đến chi tiết"
        description="Chọn tỉnh/thành hoặc điểm đến chính trước khi quản lý các địa danh tham quan trực thuộc."
        actions={<Link to="/admin/tours" className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm">Quay lại tour</Link>}
      />

      {notice && <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{notice.text}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-sm font-bold text-slate-700">Điểm đến chính <span className="text-rose-500">*</span></span>
            <select value={destinationId} onChange={(event) => setDestinationId(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-500">
              <option value="">Chọn điểm đến chính</option>
              {destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}{destination.province_city && destination.province_city !== destination.name ? ` – ${destination.province_city}` : ''}</option>)}
            </select>
          </label>
          <button type="button" onClick={openCreate} disabled={!destinationId} className="h-11 rounded-xl bg-sky-500 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">+ Thêm điểm đến chi tiết</button>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
              placeholder="Tìm kiếm theo tên địa điểm, địa chỉ..."
              disabled={!destinationId}
              className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
            />
          </div>
          <button type="button" onClick={handleSearch} disabled={!destinationId} className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-sky-500 px-7 text-sm font-bold text-white shadow-sm transition hover:bg-sky-600 disabled:bg-slate-300">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            Tìm kiếm
          </button>
          <button type="button" onClick={() => setFilterOpen((current) => !current)} disabled={!destinationId} className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-6 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:bg-slate-100 disabled:text-slate-400">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
            Bộ lọc
            {appliedStatus && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[11px] text-white">1</span>}
            <span className={`transition ${filterOpen ? 'rotate-180' : ''}`}>⌄</span>
          </button>
        </div>

        {filterOpen && (
          <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="w-full max-w-sm">
              <span className="mb-2 block text-sm font-bold text-slate-700">Trạng thái</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-violet-400">
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ẩn</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={resetFilter} className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-50">Xóa bộ lọc</button>
              <button type="button" onClick={applyFilter} className="h-11 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white hover:bg-violet-700">Áp dụng</button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="font-bold text-slate-900">{selectedDestination ? `Địa điểm tại ${selectedDestination.name}` : 'Danh sách địa điểm'}</h2><p className="mt-1 text-xs text-slate-500">{pagination.total} địa điểm</p></div>
        </div>
        {!destinationId ? (
          <div className="px-6 py-16 text-center text-sm font-semibold text-slate-500">Vui lòng chọn điểm đến chính để xem và thêm địa điểm chi tiết.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Địa điểm</th><th className="px-5 py-4">Địa chỉ</th><th className="px-5 py-4">Mô tả</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan="5" className="px-5 py-14 text-center text-slate-500">Đang tải...</td></tr> : places.length === 0 ? <tr><td colSpan="5" className="px-5 py-14 text-center text-slate-500">Chưa có điểm đến chi tiết.</td></tr> : places.map((place) => (
                  <tr key={place.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-bold text-slate-900">{place.name}</td><td className="px-5 py-4 text-slate-600">{place.address || '—'}</td><td className="max-w-sm px-5 py-4 text-slate-600"><p className="line-clamp-2">{place.description || '—'}</p></td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${place.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{place.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => openEdit(place)} className="mr-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700">Sửa</button><button type="button" onClick={() => void remove(place)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Xóa</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.last > 1 && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button disabled={pagination.current <= 1} onClick={() => void fetchPlaces(pagination.current - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Trước</button><span className="px-3 py-2 text-sm">{pagination.current}/{pagination.last}</span><button disabled={pagination.current >= pagination.last} onClick={() => void fetchPlaces(pagination.current + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Sau</button></div>}
      </section>

      {modalOpen && <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><h3 className="text-xl font-black text-slate-950">{editingPlace ? 'Cập nhật địa điểm' : 'Thêm điểm đến chi tiết'}</h3><p className="mt-1 text-sm font-medium text-slate-500">Thuộc điểm đến chính: <span className="font-bold text-sky-600">{selectedDestination?.name}</span></p></div><button type="button" onClick={() => setModalOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 hover:bg-slate-200">×</button></div><div className="space-y-4 p-6">
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Tên địa điểm <span className="text-rose-500">*</span></span><input autoFocus required placeholder="Ví dụ: Bà Nà Hills" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />{errors.name && <small className="mt-1 block font-semibold text-rose-600">{errors.name[0]}</small>}</label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Địa chỉ cụ thể</span><input placeholder="Ví dụ: Hòa Vang, Đà Nẵng" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Mô tả ngắn</span><textarea rows="3" placeholder="Giới thiệu ngắn về địa điểm..." value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Hình ảnh <span className="font-normal text-slate-400">(URL, không bắt buộc)</span></span><input type="url" placeholder="https://..." value={form.thumbnail_url} onChange={(e) => setForm((prev) => ({ ...prev, thumbnail_url: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-slate-700">Trạng thái</span><select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"><option value="active">Đang hoạt động</option><option value="inactive">Tạm ẩn</option></select></label>
      </div><div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4"><button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100">Hủy</button><button disabled={saving} className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-60">{saving ? 'Đang lưu...' : editingPlace ? 'Lưu thay đổi' : 'Thêm địa điểm'}</button></div></form></div>}
    </div>
  )
}

export default DestinationPlaceManagementPage
