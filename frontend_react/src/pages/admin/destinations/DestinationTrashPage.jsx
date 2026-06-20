import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { destinationApi } from '../../../services/destinationApi'

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

function DestinationTrashPage() {
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const getDataArray = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data
    if (Array.isArray(response?.data)) return response.data
    return []
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('vi-VN')
  }

  const fetchTrashedDestinations = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await destinationApi.getTrashed()
      setDestinations(getDataArray(response))
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Không thể tải danh sách đã xóa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrashedDestinations()
  }, [])

  const handleRestore = async (id) => {
    const confirmRestore = window.confirm('Bạn có muốn khôi phục địa chỉ tour này không?')
    if (!confirmRestore) return

    try {
      setError('')
      setMessage('')

      await destinationApi.restore(id)
      setMessage('Khôi phục địa chỉ tour thành công')
      await fetchTrashedDestinations()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Khôi phục địa chỉ tour thất bại')
    }
  }

  const handleForceDelete = async (id) => {
    const confirmDelete = window.confirm('Xóa vĩnh viễn địa chỉ tour này? Hành động này không thể khôi phục.')
    if (!confirmDelete) return

    try {
      setError('')
      setMessage('')

      await destinationApi.forceDelete(id)
      setMessage('Xóa vĩnh viễn địa chỉ tour thành công')
      await fetchTrashedDestinations()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Xóa vĩnh viễn địa chỉ tour thất bại')
    }
  }

  return (
    <section className="min-h-screen bg-[#f6f9fd] px-6 py-7 text-slate-900">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-emerald-600">
              Quản lý địa chỉ tour
            </p>
            <h1 className="text-3xl font-extrabold text-slate-950">
              Địa chỉ tour đã xóa
            </h1>
            <p className="mt-2 text-slate-500">
              Xem, khôi phục hoặc xóa vĩnh viễn các địa chỉ tour đã bị xóa mềm.
            </p>
          </div>

          <Link
            to="/admin/destinations"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Quay lại danh sách
          </Link>
        </div>

        {message && (
          <div className="mb-5 rounded-xl bg-green-100 px-4 py-3 font-semibold text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl bg-red-100 px-4 py-3 font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="border-b border-slate-200 px-4 py-4">STT</th>
                <th className="border-b border-slate-200 px-4 py-4">Tên điểm đến</th>
                <th className="border-b border-slate-200 px-4 py-4">Tỉnh / TP</th>
                <th className="border-b border-slate-200 px-4 py-4">Quốc gia</th>
                <th className="border-b border-slate-200 px-4 py-4">Slug</th>
                <th className="border-b border-slate-200 px-4 py-4">Ngày xóa</th>
                <th className="border-b border-slate-200 px-4 py-4 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : destinations.length > 0 ? (
                destinations.map((destination, index) => (
                  <tr key={destination.id} className="text-sm text-slate-700">
                    <td className="border-b border-slate-100 px-4 py-4">{index + 1}</td>
                    <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">
                      {destination.name}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      {destination.province_city || '-'}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      {destination.country || '-'}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      {destination.slug || '-'}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      {formatDate(destination.deleted_at)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestore(destination.id)}
                          className="rounded-lg bg-green-100 px-3 py-2 font-semibold text-green-700 hover:bg-green-200"
                        >
                          Khôi phục
                        </button>

                        <button
                          type="button"
                          onClick={() => handleForceDelete(destination.id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 font-semibold text-red-700 hover:bg-red-200"
                        >
                          <TrashIcon />
                          Xóa vĩnh viễn
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-slate-500">
                    Không có địa chỉ tour nào đã xóa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default DestinationTrashPage