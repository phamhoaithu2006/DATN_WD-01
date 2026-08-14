import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import tourApi from '../../../services/toursApi'

const getRequestErrorMessage = (error, fallback) => {
  const status = error?.response?.status

  if (status === 401) {
    return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  }

  if (status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.'
  }

  return error?.response?.data?.message || fallback
}

function SearchIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
function EyeIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function FilterIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  )
}

function RefreshIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 16h6v6" />
      <path d="M3 12A9 9 0 0 1 18.5 5.7L21 8" />
      <path d="M21 8h-6V2" />
    </svg>
  )
}

function TimelineIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function EyeOffIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12a20.29 20.29 0 0 1 5.06-6.06" />
      <path d="M9.9 4.24A10.8 10.8 0 0 1 12 4c5 0 9.27 3.11 11 8a20.65 20.65 0 0 1-2.87 4.19" />
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
      <path d="M1 1l22 22" />
    </svg>
  )
}

function EditIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function TagIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20.59 13.41 12 22l-8.59-8.59A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.41.59l7.18 7.18a2 2 0 0 1 0 2.82Z" />
      <path d="M7 7h.01" />
    </svg>
  )
}

function MapPinIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function CheckIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  )
}

const TOUR_STATUS_CONFIG = {
  published: {
    label: 'Đang mở',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  draft: {
    label: 'Bản nháp',
    badgeClass: 'bg-amber-50 text-amber-700',
    dotClass: 'bg-amber-500',
  },
  hidden: {
    label: 'Tạm ẩn',
    badgeClass: 'bg-slate-100 text-slate-600',
    dotClass: 'bg-slate-400',
  },
}

const getTourStatusConfig = (status) => {
  const value = String(status || '').trim().toLowerCase()

  return (
    TOUR_STATUS_CONFIG[value] || {
      label: status ? String(status) : '-',
      badgeClass: 'bg-slate-100 text-slate-600',
      dotClass: 'bg-slate-400',
    }
  )
}

function TourListPage() {
  const [tours, setTours] = useState([])
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [toast, setToast] = useState(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineActivities, setTimelineActivities] = useState([])
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    destination: '',
    duration: '',
  })
  const [appliedFilters, setAppliedFilters] = useState({
    status: '',
    category: '',
    destination: '',
    duration: '',
  })

  const getData = (res) => {
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    if (Array.isArray(res?.tours)) return res.tours
    if (Array.isArray(res?.data?.data)) return res.data.data
    return []
  }

  const fetchTours = useCallback(async (page = 1) => {
    try {
      setLoading(true)

      const response = await tourApi.getAll({
        page,
        per_page: 10,
        search: keyword || undefined,
        ...Object.fromEntries(
          Object.entries(appliedFilters).filter(([, value]) => value),
        ),
      })
      const paginator = response.data?.data || {}
      const data = getData(response.data)

      console.log('TOURS API:', data)

      setTours(data)
      setPagination({
        currentPage: Number(paginator.current_page || 1),
        lastPage: Number(paginator.last_page || 1),
        total: Number(paginator.total || data.length),
      })
    } catch (e) {
      console.error('GET TOURS ERROR:', e)
      setTours([])
      setToast({
        type: 'error',
        message: getRequestErrorMessage(e, 'Không tải được danh sách tour.'),
      })
    } finally {
      setLoading(false)
    }
  }, [keyword, appliedFilters])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchTours()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchTours])

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      setToast(null)
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast])

  const handleSearch = () => {
    setKeyword(searchValue.trim())
  }

  const openTimeline = async () => {
    setIsTimelineOpen(true)
    setTimelineLoading(true)

    try {
      const response = await tourApi.getTimeline()
      setTimelineActivities(response.data?.data || [])
    } catch (error) {
      setTimelineActivities([])
      setToast({
        type: 'error',
        message: getRequestErrorMessage(error, 'Không tải được lịch sử thao tác tour.'),
      })
    } finally {
      setTimelineLoading(false)
    }
  }

  const formatTimelineDate = (value) => {
    if (!value) return '-'

    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  }

  const timelineActionConfig = {
    created: { label: 'Tạo tour', color: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
    updated: { label: 'Cập nhật', color: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
    hidden: { label: 'Ẩn tour', color: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
    published: { label: 'Hiển thị lại', color: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
    deleted: { label: 'Xóa tour', color: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700' },
    category_created: { label: 'Tạo loại tour', color: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
    category_updated: { label: 'Sửa loại tour', color: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
    category_deleted: { label: 'Xóa loại tour', color: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700' },
    category_restored: { label: 'Khôi phục loại tour', color: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
    destination_created: { label: 'Tạo địa chỉ tour', color: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
    destination_updated: { label: 'Sửa địa chỉ tour', color: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
    destination_deleted: { label: 'Xóa địa chỉ tour', color: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700' },
    destination_restored: { label: 'Khôi phục địa chỉ', color: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
    destination_force_deleted: { label: 'Xóa vĩnh viễn địa chỉ', color: 'bg-rose-700', badge: 'bg-rose-100 text-rose-800' },
    place_created: { label: 'Tạo điểm đến chi tiết', color: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
    place_updated: { label: 'Sửa điểm đến chi tiết', color: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
    place_deleted: { label: 'Xóa điểm đến chi tiết', color: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700' },
  }

  const timelineEntityLabels = {
    tour: 'Tour',
    category: 'Loại tour',
    destination: 'Địa chỉ tour',
    destination_place: 'Điểm đến chi tiết',
  }

  const openActionModal = (type, tour) => {
    setToast(null)
    setPendingAction({ type, tour })
  }

  const closeActionModal = () => {
    if (actionLoading) return
    setPendingAction(null)
  }

  const handleAction = async () => {
    if (!pendingAction?.tour) return

    const { type, tour } = pendingAction
    const id = tour.id
    const isHideAction = type === 'hide'
    const loadingKey = `${type}-${id}`

    try {
      setActionLoading(loadingKey)

      if (isHideAction) {
        await tourApi.hide(id)
      } else {
        await tourApi.delete(id)
      }

      setTours((prev) => prev.filter((item) => item.id !== id))

      setToast({
        type: 'success',
        message: isHideAction ? 'Ẩn tour thành công' : 'Xóa tour thành công',
      })

      setPendingAction(null)
    } catch (e) {
      console.error(isHideAction ? 'HIDE TOUR ERROR:' : 'DELETE TOUR ERROR:', e)

      setToast({
        type: 'error',
        message:
          e.response?.data?.message ||
          (isHideAction ? 'Ẩn tour thất bại' : 'Xóa tour thất bại'),
      })
    } finally {
      setActionLoading(null)
    }
  }

  const formatTourTitle = (value = '') => {
    return value
      .trim()
      .split(/\s+/)
      .map((word) => {
        if (!word) return ''

        return (
          word.charAt(0).toLocaleUpperCase('vi-VN') +
          word.slice(1).toLocaleLowerCase('vi-VN')
        )
      })
      .join(' ')
  }

  const API_ORIGIN = 'http://127.0.0.1:8000'

  const normalizeImageUrl = (url) => {
    if (!url) return ''

    const value = String(url).trim()

    if (!value) return ''

    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value
    }

    if (value.startsWith('/storage')) {
      return `${API_ORIGIN}${value}`
    }

    if (value.startsWith('storage')) {
      return `${API_ORIGIN}/${value}`
    }

    if (value.startsWith('/uploads')) {
      return `${API_ORIGIN}${value}`
    }

    if (value.startsWith('uploads')) {
      return `${API_ORIGIN}/${value}`
    }

    return value
  }

  const getTourThumbnail = (tour) => {
    const thumbnailFromImages =
      tour.images?.find((image) => Number(image.is_thumbnail) === 1)?.image_url ||
      tour.tour_images?.find((image) => Number(image.is_thumbnail) === 1)?.image_url

    const imageUrl =
      tour.thumbnail_url ||
      tour.thumbnail?.image_url ||
      tour.image_url ||
      thumbnailFromImages ||
      tour.images?.[0]?.image_url ||
      tour.tour_images?.[0]?.image_url ||
      ''

    return normalizeImageUrl(imageUrl)
  }

  const getCategoryName = (tour) => {
    if (tour.category_name) return tour.category_name
    if (tour.category_info?.name) return tour.category_info.name
    if (typeof tour.category === 'string') return tour.category
    if (tour.category?.name) return tour.category.name

    return '-'
  }

  const getDestinationName = (tour) => {
    if (tour.destination_name) return tour.destination_name
    if (tour.destination_info?.name) return tour.destination_info.name
    if (typeof tour.destination === 'string') return tour.destination
    if (tour.destination?.name) return tour.destination.name

    return '-'
  }

  const categoryOptions = useMemo(() => {
    return [...new Set(tours.map(getCategoryName).filter((value) => value && value !== '-'))]
      .sort((a, b) => a.localeCompare(b, 'vi'))
  }, [tours])

  const destinationOptions = useMemo(() => {
    return [...new Set(tours.map(getDestinationName).filter((value) => value && value !== '-'))]
      .sort((a, b) => a.localeCompare(b, 'vi'))
  }, [tours])

  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length

  const handleApplyFilters = () => {
    setAppliedFilters(filters)
    setIsFilterOpen(false)
  }

  const handleResetFilters = () => {
    const emptyFilters = {
      status: '',
      category: '',
      destination: '',
      duration: '',
    }

    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }

  const filtered = tours

  return (
    <div className="min-h-full bg-slate-50/70 px-8 py-8">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Tour']}
        title="Quản Lý Tour"
        description="Quản lý danh sách tour, loại tour, điểm đến và trạng thái hiển thị."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/categories"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              <TagIcon className="h-4 w-4 text-sky-600" />
              Loại tour
            </Link>

            <Link
              to="/admin/destination-places"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <MapPinIcon className="h-4 w-4 text-indigo-600" />
              Địa điểm trong tỉnh
            </Link>

            <Link
              to="/admin/tours/hidden"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            >
              <EyeOffIcon className="h-4 w-4 text-amber-600" />
              Tour đã ẩn
            </Link>

            <Link
              to="/admin/tours/create"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.25)] transition hover:bg-sky-600"
            >
              <span className="text-lg leading-none">+</span>
              Thêm tour
            </Link>
          </div>
        }
      />

      <div className="mb-7 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm font-normal text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-3 focus:ring-sky-50"
              placeholder="Tìm kiếm theo tên tour, điểm đến..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-500 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600"
          >
            <SearchIcon className="h-4 w-4" />
            Tìm kiếm
          </button>

          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-expanded={isFilterOpen}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-4 text-sm font-medium text-violet-700 transition hover:border-violet-200 hover:bg-violet-100"
          >
            <FilterIcon className="h-4 w-4" />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={openTimeline}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:border-sky-200 hover:bg-sky-100"
          >
            <TimelineIcon className="h-4 w-4" />
            Timeline
          </button>
        </div>

        {isFilterOpen && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Trạng thái
                </span>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-50"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="published">Đang mở</option>
                  <option value="draft">Bản nháp</option>
                  <option value="hidden">Tạm ẩn</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Danh mục
                </span>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-50"
                >
                  <option value="">Tất cả danh mục</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Điểm đến
                </span>
                <select
                  value={filters.destination}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, destination: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-50"
                >
                  <option value="">Tất cả điểm đến</option>
                  {destinationOptions.map((destination) => (
                    <option key={destination} value={destination}>
                      {destination}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Thời lượng
                </span>
                <select
                  value={filters.duration}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, duration: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-50"
                >
                  <option value="">Tất cả thời lượng</option>
                  <option value="1-2">1 - 2 ngày</option>
                  <option value="3-5">3 - 5 ngày</option>
                  <option value="6+">Từ 6 ngày</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Xóa bộ lọc
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="h-10 rounded-lg bg-violet-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
              >
                Áp dụng
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">
              Danh sách tour
            </h2>

            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600">
              {pagination.total} tour
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchTours(pagination.currentPage)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-600 transition hover:border-sky-200 hover:bg-sky-100"
            title="Tải lại dữ liệu"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Hình ảnh</th>
                <th className="px-5 py-3">Tên</th>
                <th className="px-5 py-3">Danh mục</th>
                <th className="px-5 py-3">Điểm đến</th>
                <th className="px-5 py-3">Thời gian</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
                      <p className="text-sm font-normal text-slate-500">
                        Đang tải danh sách tour...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-14 text-center">
                    <div className="mx-auto max-w-sm rounded-xl bg-slate-50 px-6 py-8">
                      <p className="text-base font-medium text-slate-700">
                        Không có dữ liệu
                      </p>
                      <p className="mt-1 text-sm font-normal text-slate-500">
                        Chưa tìm thấy tour phù hợp với từ khóa hoặc bộ lọc hiện tại.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((tour) => {
                  const thumbnailUrl = getTourThumbnail(tour)
                  const statusConfig = getTourStatusConfig(tour.status)

                  return (
                    <tr
                      key={tour.id}
                      className="transition hover:bg-sky-50/40"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-600">
                        #{tour.id}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 min-w-[240px]">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={tour.title || 'Ảnh tour'}
                            className="h-24 w-56 rounded-xl border border-slate-100 object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-24 w-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
                            Chưa có ảnh
                          </div>
                        )}
                      </td>

                      <td className="min-w-[300px] px-5 py-4">
                        <div className="max-w-[320px]">
                          <p className="line-clamp-1 text-[14px] font-medium leading-6 text-slate-800">
                            {formatTourTitle(tour.title)}
                          </p>

                          {tour.summary ? (
                            <p className="mt-1 line-clamp-1 text-[13px] font-normal leading-5 text-slate-500">
                              {tour.summary}
                            </p>
                          ) : (
                            <p className="mt-1 text-[13px] font-normal leading-5 text-slate-400">
                              Chưa có mô tả ngắn
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-normal text-slate-600">
                        {getCategoryName(tour)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-normal text-slate-600">
                        {getDestinationName(tour)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-normal text-slate-600">
                        {tour.duration_days || 0}N /{' '}
                        {tour.duration_nights || 0}Đ
                      </td>



                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusConfig.badgeClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`}
                          />
                          {statusConfig.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/admin/tours/${tour.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                            title="Xem chi tiết tour"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>

                          <Link
                            to={`/admin/tours/${tour.id}/edit`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition hover:bg-sky-100"
                            title="Sửa tour"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => openActionModal('hide', tour)}
                            disabled={actionLoading === `hide-${tour.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Ẩn tour"
                          >
                            <EyeOffIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openActionModal('delete', tour)}
                            disabled={actionLoading === `delete-${tour.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Xóa tour"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && pagination.lastPage > 1 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-500">
              Trang {pagination.currentPage} / {pagination.lastPage} · {pagination.total} tour
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.currentPage <= 1}
                onClick={() => fetchTours(pagination.currentPage - 1)}
                className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>
              {Array.from({ length: pagination.lastPage }, (_, index) => index + 1)
                .filter((page) => Math.abs(page - pagination.currentPage) <= 2)
                .map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => fetchTours(page)}
                    className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${page === pagination.currentPage ? 'bg-sky-500 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {page}
                  </button>
                ))}
              <button
                type="button"
                disabled={pagination.currentPage >= pagination.lastPage}
                onClick={() => fetchTours(pagination.currentPage + 1)}
                className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {isTimelineOpen && (
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsTimelineOpen(false)
          }}
        >
          <section className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">
                  Lịch sử thao tác
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Timeline quản lý tour
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Theo dõi thao tác Tour, Loại tour, Địa chỉ tour và Điểm đến chi tiết.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsTimelineOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Đóng timeline"
              >
                ×
              </button>
            </header>

            <div className="overflow-y-auto px-6 py-5">
              {timelineLoading ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
                  Đang tải lịch sử thao tác...
                </div>
              ) : timelineActivities.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <TimelineIcon className="h-9 w-9 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">Chưa có lịch sử thao tác</p>
                  <p className="mt-1 text-xs text-slate-500">Các thao tác tour mới sẽ được ghi lại tại đây.</p>
                </div>
              ) : (
                <ol className="relative ml-2 border-l border-slate-200">
                  {timelineActivities.map((activity) => {
                    const config = timelineActionConfig[activity.action] || {
                      label: activity.action,
                      color: 'bg-slate-400',
                      badge: 'bg-slate-100 text-slate-700',
                    }

                    return (
                      <li key={activity.id} className="relative pb-6 pl-7 last:pb-0">
                        <span className={`absolute -left-2 top-1.5 h-4 w-4 rounded-full border-4 border-white ${config.color}`} />
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.badge}`}>
                                  {config.label}
                                </span>
                                <span className="text-sm font-semibold text-slate-800">
                                  {timelineEntityLabels[activity.metadata?.entity_type] || 'Tour'} #{activity.metadata?.entity_id || activity.tour_id || '-'} · {activity.tour_title}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {activity.description}
                              </p>
                            </div>
                            <time className="whitespace-nowrap text-xs text-slate-400">
                              {formatTimelineDate(activity.created_at)}
                            </time>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            Thực hiện bởi: <span className="font-medium text-slate-700">{activity.actor?.name || activity.actor?.email || 'Hệ thống'}</span>
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>

            <footer className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsTimelineOpen(false)}
                className="h-10 rounded-lg bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                Đóng
              </button>
            </footer>
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed right-6 top-6 z-50 w-full max-w-sm">
          <div
            className={`rounded-2xl border bg-white p-4 shadow-xl ${toast.type === 'success' ? 'border-emerald-100' : 'border-rose-100'
              }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toast.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                  }`}
              >
                {toast.type === 'success' ? (
                  <CheckIcon className="h-5 w-5" />
                ) : (
                  <TrashIcon className="h-5 w-5" />
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">
                  {toast.type === 'success' ? 'Thành công' : 'Có lỗi xảy ra'}
                </p>
                <p className="mt-1 text-sm font-normal leading-6 text-slate-500">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setToast(null)}
                className="rounded-md px-2 py-1 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Đóng thông báo"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="fixed right-6 top-6 z-50 w-full max-w-sm">
          <div
            className={`rounded-2xl border bg-white p-4 shadow-xl ${pendingAction.type === 'hide'
                ? 'border-amber-100'
                : 'border-rose-100'
              }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${pendingAction.type === 'hide'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-rose-50 text-rose-600'
                  }`}
              >
                {pendingAction.type === 'hide' ? (
                  <EyeOffIcon className="h-5 w-5" />
                ) : (
                  <TrashIcon className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {pendingAction.type === 'hide'
                        ? 'Xác nhận ẩn tour'
                        : 'Xác nhận xóa tour'}
                    </p>

                    <p className="mt-1 text-sm font-normal leading-6 text-slate-500">
                      Bạn có chắc muốn {pendingAction.type === 'hide' ? 'ẩn' : 'xóa'} tour{' '}
                      <span className="font-medium text-slate-700">
                        {formatTourTitle(pendingAction.tour?.title || '') ||
                          `#${pendingAction.tour?.id}`}
                      </span>{' '}
                      không?
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeActionModal}
                    disabled={Boolean(actionLoading)}
                    className="rounded-md px-2 py-1 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Đóng xác nhận"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={closeActionModal}
                    disabled={Boolean(actionLoading)}
                    className="h-9 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Hủy
                  </button>

                  <button
                    type="button"
                    onClick={handleAction}
                    disabled={Boolean(actionLoading)}
                    className={`h-9 rounded-lg text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${pendingAction.type === 'hide'
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-rose-500 hover:bg-rose-600'
                      }`}
                  >
                    {actionLoading
                      ? pendingAction.type === 'hide'
                        ? 'Đang ẩn...'
                        : 'Đang xóa...'
                      : pendingAction.type === 'hide'
                        ? 'Ẩn tour'
                        : 'Xóa tour'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TourListPage
