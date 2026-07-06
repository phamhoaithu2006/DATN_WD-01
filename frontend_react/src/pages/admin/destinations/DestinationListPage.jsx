import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { destinationApi } from '../../../services/destinationApi'

function SearchIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function PlusIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function RefreshIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 16h6v6" />
      <path d="M3 12A9 9 0 0 1 18.5 5.7L21 8" />
      <path d="M21 8h-6V2" />
    </svg>
  )
}

function MapPinIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function CheckIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  )
}

function EyeOffIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12a20.29 20.29 0 0 1 5.06-6.06" />
      <path d="M9.9 4.24A10.8 10.8 0 0 1 12 4c5 0 9.27 3.11 11 8a20.65 20.65 0 0 1-2.87 4.19" />
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
      <path d="M1 1l22 22" />
    </svg>
  )
}

function StatCard({ icon, title, value, description, tone = 'blue' }) {
  const toneClasses = {
    blue: 'bg-sky-100 text-sky-600 ring-sky-200/70',
    green: 'bg-cyan-100 text-cyan-700 ring-cyan-200/70',
    orange: 'bg-amber-100 text-amber-600 ring-amber-200/70',
  }

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] ring-1 ${toneClasses[tone]}`}>
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  )
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function DestinationListPage() {
  const [destinations, setDestinations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const navigate = useNavigate()

  const getDataArray = (response) => {
    if (Array.isArray(response?.data?.data?.data)) return response.data.data.data
    if (Array.isArray(response?.data?.data)) return response.data.data
    if (Array.isArray(response?.data)) return response.data
    return []
  }

  const fetchDestinations = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await destinationApi.getAll()
      setDestinations(getDataArray(response))
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Không thể tải danh sách địa chỉ tour')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDestinations()
  }, [])

  useEffect(() => {
    if (!message && !error) return

    const timer = setTimeout(() => {
      setMessage('')
      setError('')
    }, 3000)

    return () => clearTimeout(timer)
  }, [message, error])

  const filteredDestinations = useMemo(() => {
    const keyword = normalizeText(searchTerm.trim())

    if (!keyword) return destinations

    return destinations.filter((destination) => {
      const searchableText = normalizeText(
        [
          destination.name,
          destination.province_city,
          destination.country,
          destination.slug,
          destination.description,
        ].join(' ')
      )

      return searchableText.includes(keyword)
    })
  }, [destinations, searchTerm])

  const handleSearch = (event) => {
    event.preventDefault()
  }

  const handleRefresh = () => {
    setSearchTerm('')
    fetchDestinations()
  }

  const openDeleteModal = (destination) => {
    setDeleteTarget(destination)
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

      await destinationApi.remove(deleteTarget.id)
      setMessage('Xóa địa chỉ tour thành công')
      setDeleteTarget(null)
      await fetchDestinations()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Xóa địa chỉ tour thất bại')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (destination) => {
    navigate(`/admin/destinations/${destination.id}/edit`, {
      state: { destination },
    })
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1240px] space-y-6">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="text-sky-600">⌂</span>
            <span>Quản lý tour</span>
            <span className="text-slate-300">›</span>
            <span className="font-semibold text-slate-800">Địa chỉ tour</span>
          </div>

          <div className="mt-14 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">
                Quản lý địa chỉ tour
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-500">
                Theo dõi danh sách điểm đến, tỉnh thành, quốc gia, ảnh đại diện và trạng thái hiển thị trên hệ thống tour.
              </p>
            </div>

            <div className="flex shrink-0 flex-nowrap items-center gap-3">
              <Link
                to="/admin/destinations/create"
                className="inline-flex h-12 whitespace-nowrap items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(14,165,233,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(14,165,233,0.32)]"
              >
                <PlusIcon className="h-4 w-4" />
                Thêm điểm đến
              </Link>

              <Link
                to="/admin/destinations/trash"
                className="inline-flex h-12 whitespace-nowrap items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-5 text-sm font-bold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
              >
                <TrashIcon className="h-4 w-4 text-sky-600" />
                Đã xóa
              </Link>

              <Link
                to="/admin/tours"
                className="inline-flex h-12 whitespace-nowrap items-center justify-center rounded-xl border border-sky-200 bg-white px-5 text-sm font-bold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
              >
                Quay lại tour
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <StatCard
            icon={<MapPinIcon />}
            title="Tổng điểm đến"
            value={destinations.length}
            description="Tất cả địa chỉ tour"
            tone="blue"
          />

          <StatCard
            icon={<CheckIcon />}
            title="Đang hoạt động"
            value={destinations.filter((item) => item.status === 'active').length}
            description="Điểm đến đang hiển thị"
            tone="green"
          />

          <StatCard
            icon={<EyeOffIcon />}
            title="Tạm ẩn"
            value={destinations.filter((item) => item.status !== 'active').length}
            description="Điểm đến chưa hiển thị"
            tone="orange"
          />
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-sky-500" />

              <input
                type="text"
                placeholder="Nhập tên điểm đến, tỉnh thành hoặc quốc gia..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-14 w-full rounded-xl border border-sky-100 bg-white pl-14 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-7 text-sm font-bold text-white shadow-[0_10px_22px_rgba(14,165,233,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(14,165,233,0.32)]"
              >
                <SearchIcon className="h-4 w-4" />
                Tìm kiếm
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-6 text-sm font-bold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
              >
                <RefreshIcon className="h-4 w-4 text-sky-600" />
                Làm mới
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-slate-950">
                Danh sách điểm đến
              </h2>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-600">
                {filteredDestinations.length} / {destinations.length} điểm đến
              </span>
            </div>

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="w-fit rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 transition hover:border-sky-200 hover:bg-sky-100"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[900px] overflow-hidden rounded-xl text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <th className="w-[72px] px-5 py-4">STT</th>
                  <th className="px-5 py-4">Điểm đến</th>
                  <th className="px-5 py-4">Vị trí</th>
                  <th className="px-5 py-4">Mô tả</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Hành động</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                        <div className="h-11 w-11 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
                        <p className="text-sm font-semibold text-slate-500">
                          Đang tải danh sách địa chỉ tour...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredDestinations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-16 text-center">
                      <div className="mx-auto max-w-sm rounded-2xl bg-slate-50 px-6 py-8">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-sky-500 shadow-sm">
                          <SearchIcon />
                        </div>
                        <p className="text-lg font-black text-slate-800">
                          Không có dữ liệu
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Không tìm thấy điểm đến phù hợp với từ khóa hiện tại.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDestinations.map((destination, index) => (
                    <tr key={destination.id} className="bg-white transition hover:bg-slate-50">
                      <td className="px-5 py-4 font-bold text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          {destination.thumbnail_url ? (
                            <img
                              src={destination.thumbnail_url}
                              alt={destination.name}
                              className="h-14 w-20 rounded-xl object-cover shadow-sm"
                              onError={(event) => {
                                event.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                              <MapPinIcon className="h-6 w-6" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate font-black text-slate-950">
                              {destination.name || '-'}
                            </p>
                            <p className="mt-1 max-w-[260px] truncate text-xs font-medium text-slate-400">
                              {destination.slug || 'Chưa có slug'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-700">
                          {destination.province_city || '-'}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-400">
                          {destination.country || '-'}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[320px] line-clamp-2 leading-6 text-slate-600">
                          {destination.description || '-'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {destination.status ? (
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
                              destination.status === 'active'
                                ? 'bg-cyan-50 text-cyan-700'
                                : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                destination.status === 'active'
                                  ? 'bg-cyan-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            {destination.status === 'active' ? 'Hoạt động' : 'Tạm ẩn'}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(destination)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 text-sm font-bold text-sky-600 transition hover:border-sky-200 hover:bg-sky-100"
                          >
                            <EditIcon />
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(destination)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 text-sm font-bold text-red-600 transition hover:border-red-200 hover:bg-red-100"
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

        {(message || error) && (
          <div className="fixed right-6 top-6 z-50 w-full max-w-sm">
            <div
              className={`rounded-2xl border bg-white p-4 shadow-2xl ${
                message ? 'border-sky-100' : 'border-red-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    message ? 'bg-sky-50 text-sky-600' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {message ? <CheckIcon className="h-5 w-5" /> : <TrashIcon className="h-5 w-5" />}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900">
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
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <TrashIcon className="h-7 w-7" />
              </div>

              <div className="mt-5 text-center">
                <h2 className="text-xl font-black text-slate-950">
                  Xóa địa chỉ tour này?
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Bạn có chắc muốn xóa địa chỉ tour{' '}
                  <span className="font-bold text-slate-900">
                    {deleteTarget.name || 'này'}
                  </span>
                  ? Dữ liệu sẽ được chuyển vào mục đã xóa.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="h-11 rounded-2xl border border-sky-200 bg-white text-sm font-bold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-11 rounded-2xl bg-red-600 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default DestinationListPage
