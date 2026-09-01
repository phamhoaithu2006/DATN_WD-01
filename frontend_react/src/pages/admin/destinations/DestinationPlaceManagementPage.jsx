import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import DestinationPlaceForm from '../../../components/admin/destinations/DestinationPlaceForm'
import { confirmAction } from '../../../components/common/AppConfirmDialog.jsx'
import {
  TOUR_ACTIVITY_OPTIONS,
  TOUR_ACTIVITY_TYPE_LABELS,
} from '../../../constants/tourActivityTypes'
import { destinationApi } from '../../../services/destinationApi'
import destinationPlaceApi from '../../../services/destinationPlaceApi'
import tourApi from '../../../services/toursApi'

const defaultActivityType = TOUR_ACTIVITY_OPTIONS.find(
  (option) => option.value === 'sightseeing',
)?.value || 'sightseeing'

const emptyPlaceForm = (provinceId = '') => ({
  province_id: String(provinceId || ''),
  district_id: '',
  name: '',
  address: '',
  description: '',
  thumbnail_url: '',
  status: 'active',
  activity_types: [defaultActivityType],
})

function DestinationPlaceManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [provinces, setProvinces] = useState([])
  const [provinceId, setProvinceId] = useState(searchParams.get('province_id') || '')
  const [provinceSearch, setProvinceSearch] = useState('')
  const [places, setPlaces] = useState([])
  const [pagination, setPagination] = useState({ current: 1, last: 1, total: 0 })
  const [perPage, setPerPage] = useState(10)
  const [searchValue, setSearchValue] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [appliedStatus, setAppliedStatus] = useState('')
  const [activityFilter, setActivityFilter] = useState('')
  const [appliedActivity, setAppliedActivity] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineActivities, setTimelineActivities] = useState([])
  const [expandedTimelineId, setExpandedTimelineId] = useState(null)
  const [viewMode, setViewMode] = useState('active')
  const [formMode, setFormMode] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [placeForm, setPlaceForm] = useState(() => emptyPlaceForm(provinceId))
  const [formErrors, setFormErrors] = useState({})
  const [formSaving, setFormSaving] = useState(false)
  const [districts, setDistricts] = useState([])
  const [districtsLoading, setDistrictsLoading] = useState(false)

  const fetchProvinces = useCallback(async () => {
    try {
      const response = await destinationApi.getProvinces()
      setProvinces(response?.data?.data || [])
    } catch {
      toast.error('Không tải được danh sách tỉnh/thành.')
    }
  }, [])

  useEffect(() => {
    void fetchProvinces()
  }, [fetchProvinces])

  useEffect(() => {
    if (provinceId || provinces.length === 0) return

    const firstProvinceId = String(provinces[0].id)
    setProvinceId(firstProvinceId)
    setSearchParams({ province_id: firstProvinceId }, { replace: true })
  }, [provinceId, provinces, setSearchParams])

  const fetchPlaces = useCallback(async (page = 1) => {
    if (!provinceId) {
      setPlaces([])
      setPagination({ current: 1, last: 1, total: 0 })
      setFetchError(null)
      return
    }

    try {
      setLoading(true)
      setFetchError(null)
      const params = {
        province_id: provinceId,
        activity_type: viewMode === 'active' ? appliedActivity || undefined : undefined,
        search: appliedSearch.trim() || undefined,
        status: viewMode === 'active' ? appliedStatus || undefined : undefined,
        page,
        per_page: perPage,
      }
      const response = viewMode === 'trash'
        ? await destinationPlaceApi.getTrashed(params)
        : await destinationPlaceApi.getAll(params)
      const paginator = response?.data?.data || {}
      setPlaces(Array.isArray(paginator.data) ? paginator.data : [])
      setPagination({
        current: Number(paginator.current_page || 1),
        last: Number(paginator.last_page || 1),
        total: Number(paginator.total || 0),
      })
    } catch (error) {
      const message = error?.response?.data?.message || 'Không tải được địa điểm trong tỉnh.'
      setFetchError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [provinceId, appliedActivity, appliedSearch, appliedStatus, viewMode, perPage])

  useEffect(() => {
    void fetchPlaces(1)
  }, [fetchPlaces])

  const remove = async (place) => {
    const accepted = await confirmAction(
      'Địa điểm “' + place.name + '” sẽ không còn được chọn trong lịch trình mới.',
      { title: 'Xóa địa điểm?', confirmLabel: 'Xóa địa điểm', tone: 'danger' },
    )
    if (!accepted) return

    try {
      await destinationPlaceApi.remove(place.id)
      toast.success('Đã xóa “' + place.name + '” thành công.')
      await Promise.all([
        fetchPlaces(places.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current),
        fetchProvinces(),
      ])
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Không thể xóa địa điểm.')
    }
  }

  const handleSelectProvince = (id) => {
    setFormMode(null)
    setProvinceId(id)
    setSearchParams(id ? { province_id: id } : {})
  }

  const selectedProvince = provinces.find((item) => String(item.id) === String(provinceId))
  const filteredProvinces = provinces.filter((p) =>
    p.name?.toLowerCase().includes(provinceSearch.toLowerCase().trim())
  )
  const hasFilter = Boolean(appliedStatus || appliedActivity || appliedSearch)

  const clearAllFilters = () => {
    setSearchValue('')
    setAppliedSearch('')
    setActivityFilter('')
    setAppliedActivity('')
    setStatusFilter('')
    setAppliedStatus('')
  }

  useEffect(() => {
    if (!placeForm.province_id || !formMode) {
      setDistricts([])
      return
    }

    setDistrictsLoading(true)
    destinationApi.getProvinceDistricts(placeForm.province_id)
      .then((response) => setDistricts(response?.data?.data || []))
      .catch(() => setDistricts([]))
      .finally(() => setDistrictsLoading(false))
  }, [formMode, placeForm.province_id])

  const openCreateForm = () => {
    setEditingId(null)
    setFormErrors({})
    setPlaceForm(emptyPlaceForm(provinceId))
    setFormMode('create')
  }

  const openEditForm = (place) => {
    setEditingId(place.id)
    setFormErrors({})
    setPlaceForm({
      province_id: String(place.province_id || place.province?.id || provinceId),
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
    setFormMode('edit')
  }

  const handlePlaceFormChange = (event) => {
    const { name, value } = event.target
    setPlaceForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'province_id' ? { district_id: '' } : {}),
    }))
  }

  const submitPlaceForm = async (event) => {
    event.preventDefault()
    if (!placeForm.activity_types.length) {
      setFormErrors({ activity_types: ['Vui lòng chọn ít nhất một loại hoạt động.'] })
      return
    }

    const payload = {
      ...placeForm,
      province_id: Number(placeForm.province_id),
      district_id: placeForm.district_id ? Number(placeForm.district_id) : null,
      name: placeForm.name.trim(),
      address: placeForm.address.trim(),
      description: placeForm.description.trim(),
      thumbnail_url: placeForm.thumbnail_url.trim() || null,
    }

    try {
      setFormSaving(true)
      setFormErrors({})
      if (formMode === 'edit') await destinationPlaceApi.update(editingId, payload)
      else await destinationPlaceApi.create(payload)

      const nextProvinceId = String(payload.province_id)
      setProvinceId(nextProvinceId)
      setSearchParams({ province_id: nextProvinceId }, { replace: true })
      setFormMode(null)
      toast.success(formMode === 'edit' ? 'Cập nhật địa điểm thành công.' : 'Thêm địa điểm thành công.')
      await Promise.all([fetchPlaces(1), fetchProvinces()])
    } catch (error) {
      setFormErrors(error?.response?.data?.errors || {})
      toast.error(error?.response?.data?.message || 'Không thể lưu địa điểm.')
    } finally {
      setFormSaving(false)
    }
  }

  const restorePlace = async (place) => {
    const accepted = await confirmAction(`Khôi phục địa điểm “${place.name}”?`, {
      title: 'Khôi phục địa điểm', confirmLabel: 'Khôi phục',
    })
    if (!accepted) return
    try {
      await destinationPlaceApi.restore(place.id)
      toast.success(`Đã khôi phục “${place.name}”.`)
      await Promise.all([fetchPlaces(pagination.current), fetchProvinces()])
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Không thể khôi phục địa điểm.')
    }
  }

  const forceDeletePlace = async (place) => {
    const accepted = await confirmAction(`Xóa vĩnh viễn “${place.name}”? Hành động này không thể hoàn tác.`, {
      title: 'Xóa vĩnh viễn', confirmLabel: 'Xóa vĩnh viễn', tone: 'danger',
    })
    if (!accepted) return
    try {
      await destinationPlaceApi.forceDelete(place.id)
      toast.success(`Đã xóa vĩnh viễn “${place.name}”.`)
      await fetchPlaces(places.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Không thể xóa vĩnh viễn địa điểm.')
    }
  }

  const openTimeline = async () => {
    setTimelineOpen(true)
    setTimelineLoading(true)

    try {
      const response = await tourApi.getTimeline({ entity_type: 'destination_place' })
      setTimelineActivities(response?.data?.data || [])
    } catch (error) {
      setTimelineActivities([])
      toast.error(error?.response?.data?.message || 'Không tải được lịch sử thao tác địa điểm.')
    } finally {
      setTimelineLoading(false)
    }
  }

  const formatTimelineDate = (value) => value
    ? new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : '-'

  const timelineActions = {
    place_created: { label: 'Tạo địa điểm', dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
    place_updated: { label: 'Cập nhật', dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
    place_deleted: { label: 'Xóa địa điểm', dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700' },
    place_restored: { label: 'Khôi phục', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
    place_force_deleted: { label: 'Xóa vĩnh viễn', dot: 'bg-rose-700', badge: 'bg-rose-100 text-rose-800' },
  }

  const timelineFieldLabels = {
    name: 'Tên địa điểm',
    province: 'Tỉnh / Thành phố',
    district: 'Quận / Huyện',
    address: 'Địa chỉ',
    description: 'Mô tả',
    thumbnail_url: 'Ảnh đại diện',
    status: 'Trạng thái',
    activity_types: 'Loại hoạt động',
  }

  const formatTimelineValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => TOUR_ACTIVITY_TYPE_LABELS[item] || item).join(', ') || '—'
    }
    if (value === null || value === undefined || value === '') return '—'
    if (value === 'active') return 'Đang hoạt động'
    if (value === 'inactive') return 'Tạm ẩn'
    return String(value)
  }

  const getRemainingTrashDays = (deletedAt) => {
    if (!deletedAt) return 30
    const expiresAt = new Date(deletedAt).getTime() + (30 * 24 * 60 * 60 * 1000)
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
  }

  const renderPagination = () => provinceId && !loading && !fetchError ? (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-semibold text-slate-500">
          Trang <span className="font-bold text-slate-800">{pagination.current}</span> · Hiển thị <span className="font-bold text-slate-800">{places.length}</span> / <span className="font-bold text-slate-800">{pagination.total}</span> địa điểm
        </p>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          Số dòng
          <select
            value={perPage}
            onChange={(event) => setPerPage(Number(event.target.value))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            aria-label="Số địa điểm trên mỗi trang"
          >
            {[10, 20, 30].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pagination.current <= 1 || loading}
          onClick={() => void fetchPlaces(pagination.current - 1)}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Trước
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: pagination.last }, (_, index) => index + 1).map((page) => (
            <button
              type="button"
              key={page}
              disabled={loading}
              onClick={() => void fetchPlaces(page)}
              aria-current={page === pagination.current ? 'page' : undefined}
              className={page === pagination.current
                ? 'flex h-9 min-w-9 items-center justify-center rounded-lg bg-sky-600 px-2 text-xs font-extrabold text-white'
                : 'flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 hover:bg-slate-50'}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={pagination.current >= pagination.last || loading}
          onClick={() => void fetchPlaces(pagination.current + 1)}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sau →
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className="min-h-full bg-[#f8fafc] px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Tour', 'Địa điểm theo tỉnh']}
        title="Địa điểm theo tỉnh"
        description="Quản lý danh sách địa điểm và hoạt động du lịch theo từng tỉnh/thành phố."
      />

      {/* Main Responsive Grid Layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Synced Provinces Sidebar */}
        <aside className="lg:col-span-4 xl:col-span-3">
          {/* Mobile Select Bar */}
          <div className="block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs lg:hidden">
            <label htmlFor="mobile-province-select" className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Chọn tỉnh / thành phố <span className="text-rose-500">*</span>
            </label>
            <select
              id="mobile-province-select"
              value={provinceId}
              onChange={(e) => handleSelectProvince(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-3 focus:ring-sky-100"
            >
              <option value="">-- Chọn tỉnh/thành --</option>
              {provinces.map((province) => (
                <option key={province.id} value={province.id}>
                  {province.name} ({province.places_count ?? 0})
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Synced Provinces Sidebar */}
          <div className="hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs lg:block">
            <div className="border-b border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                  Tỉnh / Thành phố
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {provinces.length}
                </span>
              </div>

              {/* Province Search Input */}
              <div className="relative mt-3">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={provinceSearch}
                  onChange={(e) => setProvinceSearch(e.target.value)}
                  placeholder="Tìm tỉnh/thành..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>

            {/* Scrollable Province List */}
            <div className="max-h-[calc(100vh-280px)] min-h-[320px] overflow-y-auto p-2">
              {filteredProvinces.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs font-medium text-slate-400">
                  Không tìm thấy tỉnh/thành phù hợp.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProvinces.map((province) => {
                    const isActive = String(province.id) === String(provinceId)
                    return (
                      <button
                        key={province.id}
                        type="button"
                        onClick={() => handleSelectProvince(province.id)}
                        className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-sky-600 font-bold text-white shadow-sm shadow-sky-200'
                            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate">{province.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors ${
                              isActive
                                ? 'bg-sky-500 text-white border border-sky-400'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                            }`}
                          >
                            {province.places_count ?? 0}
                          </span>
                          <svg
                            className={`h-4 w-4 shrink-0 transition-transform ${
                              isActive ? 'text-white translate-x-0.5' : 'text-slate-300 group-hover:text-slate-500'
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Destination Places Content Workspace */}
        <main className="space-y-5 lg:col-span-8 xl:col-span-9">
          {/* Header Bar */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  {selectedProvince ? selectedProvince.name : 'Chưa chọn tỉnh/thành'}
                </h2>
                {provinceId && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-700 border border-sky-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    Đã chọn
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {selectedProvince
                  ? viewMode === 'trash'
                    ? `Đang có ${pagination.total} địa điểm đã xóa trong tỉnh.`
                    : `Đang có ${pagination.total} địa điểm du lịch khả dụng trong tỉnh.`
                  : 'Vui lòng chọn một tỉnh/thành từ danh sách bên trái để bắt đầu quản lý.'}
              </p>
            </div>

            {/* Main Action Button */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormMode(null)
                  setViewMode((mode) => mode === 'active' ? 'trash' : 'active')
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {viewMode === 'active' ? 'Địa điểm đã xóa' : 'Địa điểm đang dùng'}
              </button>
              {provinceId && viewMode === 'active' ? (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-bold text-white shadow-md shadow-sky-200/60 transition-all hover:bg-sky-700 hover:shadow-sky-300/80 focus-visible:outline-2 focus-visible:outline-sky-600 active:scale-[0.98]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Thêm địa điểm
                </button>
              ) : !provinceId ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-400"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Thêm địa điểm
                </button>
              ) : null}
            </div>
          </div>

          {/* Unified Search & Filter Toolbar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setAppliedSearch(searchValue.trim())}
                  placeholder="Tìm theo tên địa điểm, địa chỉ..."
                  disabled={!provinceId}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-3 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAppliedSearch(searchValue.trim())}
                  disabled={!provinceId}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white shadow-2xs transition-all hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Tìm kiếm
                </button>

                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  disabled={!provinceId}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
                    filterOpen || hasFilter
                      ? 'border-sky-200 bg-sky-50 text-sky-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 21l3.39-.62C9.28 20.72 10.6 21 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
                  </svg>
                  Bộ lọc
                  {hasFilter && (
                    <span className="h-2 w-2 rounded-full bg-sky-600" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void openTimeline()}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700 transition hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" d="M12 7v5l3 2" />
                  </svg>
                  Timeline
                </button>
              </div>
            </div>

            {/* Filter Drawer Section */}
            {filterOpen && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label htmlFor="activity-type-select" className="mb-1.5 block text-xs font-bold text-slate-700">
                      Loại hoạt động
                    </label>
                    <select
                      id="activity-type-select"
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                    >
                      <option value="">Tất cả loại hoạt động</option>
                      {TOUR_ACTIVITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="status-select" className="mb-1.5 block text-xs font-bold text-slate-700">
                      Trạng thái hoạt động
                    </label>
                    <select
                      id="status-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 outline-none focus:border-sky-500 focus:bg-white"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Tạm ẩn</option>
                    </select>
                  </div>

                  <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedActivity(activityFilter)
                        setAppliedStatus(statusFilter)
                      }}
                      className="h-10 flex-1 rounded-xl bg-sky-600 text-xs font-bold text-white shadow-2xs transition hover:bg-sky-700"
                    >
                      Áp dụng
                    </button>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active Filter Chips */}
            {hasFilter && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
                <span className="font-bold text-slate-500">Đang lọc:</span>
                {appliedSearch && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    Từ khóa: &quot;{appliedSearch}&quot;
                    <button
                      type="button"
                      onClick={() => {
                        setSearchValue('')
                        setAppliedSearch('')
                      }}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {appliedActivity && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700">
                    Hoạt động: {TOUR_ACTIVITY_TYPE_LABELS[appliedActivity] || appliedActivity}
                    <button
                      type="button"
                      onClick={() => {
                        setActivityFilter('')
                        setAppliedActivity('')
                      }}
                      className="text-sky-400 hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {appliedStatus && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700">
                    Trạng thái: {appliedStatus === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'}
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('')
                        setAppliedStatus('')
                      }}
                      className="text-sky-400 hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Xóa tất cả
                </button>
              </div>
            )}
          </div>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            {formMode && viewMode === 'active' ? (
              <DestinationPlaceForm
                form={{ ...placeForm, districtsLoading }}
                provinces={provinces}
                districts={districts}
                errors={formErrors}
                saving={formSaving}
                submitLabel={formMode === 'edit' ? 'Lưu thay đổi' : 'Thêm địa điểm'}
                onChange={handlePlaceFormChange}
                onActivityTypesChange={(activityTypes) => setPlaceForm((current) => ({ ...current, activity_types: activityTypes }))}
                onSubmit={submitPlaceForm}
                onCancel={() => setFormMode(null)}
              />
            ) : (
              <div className="space-y-4">
                {viewMode === 'trash' ? (
                  <div className="rounded-xl border border-rose-100 bg-rose-50/70 px-4 py-3">
                    <h2 className="text-base font-black text-slate-900">Địa điểm đã xóa</h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">Dữ liệu trong thùng rác sẽ tự động bị xóa vĩnh viễn sau 30 ngày.</p>
                  </div>
                ) : null}
                {/* PLACES CARD LIST AREA */}
                <div className="max-h-[calc(100vh-390px)] min-h-[260px] space-y-4 overflow-y-auto overscroll-contain pr-2">
            {/* STATE 1: No Province Selected */}
            {!provinceId && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-2xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-black text-slate-900">Vui lòng chọn tỉnh/thành</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-slate-500">
                  Chọn một tỉnh/thành từ danh sách ở phía bên trái (desktop) để xem và quản lý các địa điểm.
                </p>
              </div>
            )}

            {/* STATE 2: Loading Skeleton */}
            {provinceId && loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((key) => (
                  <div
                    key={key}
                    className="flex animate-pulse flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:flex-row sm:items-center"
                  >
                    <div className="h-20 w-20 shrink-0 rounded-xl bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded bg-slate-200" />
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                      <div className="h-3 w-3/4 rounded bg-slate-100" />
                    </div>
                    <div className="flex gap-2 sm:flex-col">
                      <div className="h-9 w-16 rounded-lg bg-slate-200" />
                      <div className="h-9 w-16 rounded-lg bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STATE 3: Fetch Error */}
            {provinceId && !loading && fetchError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-center shadow-2xs">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-bold text-rose-900">{fetchError}</p>
                <button
                  type="button"
                  onClick={() => void fetchPlaces(1)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-rose-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Thử lại
                </button>
              </div>
            )}

            {/* STATE 4: Empty Places */}
            {provinceId && !loading && !fetchError && places.length === 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-2xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-black text-slate-900">Chưa có địa điểm nào</h3>
                {hasFilter && (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Không tìm thấy địa điểm phù hợp với bộ lọc hiện tại.
                  </p>
                )}
                <div className="mt-5 flex justify-center gap-3">
                  {hasFilter ? (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
                    >
                      Xóa bộ lọc
                    </button>
                  ) : viewMode === 'active' ? (
                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-sky-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Thêm địa điểm đầu tiên
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* STATE 5: Render Destination Places Cards */}
            {provinceId && !loading && !fetchError && places.length > 0 && (
              <div className="space-y-3">
                {places.map((place) => (
                  <article
                    key={place.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-sky-300 hover:shadow-md hover:shadow-sky-100/50 sm:flex-row sm:items-center"
                  >
                    {/* Place Info Main Group */}
                    <div className="flex items-start gap-4 flex-1 pr-2">
                      {/* Thumbnail or Avatar Fallback */}
                      {place.thumbnail_url ? (
                        <img
                          src={place.thumbnail_url}
                          alt={place.name}
                          className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover shadow-2xs"
                        />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-sky-50 border border-sky-100 text-2xl font-black text-sky-700 shadow-2xs">
                          {place.name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                      )}

                      {/* Details */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-900 group-hover:text-sky-700 transition-colors truncate">
                            {place.name}
                          </h3>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                            #{place.id}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              viewMode === 'trash'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                : place.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                              viewMode === 'trash' ? 'bg-rose-500' : place.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {viewMode === 'trash' ? 'Đã xóa' : place.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'}
                          </span>
                          {viewMode === 'trash' ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                              {getRemainingTrashDays(place.deleted_at) > 0
                                ? `Còn ${getRemainingTrashDays(place.deleted_at)} ngày`
                                : 'Xóa tự động hôm nay'}
                            </span>
                          ) : null}
                        </div>

                        {/* District & Address */}
                        <p className="flex items-center gap-1 text-xs font-semibold text-slate-500 truncate">
                          <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          <span className="font-bold text-slate-700">{place.district_name || 'Chưa chọn quận/huyện'}</span>
                          {place.address && <span className="truncate">· {place.address}</span>}
                        </p>

                        {/* Description */}
                        {place.description && (
                          <p className="line-clamp-2 text-xs text-slate-600 font-normal">
                            {place.description}
                          </p>
                        )}

                        {/* Activity Tags */}
                        {Array.isArray(place.activity_types) && place.activity_types.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {place.activity_types.map((type) => (
                              <span
                                key={type}
                                className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800 border border-sky-100"
                              >
                                {TOUR_ACTIVITY_TYPE_LABELS[type] || type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Group */}
                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 sm:mt-0 sm:border-0 sm:pt-0 sm:pl-3">
                      {viewMode === 'active' ? <button
                        type="button"
                        onClick={() => openEditForm(place)}
                        title="Chỉnh sửa địa điểm"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-200/80 bg-sky-50 px-3.5 text-xs font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-600 active:scale-95"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Sửa
                      </button> : null}

                      {viewMode === 'active' ? <button
                        type="button"
                        title="Xóa địa điểm"
                        onClick={() => void remove(place)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-rose-600 active:scale-95"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Xóa
                      </button> : (
                        <>
                          <button
                            type="button"
                            onClick={() => void restorePlace(place)}
                            className="inline-flex h-9 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                          >
                            Khôi phục
                          </button>
                          <button
                            type="button"
                            onClick={() => void forceDeletePlace(place)}
                            className="inline-flex h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                          >
                            Xóa vĩnh viễn
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

                </div>

                {renderPagination()}
              </div>
            )}
          </section>
        </main>
      </div>

      {timelineOpen && (
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTimelineOpen(false)
          }}
        >
          <section className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Lịch sử thao tác</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Timeline địa điểm theo tỉnh</h2>
                <p className="mt-1 text-sm text-slate-500">Theo dõi việc tạo, cập nhật và xóa địa điểm.</p>
              </div>
              <button
                type="button"
                onClick={() => setTimelineOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 hover:bg-slate-200"
                aria-label="Đóng timeline"
              >
                ×
              </button>
            </header>

            <div className="overflow-y-auto px-6 py-5">
              {timelineLoading ? (
                <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
                  Đang tải lịch sử thao tác...
                </div>
              ) : timelineActivities.length === 0 ? (
                <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  Chưa có lịch sử thao tác địa điểm.
                </div>
              ) : (
                <ol className="relative ml-2 border-l border-slate-200">
                  {timelineActivities.map((activity) => {
                    const config = timelineActions[activity.action] || {
                      label: activity.action,
                      dot: 'bg-slate-400',
                      badge: 'bg-slate-100 text-slate-700',
                    }

                    return (
                      <li key={activity.id} className="relative pb-6 pl-7 last:pb-0">
                        <span className={`absolute -left-2 top-1.5 h-4 w-4 rounded-full border-4 border-white ${config.dot}`} />
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.badge}`}>{config.label}</span>
                                <span className="text-sm font-semibold text-slate-800">#{activity.metadata?.entity_id || '-'} · {activity.tour_title}</span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p>
                            </div>
                            <time className="whitespace-nowrap text-xs text-slate-400">{formatTimelineDate(activity.created_at)}</time>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-slate-500">Thực hiện bởi: <span className="font-medium text-slate-700">{activity.actor?.name || activity.actor?.email || 'Hệ thống'}</span></p>
                            {(activity.metadata?.data || activity.metadata?.changes) ? (
                              <button
                                type="button"
                                onClick={() => setExpandedTimelineId((id) => id === activity.id ? null : activity.id)}
                                className="text-xs font-bold text-sky-700 hover:underline"
                              >
                                {expandedTimelineId === activity.id ? 'Thu gọn' : 'Xem chi tiết'}
                              </button>
                            ) : null}
                          </div>

                          {expandedTimelineId === activity.id ? (
                            <div className="mt-4 border-t border-slate-200 pt-4">
                              {activity.metadata?.changes && Object.keys(activity.metadata.changes).length > 0 ? (
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                  <div className="grid grid-cols-[minmax(120px,0.7fr)_1fr_1fr] bg-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                    <span>Thông tin</span><span>Trước khi sửa</span><span>Sau khi sửa</span>
                                  </div>
                                  {Object.entries(activity.metadata.changes).map(([field, change]) => (
                                    <div key={field} className="grid grid-cols-[minmax(120px,0.7fr)_1fr_1fr] gap-3 border-t border-slate-100 px-3 py-2.5 text-xs">
                                      <strong className="text-slate-700">{timelineFieldLabels[field] || field}</strong>
                                      <span className="break-words text-rose-600">{formatTimelineValue(change?.from)}</span>
                                      <span className="break-words text-emerald-700">{formatTimelineValue(change?.to)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : activity.metadata?.data ? (
                                <dl className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
                                  {Object.entries(activity.metadata.data).map(([field, value]) => (
                                    <div key={field} className="rounded-lg bg-slate-50 p-2.5">
                                      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{timelineFieldLabels[field] || field}</dt>
                                      <dd className="mt-1 break-words text-xs font-medium text-slate-700">{formatTimelineValue(value)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              ) : null}
                              <p className="mt-3 text-[11px] text-slate-400">Thời điểm chính xác: {formatTimelineDate(activity.created_at)}</p>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default DestinationPlaceManagementPage

