import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import tourApi from '../../../services/toursApi'

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

function TourListPage() {
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const getData = (res) => {
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    if (Array.isArray(res?.tours)) return res.tours
    if (Array.isArray(res?.data?.data)) return res.data.data
    return []
  }

  const fetchTours = async () => {
    try {
      setLoading(true)

      const res = await tourApi.getAll()
      const data = getData(res.data)

      console.log('TOURS API:', data)

      setTours(data)
    } catch (e) {
      console.error('GET TOURS ERROR:', e)
      setTours([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTours()
  }, [])

  const handleSearch = () => {
    setKeyword(searchValue.trim())
  }

  const handleHide = async (id) => {
    const ok = window.confirm('Bạn có chắc muốn ẩn tour này không?')
    if (!ok) return

    try {
      setActionLoading(`hide-${id}`)

      await tourApi.hide(id)

      setTours((prev) => prev.filter((tour) => tour.id !== id))

      alert('Ẩn tour thành công')
    } catch (e) {
      console.error('HIDE TOUR ERROR:', e)
      alert(e.response?.data?.message || 'Ẩn tour thất bại')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id) => {
    const ok = window.confirm('Bạn có chắc muốn xóa tour này không?')
    if (!ok) return

    try {
      setActionLoading(`delete-${id}`)

      await tourApi.delete(id)

      setTours((prev) => prev.filter((tour) => tour.id !== id))

      alert('Xóa tour thành công')
    } catch (e) {
      console.error('DELETE TOUR ERROR:', e)
      alert(e.response?.data?.message || 'Xóa tour thất bại')
    } finally {
      setActionLoading(null)
    }
  }

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === '') return '-'

    const number = Number(value)

    if (Number.isNaN(number)) return '-'

    return number.toLocaleString('vi-VN') + ' đ'
  }

  const showDiscountPrice = (tour) => {
    const discountPrice = tour.discount_price

    if (
      discountPrice === null ||
      discountPrice === undefined ||
      discountPrice === ''
    ) {
      return '-'
    }

    const number = Number(discountPrice)

    if (Number.isNaN(number) || number <= 0) {
      return '-'
    }

    return formatMoney(number)
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

  const filtered = tours.filter((tour) =>
    `${tour.title || ''} ${tour.summary || ''} ${tour.status || ''} ${
      tour.destination?.name || tour.destination_name || ''
    }`
      .toLowerCase()
      .includes(keyword.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-[#f5f8fc] px-8 py-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-slate-950">
            Quản lý Tour
          </h1>
          <p className="mt-1 text-base font-medium text-slate-500">
            Quản lý danh sách tour
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/admin/categories"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 shadow-none transition hover:border-slate-400 hover:bg-slate-50"
          >
            <TagIcon className="h-5 w-5 text-slate-700" />
            Loại tour
          </Link>

          <Link
            to="/admin/tours/hidden"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 shadow-none transition hover:border-slate-400 hover:bg-slate-50"
          >
            <EyeOffIcon className="h-5 w-5 text-slate-700" />
            Tour đã ẩn
          </Link>

          <Link
            to="/admin/tours/create"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-bold text-white shadow-none transition hover:bg-blue-700"
          >
            <span className="text-2xl leading-none">+</span>
            Thêm tour
          </Link>
        </div>
      </div>

      {/* SEARCH CARD */}
      <div className="mb-7 rounded-lg border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              className="h-12 w-full rounded-md border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-blue-600 px-6 text-sm font-bold text-white shadow-none transition hover:bg-blue-700"
          >
            <SearchIcon className="h-5 w-5" />
            Tìm kiếm
          </button>

          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <FilterIcon className="h-5 w-5" />
            Bộ lọc
            <ChevronDownIcon />
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-slate-950">
              Danh sách tour
            </h2>

            <span className="rounded-md bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600">
              {filtered.length} tour
            </span>
          </div>

          <button
            type="button"
            onClick={fetchTours}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            title="Tải lại dữ liệu"
          >
            <RefreshIcon />
          </button>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-sm font-extrabold text-slate-800">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Tên</th>
                <th className="px-5 py-4">Danh mục</th>
                <th className="px-5 py-4">Điểm đến</th>
                <th className="px-5 py-4">Thời gian</th>
                <th className="px-5 py-4">Giá gốc</th>
                <th className="px-5 py-4">Giá KM</th>
                <th className="px-5 py-4">Chỗ</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                      <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                      <p className="font-semibold text-slate-500">
                        Đang tải danh sách tour...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-14 text-center">
                    <div className="mx-auto max-w-sm rounded-lg bg-slate-50 px-6 py-8">
                      <p className="text-lg font-bold text-slate-800">
                        Không có dữ liệu
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Chưa tìm thấy tour phù hợp với từ khóa hiện tại.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((tour) => (
                  <tr
                    key={tour.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-5 py-5 font-bold text-slate-700">
                      #{tour.id}
                    </td>

                    <td className="min-w-[260px] px-5 py-5">
                      <div className="max-w-[280px]">
                        <p className="line-clamp-1 text-[15px] font-semibold leading-6 text-slate-900">
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

                    <td className="whitespace-nowrap px-5 py-5 font-semibold text-slate-700">
                      {tour.category?.name ||
                        tour.category_name ||
                        tour.category_id ||
                        '-'}
                    </td>

                    <td className="whitespace-nowrap px-5 py-5 font-semibold text-slate-700">
                      {tour.destination?.name ||
                        tour.destination_name ||
                        tour.destination_id ||
                        '-'}
                    </td>

                    <td className="whitespace-nowrap px-5 py-5 font-semibold text-slate-700">
                      {tour.duration_days || 0}N /{' '}
                      {tour.duration_nights || 0}Đ
                    </td>

                    <td className="whitespace-nowrap px-5 py-5 font-extrabold text-slate-950">
                      {formatMoney(tour.base_price)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-5 font-extrabold text-red-600">
                      {showDiscountPrice(tour)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-5 font-semibold text-slate-700">
                      {tour.available_slots || 0}/{tour.max_slots || 0}
                    </td>

                    <td className="whitespace-nowrap px-5 py-5">
                      <span
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-bold ${
                          tour.status === 'published'
                            ? 'bg-green-50 text-green-700'
                            : tour.status === 'draft'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            tour.status === 'published'
                              ? 'bg-green-500'
                              : tour.status === 'draft'
                                ? 'bg-yellow-500'
                                : 'bg-slate-400'
                          }`}
                        />
                        {tour.status || '-'}
                      </span>
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/admin/tours/${tour.id}/edit`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white shadow-none transition hover:bg-blue-700"
                          title="Sửa tour"
                        >
                          <EditIcon />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleHide(tour.id)}
                          disabled={actionLoading === `hide-${tour.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Ẩn tour"
                        >
                          <EyeOffIcon className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(tour.id)}
                          disabled={actionLoading === `delete-${tour.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-600 text-white shadow-none transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Xóa tour"
                        >
                          <TrashIcon />
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
    </div>
  )
}

export default TourListPage