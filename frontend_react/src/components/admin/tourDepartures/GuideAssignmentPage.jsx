import { useCallback, useEffect, useState } from 'react'
// import TourDepartureTabs from '../../../components/admin/tourDepartures/TourDepartureTable'
import { tourDepartureApi } from '../../../services/tourDepartureApi'

function unwrapList(response) {
  const payload = response?.data

  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data

  return []
}

function getError(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error?.response?.data?.message || fallback
}

function formatDate(value) {
  if (!value) return '—'

  // Hỗ trợ cả "YYYY-MM-DD" lẫn "YYYY-MM-DDTHH:mm:ss..."
  const matchedDate = String(value).match(/^\d{4}-\d{2}-\d{2}/)

  if (!matchedDate) return '—'

  const [year, month, day] = matchedDate[0].split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(date)
}

function stateMeta(state) {
  if (state === 'assigned') {
    return {
      label: 'Đã phân công',
      className: 'bg-emerald-100 text-emerald-700',
    }
  }

  if (state === 'blocked') {
    return {
      label: 'Hết HDV phù hợp',
      className: 'bg-red-100 text-red-700',
    }
  }

  return {
    label: 'Chưa phân công',
    className: 'bg-amber-100 text-amber-700',
  }
}

export default function GuideAssignmentPage() {
  const today = new Date().toISOString().slice(0, 10)

  const [from, setFrom] = useState(today)
  const [to, setTo] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchPlanning = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await tourDepartureApi.getGuidePlanning({
        from: from || undefined,
        to: to || undefined,
        per_page: 50,
      })

      setRows(unwrapList(response))
    } catch (err) {
      setError(getError(err, 'Không tải được danh sách phân công.'))
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void fetchPlanning()
  }, [fetchPlanning])

  async function autoAssign(departureId) {
    try {
      setBusyId(departureId)
      setError('')

      const response = await tourDepartureApi.autoAssignGuide(departureId)

      setMessage(
        response.data?.message || 'Đã tự động phân công HDV.'
      )

      await fetchPlanning()
    } catch (err) {
      setError(getError(err, 'Không thể tự động phân công HDV.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Phân công HDV</h1>

        <p className="mt-1 text-gray-500">
          Tự động chọn HDV đúng khu vực và còn thời gian nghỉ giữa các tour.
        </p>
      </div>

      {/* <TourDepartureTabs /> */}

      {message ? (
        <div className="mb-4 rounded bg-emerald-50 p-3 text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded bg-red-50 p-3 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow">
        <label className="text-sm">
          Từ ngày

          <input
            className="mt-1 block rounded border px-3 py-2"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>

        <label className="text-sm">
          Đến ngày

          <input
            className="mt-1 block rounded border px-3 py-2"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>

        <button
          className="rounded bg-blue-600 px-4 py-2 text-white"
          type="button"
          onClick={fetchPlanning}
        >
          Lọc lịch
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-3">Tour / lịch khởi hành</th>
              <th className="p-3">Điểm đến</th>
              <th className="p-3">HDV</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  className="p-6 text-center text-gray-500"
                  colSpan="5"
                >
                  Đang tải...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  className="p-6 text-center text-gray-500"
                  colSpan="5"
                >
                  Không có lịch trong khoảng đã chọn.
                </td>
              </tr>
            ) : (
              rows.map((item) => {
                const meta = stateMeta(item.assignment_state)
                const guides = item.assigned_guides || []

                return (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">
                      <strong className="block">
                        {item.tour_title || `Tour #${item.tour_id}`}
                      </strong>

                      <span className="text-gray-500">
                        {formatDate(item.departure_date)} –{' '}
                        {formatDate(
                          item.return_date || item.departure_date
                        )}
                      </span>
                    </td>

                    <td className="p-3">
                      {(item.destinations || [])
                        .map((destination) => destination.name)
                        .join(', ') || 'Chưa gắn điểm đến'}
                    </td>

                    <td className="p-3">
                      {guides.length > 0
                        ? guides
                            .map(
                              (assignment) =>
                                assignment.guide?.user?.full_name ||
                                `HDV #${assignment.guide_id}`
                            )
                            .join(', ')
                        : `Chưa phân (${item.available_guide_count || 0} HDV hợp lệ)`}
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </td>

                    <td className="p-3">
                      {item.assignment_state === 'available' ? (
                        <button
                          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => autoAssign(item.id)}
                        >
                          {busyId === item.id
                            ? 'Đang phân...'
                            : 'Tự động phân công'}
                        </button>
                      ) : item.assignment_state === 'blocked' ? (
                        <span className="text-sm text-red-600">
                          Kiểm tra khu vực HDV hoặc lịch đang kín.
                        </span>
                      ) : (
                        <span className="text-sm text-emerald-700">
                          Hoàn tất
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}