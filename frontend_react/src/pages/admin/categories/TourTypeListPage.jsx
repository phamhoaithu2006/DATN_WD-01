import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import CategoryTable from '../../../components/admin/categories/CategoryTable'
import { categoryApi } from '../../../services/categoryApi'

function TourTypeListPage() {
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const navigate = useNavigate()

  const getDataArray = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data
    if (Array.isArray(response?.data)) return response.data
    return []
  }

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await categoryApi.getAll()
      setCategories(getDataArray(response))
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Không thể tải danh sách loại tour')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleSearch = async (event) => {
    event.preventDefault()

    const keyword = searchTerm.trim()

    if (!keyword) {
      fetchCategories()
      return
    }

    try {
      setLoading(true)
      setMessage('')
      setError('')

      const response = await categoryApi.search(keyword)
      setCategories(getDataArray(response))
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Tìm kiếm loại tour thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Bạn có chắc muốn xóa loại tour này không?')
    if (!confirmDelete) return

    try {
      setMessage('')
      setError('')

      await categoryApi.remove(id)
      setMessage('Xóa loại tour thành công')
      await fetchCategories()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Xóa loại tour thất bại')
    }
  }

  const handleEdit = (category) => {
    navigate(`/admin/tours/${category.id}/edit`, {
      state: { category },
    })
  }

  return (
    <section className="w-full space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-7 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-sky-100 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-sky-700 shadow-sm">
              ViVuGo Travel Admin
            </div>

            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Quản lý loại tour
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Quản lý nhóm tour du lịch, tìm kiếm nhanh, chỉnh sửa thông tin và khôi phục các
              loại tour đã xóa mềm trong hệ thống.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/tours/create"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-6 py-3.5 font-bold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              + Thêm loại tour
            </Link>

            <Link
              to="/admin/tours/trash"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              Đã xóa
            </Link>
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Tổng loại tour</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{categories.length}</p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Đang hoạt động</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {categories.filter((item) => item.status === 'active').length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Tạm ẩn</p>
            <p className="mt-2 text-3xl font-black text-amber-600">
              {categories.filter((item) => item.status !== 'active').length}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 font-semibold text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên loại tour..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <button
            type="submit"
            className="h-14 rounded-2xl bg-slate-950 px-7 font-bold text-white transition hover:bg-slate-800"
          >
            Tìm kiếm
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              fetchCategories()
            }}
            className="h-14 rounded-2xl border border-slate-200 bg-white px-7 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Làm mới
          </button>
        </form>
      </div>

      <CategoryTable
        categories={categories}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </section>
  )
}

export default TourTypeListPage