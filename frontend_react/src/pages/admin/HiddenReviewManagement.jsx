import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminGuideReviews, getAdminTourReviews, updateAdminGuideReviewStatus, updateAdminTourReviewStatus } from '../../services/adminReviewApi'

export default function HiddenReviewManagement() {
  const [type, setType] = useState('tour')
  const [reviews, setReviews] = useState([])
  const [pagination, setPagination] = useState({})
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [rating, setRating] = useState('')
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const getReviews = type === 'tour' ? getAdminTourReviews : getAdminGuideReviews
      const result = await getReviews({ status: 'hidden', page, per_page: 15, search: search || undefined, rating: rating || undefined })
      setReviews(Array.isArray(result.reviews) ? result.reviews : [])
      setPagination(result.pagination || {})
    } catch (loadError) {
      setError(loadError?.response?.data?.message || 'Không thể tải đánh giá đã ẩn.')
    } finally {
      setLoading(false)
    }
  }, [page, rating, search, type])

  useEffect(() => { void load() }, [load])

  const restore = async (review) => {
    if (!window.confirm('Hiển thị lại đánh giá này?')) return
    try {
      setRestoring(review.id)
      const update = type === 'tour' ? updateAdminTourReviewStatus : updateAdminGuideReviewStatus
      await update(review.id, 'visible')
      await load()
    } catch (restoreError) {
      setError(restoreError?.response?.data?.message || 'Không thể hiển thị lại đánh giá.')
    } finally {
      setRestoring(null)
    }
  }

  const switchType = (nextType) => { setType(nextType); setPage(1); setSearch(''); setRating('') }
  const lastPage = Math.max(Number(pagination.last_page || 1), 1)

  return <div className="min-h-full bg-slate-50 p-6 lg:p-8">
    <header className="mb-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-8 text-white shadow-xl shadow-slate-200"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-300">Kho lưu trữ đánh giá</p><h1 className="mt-3 text-3xl font-black">Đánh giá đã ẩn</h1><p className="mt-2 text-sm text-slate-300">Các đánh giá trong danh sách này không xuất hiện với khách hàng và có thể khôi phục bất cứ lúc nào.</p></div><Link to="/admin/reviews" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur hover:bg-white/20">← Quay lại quản lý</Link></div></header>
    <div className="mb-5 inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"><button onClick={() => switchType('tour')} className={`rounded-xl px-5 py-2.5 text-sm font-bold ${type === 'tour' ? 'bg-blue-600 text-white shadow' : 'text-slate-600'}`}>Đánh giá tour</button><button onClick={() => switchType('guide')} className={`rounded-xl px-5 py-2.5 text-sm font-bold ${type === 'guide' ? 'bg-blue-600 text-white shadow' : 'text-slate-600'}`}>Đánh giá HDV</button></div>
    <section className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_170px_auto]"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Tìm khách hàng, tour, HDV hoặc booking..." className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/><select value={rating} onChange={(event) => { setRating(event.target.value); setPage(1) }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="">Tất cả số sao</option>{[5,4,3,2,1].map((item) => <option key={item} value={item}>{item} sao</option>)}</select><div className="flex items-center rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-600">Tổng: {pagination.total || reviews.length}</div></section>
    {error ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Khách hàng', type === 'tour' ? 'Tour / Booking' : 'Hướng dẫn viên / Tour', 'Số sao', 'Nội dung', 'Ngày gửi', 'Thao tác'].map((item) => <th key={item} className="px-5 py-4">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
      {loading ? <tr><td colSpan={6} className="px-5 py-14 text-center text-slate-500">Đang tải đánh giá đã ẩn...</td></tr> : reviews.length === 0 ? <tr><td colSpan={6} className="px-5 py-14 text-center text-slate-500">Chưa có đánh giá {type === 'tour' ? 'tour' : 'HDV'} nào bị ẩn.</td></tr> : reviews.map((review) => <tr key={review.id} className="align-top hover:bg-slate-50/70"><td className="px-5 py-4"><strong className="block text-slate-900">{review.reviewer?.full_name || '-'}</strong><span className="text-xs text-slate-500">{review.reviewer?.email || ''}</span></td><td className="px-5 py-4"><strong className="block text-slate-800">{type === 'tour' ? review.tour?.title : review.guide?.full_name}</strong><span className="text-xs font-semibold text-blue-600">{type === 'tour' ? review.booking?.booking_code : review.tour?.title}</span></td><td className="px-5 py-4 font-black text-amber-500">{'★'.repeat(Number(review.rating || 0))} <span className="text-slate-600">{review.rating}/5</span></td><td className="max-w-[350px] px-5 py-4 leading-6 text-slate-600">{review.comment || 'Không có nội dung.'}</td><td className="px-5 py-4 text-xs text-slate-500">{formatDate(review.created_at)}</td><td className="px-5 py-4"><button disabled={restoring === review.id} onClick={() => void restore(review)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">{restoring === review.id ? 'Đang khôi phục...' : 'Hiển thị lại'}</button></td></tr>)}
    </tbody></table></div><footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm"><span className="text-slate-500">Trang {page}/{lastPage}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-bold disabled:opacity-40">Trước</button><button disabled={page >= lastPage || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-40">Sau</button></div></footer></section>
  </div>
}

function formatDate(value) { if (!value) return '-'; const date = new Date(String(value).replace(' ', 'T')); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN') }
