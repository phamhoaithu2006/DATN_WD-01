import { useCallback, useEffect, useState } from 'react'
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

function TourListPage() {
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [toast, setToast] = useState(null)

  const getData = (res) => {
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    if (Array.isArray(res?.tours)) return res.tours
    if (Array.isArray(res?.data?.data)) return res.data.data
    return []
  }

  const fetchTours = useCallback(async () => {
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
  }, [])

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
    }, 3000)

    return () => clearTimeout(timer)
  }, [toast])

  const handleSearch = () => {
    setKeyword(searchValue.trim())
  }

  const openActionModal = (type, tour) => {
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
    <div className="min-h-full bg-slate-50/70 px-8 py-8">
      <section className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <span>ViVuGo</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-[#020617]">Quản Lý Tour</span>
        </div>

        <div className="mt-14 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[30px] font-extrabold tracking-tight text-[#020617]">
              Quản Lý Tour
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Quản lý danh sách tour, loại tour, điểm đến và trạng thái hiển thị.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/categories"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              <TagIcon className="h-4 w-4 text-sky-600" />
              Loại tour
            </Link>

            <Link
              to="/admin/destinations"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <MapPinIcon className="h-4 w-4 text-emerald-600" />
              Địa chỉ tour
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
        </div>
      </section>

      {/* SEARCH CARD */}
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-4 text-sm font-medium text-violet-700 transition hover:border-violet-200 hover:bg-violet-100"
          >
            <FilterIcon className="h-4 w-4" />
            Bộ lọc
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">
              Danh sách tour
            </h2>

            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600">
              {filtered.length} tour
            </span>
          </div>

          <button
            type="button"
            onClick={fetchTours}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-600 transition hover:border-sky-200 hover:bg-sky-100"
            title="Tải lại dữ liệu"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Tên</th>
                <th className="px-5 py-3">Danh mục</th>
                <th className="px-5 py-3">Điểm đến</th>
                <th className="px-5 py-3">Thời gian</th>
                <th className="px-5 py-3">Giá gốc</th>
                <th className="px-5 py-3">Giá KM</th>
                <th className="px-5 py-3">Chỗ</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-5 py-14 text-center">
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
                  <td colSpan="10" className="px-5 py-14 text-center">
                    <div className="mx-auto max-w-sm rounded-xl bg-slate-50 px-6 py-8">
                      <p className="text-base font-medium text-slate-700">
                        Không có dữ liệu
                      </p>
                      <p className="mt-1 text-sm font-normal text-slate-500">
                        Chưa tìm thấy tour phù hợp với từ khóa hiện tại.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((tour) => (
                  <tr
                    key={tour.id}
                    className="transition hover:bg-sky-50/40"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-600">
                      #{tour.id}
                    </td>

                    <td className="min-w-[260px] px-5 py-4">
                      <div className="max-w-[280px]">
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
                      {tour.category?.name ||
                        tour.category_name ||
                        tour.category_id ||
                        '-'}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-normal text-slate-600">
                      {tour.destination?.name ||
                        tour.destination_name ||
                        tour.destination_id ||
                        '-'}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-normal text-slate-600">
                      {tour.duration_days || 0}N /{' '}
                      {tour.duration_nights || 0}Đ
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700">
                      {formatMoney(tour.base_price)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-medium text-rose-600">
                      {showDiscountPrice(tour)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-normal text-slate-600">
                      {tour.available_slots || 0}/{tour.max_slots || 0}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                          tour.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : tour.status === 'draft'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            tour.status === 'published'
                              ? 'bg-emerald-500'
                              : tour.status === 'draft'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                          }`}
                        />
                        {tour.status || '-'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed right-6 top-6 z-50 w-full max-w-sm">
          <div
            className={`rounded-2xl border bg-white p-4 shadow-xl ${
              toast.type === 'success' ? 'border-emerald-100' : 'border-rose-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  toast.type === 'success'
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                pendingAction.type === 'hide'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              {pendingAction.type === 'hide' ? (
                <EyeOffIcon className="h-7 w-7" />
              ) : (
                <TrashIcon className="h-7 w-7" />
              )}
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-lg font-semibold text-slate-800">
                {pendingAction.type === 'hide' ? 'Ẩn tour này?' : 'Xóa tour này?'}
              </h2>

              <p className="mt-3 text-sm font-normal leading-6 text-slate-500">
                Bạn có chắc muốn {pendingAction.type === 'hide' ? 'ẩn' : 'xóa'} tour{' '}
                <span className="font-medium text-slate-700">
                  {formatTourTitle(pendingAction.tour?.title || '') || `#${pendingAction.tour?.id}`}
                </span>
                {' '}không?
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeActionModal}
                disabled={Boolean(actionLoading)}
                className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleAction}
                disabled={Boolean(actionLoading)}
                className={`h-10 rounded-lg text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  pendingAction.type === 'hide'
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
      )}
    </div>
  )
}

export default TourListPage
