import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import { confirmAction } from '../../../components/common/AppConfirmDialog.jsx'

import { categoryApi } from '../../../services/categoryApi'
import tourApi from '../../../services/toursApi'
import { formatDateDdMmYyyy } from '../../../utils/dateFormat'

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
}

const DEFAULT_STATISTICS = {
  total: 0,
  active: 0,
  inactive: 0,
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

function PlusIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
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

function FolderIcon({ className = 'h-6 w-6' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 4h5l2 3h9v13H4z" />
      <path d="M4 9h16" />
    </svg>
  )
}

function CheckIcon({ className = 'h-6 w-6' }) {
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

function EyeOffIcon({ className = 'h-6 w-6' }) {
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

function StatCard({ icon, title, value, description, tone = 'blue' }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-500',
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md ${
            toneClasses[tone]
          }`}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  )
}

function TourTypeListPage() {
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [perPage, setPerPage] = useState(10)
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION)
  const [statistics, setStatistics] = useState(DEFAULT_STATISTICS)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineActivities, setTimelineActivities] = useState([])
  const [listMode, setListMode] = useState('active')
  const [trashedCategories, setTrashedCategories] = useState([])
  const [trashLoading, setTrashLoading] = useState(false)
  const [trashPage, setTrashPage] = useState(1)
  const [restoringId, setRestoringId] = useState(null)

  const navigate = useNavigate()

  const getDataArray = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data
    if (Array.isArray(response?.data)) return response.data
    return []
  }

  const getPagination = (response) => response?.data?.pagination || DEFAULT_PAGINATION

  const getStatistics = (response) => response?.data?.statistics || DEFAULT_STATISTICS

  const fetchCategories = useCallback(async ({ page = 1 } = {}) => {
    try {
      setLoading(true)
      setError('')

      const response = await categoryApi.getAll({
        page,
        per_page: perPage,
        status: statusFilter,
        search: submittedSearch || undefined,
      })

      setCategories(getDataArray(response))
      setPagination(getPagination(response))
      setStatistics(getStatistics(response))
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Không thể tải danh sách loại tour')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, submittedSearch, perPage])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCategories()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchCategories])

  useEffect(() => {
    if (!message && !error) return

    const timer = setTimeout(() => {
      setMessage('')
      setError('')
    }, 5000)

    return () => clearTimeout(timer)
  }, [message, error])

  const handleSearch = (event) => {
    event.preventDefault()

    const keyword = searchTerm.trim()

    setMessage('')
    setError('')
    setSubmittedSearch(keyword)
  }

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value)
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.last_page || page === pagination.current_page) {
      return
    }

    void fetchCategories({ page })
  }

  const handlePerPageChange = (event) => {
    setPerPage(Number(event.target.value))
    setTrashPage(1)
  }

  const fetchTrashedCategories = useCallback(async () => {
    try {
      setTrashLoading(true)
      setError('')
      const response = await categoryApi.getTrashed()
      setTrashedCategories(getDataArray(response))
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Không thể tải danh sách danh mục đã xóa')
    } finally {
      setTrashLoading(false)
    }
  }, [])

  const openTrashList = () => {
    setListMode('trash')
    setTrashPage(1)
    void fetchTrashedCategories()
  }

  const handleRestore = async (category) => {
    const confirmed = await confirmAction(
      `Bạn có chắc muốn khôi phục danh mục "${category.name}" không?`,
      { title: 'Khôi phục danh mục tour', confirmLabel: 'Khôi phục' },
    )
    if (!confirmed) return

    try {
      setRestoringId(category.id)
      setMessage('')
      setError('')
      const response = await categoryApi.restore(category.id)
      setMessage(response?.data?.message || 'Khôi phục danh mục tour thành công')
      await Promise.all([fetchTrashedCategories(), fetchCategories()])
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Khôi phục danh mục tour thất bại')
    } finally {
      setRestoringId(null)
    }
  }

  const openDeleteModal = (category) => {
    setDeleteTarget(category)
  }

  const closeDeleteModal = () => {
    if (deleting) return
    setDeleteTarget(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      setMessage('')
      setError('')

      await categoryApi.remove(deleteTarget.id)
      setMessage('Xóa loại tour thành công')
      setDeleteTarget(null)
      await fetchCategories({ page: pagination.current_page })
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Xóa loại tour thất bại')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (category) => {
    navigate(`/admin/categories/${category.id}/edit`, {
      state: { category },
    })
  }

  const openTimeline = async () => {
    setIsTimelineOpen(true)
    setTimelineLoading(true)

    try {
      const response = await tourApi.getTimeline({ entity_type: 'category' })
      setTimelineActivities(response.data?.data || [])
    } catch (err) {
      console.error(err)
      setTimelineActivities([])
      setError(err.response?.data?.message || 'Không thể tải lịch sử thao tác danh mục tour')
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
    category_created: { label: 'Tạo danh mục', color: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
    category_updated: { label: 'Cập nhật', color: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
    category_deleted: { label: 'Xóa danh mục', color: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700' },
    category_restored: { label: 'Khôi phục', color: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  }

  const isTrashMode = listMode === 'trash'
  const trashLastPage = Math.max(1, Math.ceil(trashedCategories.length / perPage))
  const currentPage = isTrashMode ? Math.min(trashPage, trashLastPage) : pagination.current_page
  const lastPage = isTrashMode ? trashLastPage : pagination.last_page
  const totalItems = isTrashMode ? trashedCategories.length : pagination.total
  const visibleCategories = isTrashMode
    ? trashedCategories.slice((currentPage - 1) * perPage, currentPage * perPage)
    : categories
  const listLoading = isTrashMode ? trashLoading : loading

  const changeVisiblePage = (page) => {
    if (page < 1 || page > lastPage || page === currentPage) return
    if (isTrashMode) {
      setTrashPage(page)
    } else {
      handlePageChange(page)
    }
  }

  const renderListControls = () => (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        Số dòng
        <select
          value={perPage}
          onChange={handlePerPageChange}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          aria-label="Số danh mục trên mỗi trang"
        >
          {[10, 20, 30].map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1 || listLoading}
          onClick={() => changeVisiblePage(currentPage - 1)}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Trước
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: lastPage }, (_, index) => index + 1).map((page) => (
            <button
              type="button"
              key={page}
              disabled={listLoading}
              onClick={() => changeVisiblePage(page)}
              aria-current={page === currentPage ? 'page' : undefined}
              className={page === currentPage
                ? 'flex h-9 min-w-9 items-center justify-center rounded-lg bg-sky-600 px-2 text-xs font-extrabold text-white'
                : 'flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 hover:bg-slate-50'}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={currentPage >= lastPage || listLoading}
          onClick={() => changeVisiblePage(currentPage + 1)}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sau →
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-full bg-slate-50/70 px-8 py-8">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Tour', 'Danh mục tour']}
        title="Quản Lý Danh Mục Tour"
        description="Quản lý danh mục tour du lịch, tìm kiếm nhanh, chỉnh sửa thông tin và khôi phục các danh mục tour đã xóa mềm."
        actions={
          <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
            <button
              type="button"
              onClick={isTrashMode ? () => setListMode('active') : openTrashList}
              className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            >
              <TrashIcon className="h-4 w-4 text-amber-600" />
              {isTrashMode ? 'Danh sách quản lý' : 'Đã xóa'}
            </button>

            <Link
              to="/admin/categories/create"
              className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-sky-500 px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.25)] transition hover:bg-sky-600"
            >
              <PlusIcon className="h-4 w-4" />
              Thêm danh mục tour
            </Link>
          </div>
        }
      />

      <div className="mb-7 grid gap-5 md:grid-cols-3">
        <StatCard
          icon={<FolderIcon />}
          title="Tổng danh mục tour"
          value={statistics.total}
          description="Tất cả danh mục tour trong hệ thống"
          tone="blue"
        />

        <StatCard
          icon={<CheckIcon />}
          title="Đang hoạt động"
          value={statistics.active}
          description="Danh mục tour đang hiển thị"
          tone="green"
        />

        <StatCard
          icon={<EyeOffIcon />}
          title="Tạm ẩn"
          value={statistics.inactive}
          description="Danh mục tour đang tạm ẩn"
          tone="orange"
        />
      </div>

      <div className="mb-7 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Tìm kiếm theo tên danh mục tour..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm font-normal text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-3 focus:ring-sky-50"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
            >
              <SearchIcon className="h-4 w-4" />
              Tìm kiếm
            </button>

            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400 focus:ring-3 focus:ring-sky-50"
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm ẩn</option>
            </select>

            <button
              type="button"
              onClick={openTimeline}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:border-sky-200 hover:bg-sky-100"
            >
              <TimelineIcon className="h-4 w-4" />
              Timeline
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isTrashMode ? 'Danh sách danh mục đã xóa' : 'Danh sách danh mục tour'}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Trang <span className="font-bold text-slate-800">{currentPage}</span>
                {' · '}Hiển thị <span className="font-bold text-slate-800">{visibleCategories.length}</span>
                {' / '}<span className="font-bold text-slate-800">{totalItems}</span> danh mục
              </p>
            </div>
            {renderListControls()}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-[80px] px-5 py-4">STT</th>
                  <th className="min-w-[220px] px-5 py-4">Tên loại tour</th>
                  <th className="min-w-[300px] px-5 py-4">Mô tả</th>
                  {isTrashMode ? (
                    <th className="min-w-[150px] px-5 py-4">Ngày xóa</th>
                  ) : (
                    <>
                      <th className="min-w-[110px] px-5 py-4">Số tour</th>
                      <th className="min-w-[150px] px-5 py-4">Trạng thái</th>
                    </>
                  )}
                  <th className="min-w-[170px] px-5 py-4 text-center">Hành động</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {listLoading ? (
                  <tr>
                    <td colSpan={isTrashMode ? 5 : 6} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                        <p className="text-sm font-medium text-slate-500">
                          Đang tải danh sách loại tour...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : visibleCategories.length === 0 ? (
                  <tr>
                    <td colSpan={isTrashMode ? 5 : 6} className="px-5 py-16 text-center">
                      <div className="mx-auto max-w-sm rounded-md bg-slate-50 px-6 py-8">
                        <p className="text-lg font-semibold text-slate-800">
                          Không có dữ liệu
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {isTrashMode ? 'Không có danh mục tour nào đã xóa.' : 'Chưa tìm thấy loại tour phù hợp.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : isTrashMode ? (
                  visibleCategories.map((category, index) => (
                    <tr key={category.id} className="bg-white transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {(currentPage - 1) * perPage + index + 1}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">{category.name || '-'}</td>
                      <td className="px-5 py-4 text-slate-600">{category.description || '-'}</td>
                      <td className="px-5 py-4 text-slate-500">{formatDateDdMmYyyy(category.deleted_at, '-')}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRestore(category)}
                          disabled={restoringId === category.id}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {restoringId === category.id ? 'Đang khôi phục...' : 'Khôi phục'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  visibleCategories.map((category, index) => (
                    <tr key={category.id} className="bg-white transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {(pagination.current_page - 1) * pagination.per_page + index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {category.thumbnail_url ? (
                              <img
                                src={category.thumbnail_url}
                                alt={category.thumbnail_alt_text || category.name || 'Ảnh loại tour'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                Chưa có ảnh
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {category.name || category.title || '-'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {category.thumbnail_alt_text || 'Chưa có mô tả ảnh'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[360px] leading-6 text-slate-600">
                          {category.description || category.desc || '-'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-700">
                          {category.tours_count ?? 0}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {category.status ? (
                          <span
                            className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold ${
                              category.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-orange-50 text-orange-600'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                category.status === 'active'
                                  ? 'bg-emerald-500'
                                  : 'bg-orange-500'
                              }`}
                            />
                            {category.status === 'active' ? 'Hoạt động' : 'Tạm ẩn'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(category)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-300 bg-white px-4 text-sm font-medium text-blue-600 transition hover:border-blue-500 hover:bg-blue-50"
                          >
                            <EditIcon />
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(category)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-4 text-sm font-medium text-red-600 transition hover:border-red-500 hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Trang <span className="font-bold text-slate-800">{currentPage}</span>
              {' · '}Hiển thị <span className="font-bold text-slate-800">{visibleCategories.length}</span>
              {' / '}<span className="font-bold text-slate-800">{totalItems}</span> danh mục
            </p>
            {renderListControls()}
          </div>
        </div>

        {(message || error) && (
          <div className="fixed right-6 top-6 z-50 w-full max-w-sm">
            <div
              className={`rounded-xl border bg-white p-4 shadow-2xl ${
                message ? 'border-emerald-100' : 'border-red-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    message ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {message ? <CheckIcon className="h-5 w-5" /> : <TrashIcon className="h-5 w-5" />}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {message ? 'Thành công' : 'Có lỗi xảy ra'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {message || error}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMessage('')
                    setError('')
                  }}
                  className="rounded-md px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Đóng thông báo"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

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
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Lịch sử thao tác</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">Timeline danh mục tour</h2>
                  <p className="mt-1 text-sm text-slate-500">Theo dõi các thao tác quản lý danh mục tour gần nhất.</p>
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
                    <p className="mt-1 text-xs text-slate-500">Các thao tác danh mục mới sẽ được ghi lại tại đây.</p>
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
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.badge}`}>{config.label}</span>
                                  <span className="text-sm font-semibold text-slate-800">
                                    Danh mục #{activity.metadata?.entity_id || '-'} · {activity.tour_title}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{activity.description}</p>
                              </div>
                              <time className="whitespace-nowrap text-xs text-slate-400">{formatTimelineDate(activity.created_at)}</time>
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
                <button type="button" onClick={() => setIsTimelineOpen(false)} className="h-10 rounded-lg bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-600">
                  Đóng
                </button>
              </footer>
            </section>
          </div>
        )}

        {deleteTarget && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
            onClick={closeDeleteModal}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <TrashIcon className="h-7 w-7" />
              </div>

              <div className="mt-5 text-center">
                <h2 className="text-xl font-bold text-slate-950">
                  Xóa loại tour này?
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Bạn có chắc muốn xóa loại tour{' '}
                  <span className="font-semibold text-slate-900">
                    {deleteTarget.name || deleteTarget.title || 'này'}
                  </span>
                  ? Dữ liệu sẽ được chuyển vào mục đã xóa.
                </p>

                {Number(deleteTarget.tours_count) > 0 ? (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-left text-sm font-semibold leading-6 text-amber-700">
                    Loại tour này đang được sử dụng bởi {deleteTarget.tours_count} tour và không thể xóa.
                  </p>
                ) : null}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="h-11 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || Number(deleteTarget.tours_count) > 0}
                  className="h-11 rounded-lg bg-red-600 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default TourTypeListPage
