import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { categoryApi } from '../../../services/categoryApi'
import { formatDateDdMmYyyy } from '../../../utils/dateFormat'

function TourTypeTrashPage() {
  const [categories, setCategories] = useState([])
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
    return formatDateDdMmYyyy(date, '-')
  }

  const fetchTrashedCategories = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await categoryApi.getTrashed()
      setCategories(getDataArray(response))
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Không thể tải danh sách đã xóa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrashedCategories()
  }, [])

  const handleRestore = async (id) => {
    const confirmRestore = window.confirm('Bạn có muốn khôi phục loại tour này không?')
    if (!confirmRestore) return

    try {
      setError('')
      setMessage('')

      await categoryApi.restore(id)
      setMessage('Khôi phục loại tour thành công')
      await fetchTrashedCategories()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Khôi phục loại tour thất bại')
    }
  }

  return (
    <section className="w-full">
      <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-slate-500">
            Quản lý danh mục tour
          </p>
          <h1 className="text-3xl font-extrabold text-slate-950">
            Loại tour đã xóa
          </h1>
          <p className="mt-2 text-slate-500">
            Xem và khôi phục các loại tour đã bị xóa mềm.
          </p>
        </div>

        <Link
          to="/admin/tours"
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
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="border-b border-slate-200 px-4 py-4">STT</th>
              <th className="border-b border-slate-200 px-4 py-4">Tên loại tour</th>
              <th className="border-b border-slate-200 px-4 py-4">Slug</th>
              <th className="border-b border-slate-200 px-4 py-4">Mô tả</th>
              <th className="border-b border-slate-200 px-4 py-4">Ngày xóa</th>
              <th className="border-b border-slate-200 px-4 py-4">Hành động</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-slate-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : categories.length > 0 ? (
              categories.map((category, index) => (
                <tr key={category.id} className="text-sm text-slate-700">
                  <td className="border-b border-slate-100 px-4 py-4">{index + 1}</td>
                  <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">
                    {category.name}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {category.slug || '-'}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {category.description || '-'}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    {formatDate(category.deleted_at)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleRestore(category.id)}
                      className="rounded-lg bg-green-100 px-3 py-2 font-semibold text-green-700 hover:bg-green-200"
                    >
                      Khôi phục
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-slate-500">
                  Không có loại tour nào đã xóa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TourTypeTrashPage
