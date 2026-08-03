import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import { confirmAction } from '../../../components/common/AppConfirmDialog.jsx'

import { categoryApi } from '../../../services/categoryApi'
import { formatDateDdMmYyyy } from '../../../utils/dateFormat'

function TourTypeTrashPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const formatDate = (date) => {
    if (!date) return '-'
    return formatDateDdMmYyyy(date, '-')
  }

  const fetchTrashedCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await categoryApi.getTrashed()
      setCategories(
        Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data)
            ? response.data
            : [],
      )
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Không thể tải danh sách đã xóa')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchTrashedCategories()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchTrashedCategories])

  const handleRestore = async (id) => {
    if (!await confirmAction('Bạn có chắc muốn khôi phục loại tour này không?', { title: 'Khôi phục loại tour', confirmLabel: 'Khôi phục' })) return

    try {
      setRestoringId(id)
      setMessage('')
      setError('')
      const response = await categoryApi.restore(id)

      setMessage(response?.data?.message || 'Khôi phục loại tour thành công!')
      await fetchTrashedCategories()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Khôi phục loại tour thất bại')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="min-h-full bg-slate-50/70 px-8 py-8">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Tour', 'Thùng Rác']}
        title="Loại Tour Đã Xóa"
        description="Xem và khôi phục các loại tour đã bị xóa mềm trong hệ thống."
        actions={
          <div className="flex items-center gap-3">
            <Link
              to="/admin/categories"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              <span className="text-lg leading-none">←</span>
              Quay lại danh sách loại tour
            </Link>
          </div>
        }
      />

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
                      disabled={restoringId === category.id}
                      className="rounded-lg bg-green-100 px-3 py-2 font-semibold text-green-700 hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {restoringId === category.id ? 'Đang khôi phục...' : 'Khôi phục'}
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
    </div>
  )
}

export default TourTypeTrashPage
