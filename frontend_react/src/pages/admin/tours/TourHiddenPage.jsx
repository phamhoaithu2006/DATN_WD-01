import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import tourApi from '../../../services/toursApi'

function TourHiddenPage() {
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [confirmTour, setConfirmTour] = useState(null)
  const [notice, setNotice] = useState(null)

  const getTourListFromResponse = (responseData) => {
    if (Array.isArray(responseData)) return responseData
    if (Array.isArray(responseData?.data)) return responseData.data
    if (Array.isArray(responseData?.tours)) return responseData.tours
    if (Array.isArray(responseData?.data?.data)) return responseData.data.data
    if (Array.isArray(responseData?.data?.tours)) return responseData.data.tours

    return []
  }

  const fetchHiddenTours = useCallback(async () => {
    try {
      setLoading(true)
      setNotice(null)

      const response = await tourApi.getHidden()
      const tourList = getTourListFromResponse(response.data)

      setTours(tourList)
    } catch (error) {
      console.error('LOAD HIDDEN TOURS ERROR:', error)
      setTours([])
      setNotice({
        type: 'error',
        title: 'Không thể tải dữ liệu',
        message:
          error?.response?.data?.message ||
          'Không thể tải danh sách tour đã ẩn. Vui lòng thử lại.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchHiddenTours()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchHiddenTours])

  const formatMoney = (value) => {
    if (value === null || value === undefined || value === '') {
      return '0 đ'
    }

    const amount = Number(value)

    if (!Number.isFinite(amount)) {
      return '0 đ'
    }

    return `${amount.toLocaleString('vi-VN')} đ`
  }

  const getStatusText = (status) => {
    const statusMap = {
      active: 'Đang hoạt động',
      published: 'Đang hiển thị',
      inactive: 'Tạm tắt',
      draft: 'Bản nháp',
      hidden: 'Đã ẩn',
    }

    return statusMap[status] || status || 'Đã ẩn'
  }

  const getStatusClass = (status) => {
    if (status === 'active' || status === 'published') {
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
    }

    if (status === 'inactive' || status === 'draft') {
      return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
    }

    return 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'
  }

  const openUnhideConfirm = (tour) => {
    setNotice(null)
    setConfirmTour(tour)
  }

  const closeUnhideConfirm = () => {
    if (actionLoadingId) return
    setConfirmTour(null)
  }

  const handleUnhide = async () => {
    if (!confirmTour || actionLoadingId) return

    const tourId = confirmTour.id

    try {
      setActionLoadingId(tourId)

      await tourApi.unhide(tourId)

      setTours((currentTours) =>
        currentTours.filter((tour) => tour.id !== tourId),
      )
      setConfirmTour(null)
      setNotice({
        type: 'success',
        title: 'Hiển thị lại tour thành công',
        message: `Tour “${
          confirmTour.title || confirmTour.name || `#${tourId}`
        }” đã được đưa trở lại danh sách tour.`,
      })
    } catch (error) {
      console.error('UNHIDE TOUR ERROR:', error)
      setConfirmTour(null)
      setNotice({
        type: 'error',
        title: 'Hiển thị lại tour thất bại',
        message:
          error?.response?.data?.message ||
          'Không thể hiển thị lại tour. Vui lòng thử lại.',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredTours = tours.filter((tour) => {
    const title = tour.title || tour.name || ''
    const summary = tour.summary || ''
    const status = tour.status || ''
    const categoryName =
      tour.category?.name || tour.category_name || tour.category_id || ''
    const destinationName =
      tour.destination?.name ||
      tour.destination_name ||
      tour.location ||
      tour.destination_id ||
      ''

    const searchText =
      `${title} ${summary} ${status} ${categoryName} ${destinationName}`.toLowerCase()

    return searchText.includes(keyword.trim().toLowerCase())
  })

  return (
    <div className="p-6">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Tour', 'Tour đã ẩn']}
        title="Tour đã ẩn"
        description="Danh sách các tour đang bị ẩn khỏi hệ thống."
        actions={
          <Link
            to="/admin/tours"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            ← Quay lại danh sách
          </Link>
        }
      />

      {notice ? (
        <div
          className={`mb-5 flex items-start justify-between gap-4 rounded-2xl border px-4 py-4 shadow-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
          role="alert"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                notice.type === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {notice.type === 'success' ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold">{notice.title}</p>
              <p className="mt-1 text-sm font-medium leading-6 opacity-80">
                {notice.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded-lg p-1.5 opacity-60 transition hover:bg-white/60 hover:opacity-100"
            aria-label="Đóng thông báo"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>

          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo tên tour, tóm tắt, danh mục, điểm đến hoặc trạng thái..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead className="bg-slate-50/90">
              <tr>
                {[
                  'ID',
                  'Tên tour',
                  'Danh mục',
                  'Điểm đến',
                  'Thời gian',
                  'Giá gốc',
                  'Giá KM',
                  'Số chỗ',
                  'Đánh giá',
                  'Trạng thái',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-500"
                  >
                    {heading}
                  </th>
                ))}

                <th className="px-4 py-3.5 text-right text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-4 py-14 text-center">
                    <div className="inline-flex items-center gap-3 text-sm font-semibold text-slate-500">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                      Đang tải dữ liệu...
                    </div>
                  </td>
                </tr>
              ) : filteredTours.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18M5 6l1 14h12l1-14M9 10v6M15 10v6M9 6V4h6v2" />
                        </svg>
                      </div>
                      <p className="mt-4 text-sm font-extrabold text-slate-700">
                        {keyword.trim()
                          ? 'Không tìm thấy tour phù hợp'
                          : 'Chưa có tour bị ẩn'}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-400">
                        {keyword.trim()
                          ? 'Hãy thử lại với từ khóa khác.'
                          : 'Các tour bị ẩn sẽ xuất hiện tại đây.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTours.map((tour) => {
                  const tourTitle =
                    tour.title || tour.name || 'Chưa có tên'
                  const categoryName =
                    tour.category?.name ||
                    tour.category_name ||
                    tour.category_id ||
                    '-'
                  const destinationName =
                    tour.destination?.name ||
                    tour.destination_name ||
                    tour.location ||
                    tour.destination_id ||
                    '-'

                  return (
                    <tr
                      key={tour.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                        #{tour.id}
                      </td>

                      <td className="px-4 py-4">
                        <div className="max-w-[260px]">
                          <p className="font-bold text-slate-800">
                            {tourTitle}
                          </p>
                          <p className="mt-1 truncate text-sm font-medium text-slate-400">
                            {tour.summary || 'Chưa có tóm tắt'}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-slate-600">
                        {categoryName}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-slate-600">
                        {destinationName}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-slate-600">
                        {tour.duration_days || 0} ngày{' '}
                        {tour.duration_nights || 0} đêm
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-slate-800">
                        {formatMoney(tour.base_price || tour.price)}
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-rose-600">
                        {formatMoney(tour.discount_price)}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-slate-600">
                        {tour.available_slots || 0}/{tour.max_slots || 0}
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-slate-600">
                        {tour.average_rating || 0} ⭐
                        <span className="ml-1 text-slate-400">
                          ({tour.review_count || 0})
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            tour.status || 'hidden',
                          )}`}
                        >
                          {getStatusText(tour.status || 'hidden')}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openUnhideConfirm(tour)}
                          disabled={actionLoadingId === tour.id}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3.5 text-sm font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoadingId === tour.id ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                              <circle cx="12" cy="12" r="2.5" />
                            </svg>
                          )}
                          Hiện lại
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmTour ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unhide-tour-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUnhideConfirm()
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_-28px_rgba(15,23,42,0.65)]">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-600">
                    Xác nhận thao tác
                  </p>
                  <h2
                    id="unhide-tour-title"
                    className="mt-1 text-xl font-black text-slate-900"
                  >
                    Hiển thị lại tour?
                  </h2>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm font-medium leading-6 text-slate-600">
                Tour{' '}
                <strong className="font-extrabold text-slate-900">
                  “{confirmTour.title || confirmTour.name || `#${confirmTour.id}`}”
                </strong>{' '}
                sẽ được đưa trở lại danh sách tour và có thể hiển thị cho người
                dùng.
              </p>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
                Hãy kiểm tra lại nội dung, giá và lịch trình tour trước khi xác
                nhận.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
              <button
                type="button"
                onClick={closeUnhideConfirm}
                disabled={Boolean(actionLoadingId)}
                className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleUnhide}
                disabled={Boolean(actionLoadingId)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {actionLoadingId ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Đang xử lý...
                  </>
                ) : (
                  'Hiển thị lại'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default TourHiddenPage