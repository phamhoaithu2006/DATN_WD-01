import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import { confirmAction } from '../../../components/common/AppConfirmDialog.jsx'
import { destinationApi } from '../../../services/destinationApi'
import destinationPlaceApi from '../../../services/destinationPlaceApi'

function unwrapList(response) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

function DestinationPlaceManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [destinations, setDestinations] = useState([])
  const [destinationId, setDestinationId] = useState(searchParams.get('destination_id') || '')
  const [places, setPlaces] = useState([])
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 })
  const [searchValue, setSearchValue] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    destinationApi.getAll()
      .then((response) => setDestinations(unwrapList(response)))
      .catch(() => toast.error('Không tải được danh sách điểm đến.'))
  }, [])

  const fetchPlaces = useCallback(async (page = 1) => {
    if (!destinationId) {
      setPlaces([])
      setPagination({ current: 1, last: 1, total: 0 })
      return
    }
    try {
      setLoading(true)
      const response = await destinationPlaceApi.getAll({ destination_id: destinationId, search: appliedSearch.trim() || undefined, status: appliedStatus || undefined, page, per_page: 10 })
      const paginator = response?.data?.data || {}
      setPlaces(Array.isArray(paginator.data) ? paginator.data : [])
      setPagination({ current: Number(paginator.current_page || 1), last: Number(paginator.last_page || 1), total: Number(paginator.total || 0) })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Không tải được điểm đến chi tiết.')
    } finally {
      setLoading(false)
    }
  }, [destinationId, appliedSearch, appliedStatus])

  useEffect(() => { void fetchPlaces(1) }, [fetchPlaces])

  const remove = async (place) => {
    const accepted = await confirmAction(
      `Điểm đến “${place.name}” sẽ bị xóa khỏi danh sách và không thể chọn trong lịch trình tour mới.`,
      { title: 'Xóa điểm đến chi tiết?', confirmLabel: 'Xóa địa điểm', tone: 'danger' },
    )
    if (!accepted) return
    try {
      await destinationPlaceApi.remove(place.id)
      toast.success(`Đã xóa “${place.name}” thành công.`)
      await fetchPlaces(places.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Không thể xóa điểm đến chi tiết.')
    }
  }

  const selectedDestination = destinations.find((item) => String(item.id) === String(destinationId))

  return (
    <div className="min-h-full bg-[#f4f7fb] px-6 py-7 lg:px-8">
      <AdminPageHeader breadcrumb={['ViVuGo', 'Quản lý Tour', 'Điểm đến chi tiết']} title="Điểm đến chi tiết" description="Xây dựng danh sách địa danh để sử dụng nhanh trong lịch trình tour." actions={<Link to="/admin/tours" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"><span aria-hidden="true">←</span> Quay lại tour</Link>} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5"><h2 className="text-lg font-black text-slate-950">Chọn khu vực quản lý</h2><p className="mt-1 text-sm text-slate-500">Chọn tỉnh, thành phố hoặc điểm đến chính trước khi thêm địa danh.</p></div>
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-end">
          <label><span className="mb-2 block text-sm font-bold text-slate-700">Điểm đến chính <span className="text-rose-500">*</span></span>
            <select value={destinationId} onChange={(event) => { const id = event.target.value; setDestinationId(id); setSearchParams(id ? { destination_id: id } : {}) }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-500">
              <option value="">Chọn điểm đến chính</option>
              {destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}{destination.province_city && destination.province_city !== destination.name ? ` – ${destination.province_city}` : ''}</option>)}
            </select>
          </label>
          {destinationId ? <Link to={`/admin/destination-places/create?destination_id=${destinationId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white shadow-md shadow-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-700"><span className="text-lg">＋</span> Thêm địa danh</Link> : <span className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-5 text-sm font-bold text-slate-400">＋ Thêm địa danh</span>}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span><input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && setAppliedSearch(searchValue.trim())} placeholder="Tìm theo tên địa điểm, địa chỉ..." disabled={!destinationId} className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-50 disabled:bg-slate-100" /></div>
          <button type="button" onClick={() => setAppliedSearch(searchValue.trim())} disabled={!destinationId} className="h-12 rounded-xl bg-sky-600 px-6 text-sm font-bold text-white disabled:bg-slate-300">Tìm kiếm</button>
          <button type="button" onClick={() => setFilterOpen((current) => !current)} disabled={!destinationId} className="h-12 rounded-xl border border-violet-100 bg-violet-50 px-6 text-sm font-bold text-violet-700 disabled:text-slate-400">Bộ lọc {appliedStatus ? '•' : ''}</button>
        </div>
        {filterOpen && <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between"><label className="w-full max-w-sm"><span className="mb-2 block text-sm font-bold text-slate-700">Trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-4"><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Tạm ẩn</option></select></label><div className="flex gap-2"><button type="button" onClick={() => { setStatusFilter(''); setAppliedStatus('') }} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600">Xóa bộ lọc</button><button type="button" onClick={() => { setAppliedStatus(statusFilter); setFilterOpen(false) }} className="h-11 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white">Áp dụng</button></div></div>}
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-black text-slate-950">{selectedDestination ? `Địa danh tại ${selectedDestination.name}` : 'Danh sách địa danh'}</h2><p className="mt-1 text-sm text-slate-500">Tìm thấy {pagination.total} địa điểm</p></div>{destinationId && <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">{selectedDestination?.name}</span>}</div>
        {!destinationId ? <div className="px-6 py-16 text-center text-sm font-semibold text-slate-500">Vui lòng chọn điểm đến chính để xem danh sách.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Địa điểm</th><th className="px-5 py-4">Địa chỉ</th><th className="px-5 py-4">Mô tả</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">
          {loading ? <tr><td colSpan="5" className="px-5 py-16 text-center text-slate-500">Đang tải dữ liệu...</td></tr> : places.length === 0 ? <tr><td colSpan="5" className="px-5 py-16 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">⌖</div><p className="font-bold text-slate-700">Chưa có điểm đến chi tiết</p><p className="mt-1 text-sm text-slate-400">Hãy thêm địa danh đầu tiên cho khu vực này.</p></td></tr> : places.map((place) => <tr key={place.id} className="group transition hover:bg-sky-50/40"><td className="px-5 py-4"><div className="flex items-center gap-3">{place.thumbnail_url ? <img src={place.thumbnail_url} alt="" className="h-12 w-12 rounded-xl border border-slate-200 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 font-black text-sky-600">{place.name?.charAt(0)?.toUpperCase()}</div>}<div><p className="font-extrabold text-slate-900">{place.name}</p><p className="mt-0.5 text-xs text-slate-400">ID #{place.id}</p></div></div></td><td className="px-5 py-4 text-slate-600">{place.address || 'Chưa cập nhật'}</td><td className="max-w-sm px-5 py-4 text-slate-500"><p className="line-clamp-2">{place.description || 'Chưa có mô tả'}</p></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${place.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${place.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{place.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'}</span></td><td className="px-5 py-4 text-right"><div className="inline-flex gap-2"><Link title="Chỉnh sửa" to={`/admin/destination-places/${place.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-3 text-xs font-bold text-sky-700 transition hover:border-sky-200 hover:bg-sky-100">✎ Sửa</Link><button title="Xóa" type="button" onClick={() => void remove(place)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition hover:border-rose-200 hover:bg-rose-100">♲ Xóa</button></div></td></tr>)}
        </tbody></table></div>}
        {pagination.last > 1 && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button disabled={pagination.current <= 1} onClick={() => void fetchPlaces(pagination.current - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Trước</button><span className="px-3 py-2 text-sm">{pagination.current}/{pagination.last}</span><button disabled={pagination.current >= pagination.last} onClick={() => void fetchPlaces(pagination.current + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Sau</button></div>}
      </section>
    </div>
  )
}

export default DestinationPlaceManagementPage
