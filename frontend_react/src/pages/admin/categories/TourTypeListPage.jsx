import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'

import { categoryApi } from '../../../services/categoryApi'

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
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION)
  const [statistics, setStatistics] = useState(DEFAULT_STATISTICS)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

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
        per_page: DEFAULT_PAGINATION.per_page,
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
  }, [statusFilter, submittedSearch])

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

  const handleRefresh = () => {
    setSearchTerm('')
    setSubmittedSearch('')
    setStatusFilter('all')
  }

  return (
    <div className="min-h-full bg-slate-50/70 px-8 py-8">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Tour', 'Loại Tour']}
        title="Quản Lý Loại Tour"
        description="Quản lý nhóm tour du lịch, tìm kiếm nhanh, chỉnh sửa thông tin và khôi phục các loại tour đã xóa mềm."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/tours"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              <span className="text-lg leading-none">←</span>
              Quay lại danh sách tour
            </Link>

            <Link
              to="/admin/categories/trash"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            >
              <TrashIcon className="h-4 w-4 text-amber-600" />
              Đã xóa
            </Link>

            <Link
              to="/admin/categories/create"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.25)] transition hover:bg-sky-600"
            >
              <PlusIcon className="h-4 w-4" />
              Thêm loại tour
            </Link>
          </div>
        }
      />

      <div className="mb-7 grid gap-5 md:grid-cols-3">
        <StatCard
          icon={<FolderIcon />}
          title="Tổng loại tour"
          value={statistics.total}
          description="Tất cả loại tour trong hệ thống"
          tone="blue"
        />

        <StatCard
          icon={<CheckIcon />}
          title="Đang hoạt động"
          value={statistics.active}
          description="Loại tour đang hiển thị"
          tone="green"
        />

        <StatCard
          icon={<EyeOffIcon />}
          title="Tạm ẩn"
          value={statistics.inactive}
          description="Loại tour đang tạm ẩn"
          tone="orange"
        />
      </div>

      <div className="mb-7 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Tìm kiếm theo tên loại tour..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm font-normal text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-3 focus:ring-sky-50"
            />
          </div>

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

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
            >
              <SearchIcon className="h-4 w-4" />
              Tìm kiếm
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshIcon className="h-4 w-4 text-slate-500" />
              Làm mới
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-[80px] px-5 py-4">STT</th>
                  <th className="min-w-[220px] px-5 py-4">Tên loại tour</th>
                  <th className="min-w-[180px] px-5 py-4">Slug</th>
                  <th className="min-w-[300px] px-5 py-4">Mô tả</th>
                  <th className="min-w-[110px] px-5 py-4">Số tour</th>
                  <th className="min-w-[150px] px-5 py-4">Trạng thái</th>
                  <th className="min-w-[170px] px-5 py-4 text-center">Hành động</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                        <p className="text-sm font-medium text-slate-500">
                          Đang tải danh sách loại tour...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-16 text-center">
                      <div className="mx-auto max-w-sm rounded-md bg-slate-50 px-6 py-8">
                        <p className="text-lg font-semibold text-slate-800">
                          Không có dữ liệu
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Chưa tìm thấy loại tour phù hợp.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  categories.map((category, index) => (
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

                      <td className="px-5 py-4 text-slate-500">
                        {category.slug || '-'}
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
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-100 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            Hiển thị {categories.length > 0 ? (pagination.current_page - 1) * pagination.per_page + 1 : 0}
            {' - '}
            {Math.min(
              pagination.current_page * pagination.per_page,
              pagination.total,
            )}{' '}
            trong tổng số {pagination.total} loại tour
          </p>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={loading || pagination.current_page <= 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trước
            </button>

            <span className="font-semibold text-slate-700">
              Trang {pagination.current_page}/{pagination.last_page}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={loading || pagination.current_page >= pagination.last_page}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
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
