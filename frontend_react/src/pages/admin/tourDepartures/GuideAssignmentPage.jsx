import { useCallback, useEffect, useMemo, useState } from 'react'
import { tourDepartureApi } from '../../../services/tourDepartureApi'

function unwrapList(response) {
  const payload = response?.data

  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload)) return payload

  return []
}

function getError(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  if (error?.response?.status === 401) {
    return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  }

  if (error?.response?.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.'
  }

  return error?.response?.data?.message || fallback
}

function formatDate(value) {
  if (!value) return '—'

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

function getTourId(item) {
  return item?.tour_id || item?.tour?.id || item?.tourId || null
}

export function GuideAssignmentPanel({
  selectedTourId = '',
  focusedDepartureId = null,
  onAssigned,
  onClearFocus,
  embedded = false,
}) {
  const [from, setFrom] = useState('')
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

  const displayedRows = useMemo(() => {
    return rows.filter((item) => {
      if (focusedDepartureId) {
        return String(item.id) === String(focusedDepartureId)
      }

      if (selectedTourId) {
        return String(getTourId(item)) === String(selectedTourId)
      }

      return true
    })
  }, [rows, selectedTourId, focusedDepartureId])

  async function autoAssign(departureId) {
    try {
      setBusyId(departureId)
      setMessage('')
      setError('')

      const response = await tourDepartureApi.autoAssignGuide(departureId)

      setMessage(
        response.data?.message || 'Đã tự động phân công HDV.'
      )

      await fetchPlanning()
      await onAssigned?.()
    } catch (err) {
      setError(getError(err, 'Không thể tự động phân công HDV.'))
    } finally {
      setBusyId(null)
    }
  }

  const content = (
    <div>
      {!embedded ? (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Phân công HDV
          </h2>

          <p className="mt-1 text-slate-500">
            Tự động chọn HDV đúng khu vực và còn thời gian nghỉ giữa các tour.
          </p>
        </div>
      ) : null}

      {focusedDepartureId ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sky-50 p-3 text-sm text-sky-700">
          <span>
            Đang xem phân công của một lịch khởi hành được chọn.
          </span>

          <button
            type="button"
            onClick={onClearFocus}
            className="rounded bg-white px-3 py-1.5 font-medium text-sky-700 ring-1 ring-sky-200"
          >
            Xem tất cả
          </button>
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-4">
        <label className="text-sm font-medium text-slate-700">
          Từ ngày

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 font-normal"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Đến ngày

          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 font-normal"
          />
        </label>

        <button
          type="button"
          onClick={fetchPlanning}
          className="rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          Lọc lịch
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
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
                <td colSpan="5" className="p-6 text-center text-slate-500">
                  Đang tải...
                </td>
              </tr>
            ) : displayedRows.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500">
                  Không có lịch trong khoảng đã chọn.
                </td>
              </tr>
            ) : (
              displayedRows.map((item) => {
                const meta = stateMeta(item.assignment_state)

                const guides =
                  item.assigned_guides ||
                  item.guide_assignments ||
                  []

                return (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">
                      <strong className="block">
                        {item.tour_title || `Tour #${getTourId(item)}`}
                      </strong>

                      <span className="text-slate-500">
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
                                assignment.guide?.user?.name ||
                                assignment.user?.full_name ||
                                assignment.user?.name ||
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
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => autoAssign(item.id)}
                          className="rounded bg-blue-600 px-3 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

  if (embedded) {
    return content
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-6">
      {content}
    </section>
  )
}

export default GuideAssignmentPanel