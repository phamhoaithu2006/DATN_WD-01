import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import tourApi from '../../../services/toursApi'

function TourHiddenPage() {
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')

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

      const response = await tourApi.getHidden()
      const tourList = getTourListFromResponse(response.data)

      setTours(tourList)
    } catch (error) {
      console.error(error)
      alert('Không thể tải danh sách tour đã ẩn')
      setTours([])
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

    return Number(value).toLocaleString('vi-VN') + ' đ'
  }

  const getStatusText = (status) => {
    const statusMap = {
      active: 'Đang hoạt động',
      inactive: 'Tạm tắt',
      hidden: 'Đã ẩn',
    }

    return statusMap[status] || status || 'Đã ẩn'
  }

  const getStatusClass = (status) => {
    if (status === 'active') return 'bg-green-50 text-green-700'
    if (status === 'inactive') return 'bg-yellow-50 text-yellow-700'
    if (status === 'hidden') return 'bg-gray-100 text-gray-700'

    return 'bg-gray-100 text-gray-700'
  }

  const handleUnhide = async (id) => {
    const confirmed = window.confirm('Bạn có chắc muốn hiện lại tour này không?')

    if (!confirmed) return

    try {
      await tourApi.unhide(id)
      alert('Hiện lại tour thành công')
      fetchHiddenTours()
    } catch (error) {
      console.error(error)
      alert('Hiện lại tour thất bại')
    }
  }

  const filteredTours = tours.filter((tour) => {
    const title = tour.title || tour.name || ''
    const summary = tour.summary || ''
    const status = tour.status || ''

    const searchText = `${title} ${summary} ${status}`.toLowerCase()

    return searchText.includes(keyword.toLowerCase())
  })

  return (
    <div className="p-6">
      <AdminPageHeader
        breadcrumb={["ViVuGo", "Quản Lý Tour", "Tour đã ẩn"]}
        title="Tour đã ẩn"
        description="Danh sách các tour đang bị ẩn khỏi hệ thống."
        actions={
          <Link
            to="/admin/tours"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
          >
            Quay lại danh sách
          </Link>
        }
      />

      <div className="mb-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Tìm theo tên tour, tóm tắt hoặc trạng thái..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Tên tour
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Danh mục
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Điểm đến
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Giá gốc
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Giá KM
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Số chỗ
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Đánh giá
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-4 py-10 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredTours.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-10 text-center text-gray-500">
                    Chưa có tour bị ẩn
                  </td>
                </tr>
              ) : (
                filteredTours.map((tour) => (
                  <tr key={tour.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-600">
                      #{tour.id}
                    </td>

                    <td className="px-4 py-4">
                      <div className="max-w-[260px]">
                        <p className="font-medium text-gray-800">
                          {tour.title || tour.name || 'Chưa có tên'}
                        </p>
                        <p className="mt-1 truncate text-sm text-gray-500">
                          {tour.summary || 'Chưa có tóm tắt'}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600">
                      {tour.category_id || '-'}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600">
                      {tour.destination_id || tour.location || '-'}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600">
                      {tour.duration_days || 0} ngày {tour.duration_nights || 0} đêm
                    </td>

                    <td className="px-4 py-4 text-sm font-medium text-gray-800">
                      {formatMoney(tour.base_price || tour.price)}
                    </td>

                    <td className="px-4 py-4 text-sm font-medium text-red-600">
                      {formatMoney(tour.discount_price)}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600">
                      {tour.available_slots || 0}/{tour.max_slots || 0}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-600">
                      {tour.average_rating || 0} ⭐
                      <span className="ml-1 text-gray-400">
                        ({tour.review_count || 0})
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          tour.status || 'hidden',
                        )}`}
                      >
                        {getStatusText(tour.status || 'hidden')}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleUnhide(tour.id)}
                        className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100"
                      >
                        Hiện lại
                      </button>
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

export default TourHiddenPage
