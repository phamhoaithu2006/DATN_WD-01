import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAdminGuideReviews, updateAdminGuideReviewStatus } from '../../services/adminReviewApi'

const STATUS = {
  visible: ['Đang hiển thị', 'bg-emerald-50 text-emerald-700'],
  hidden: ['Đã ẩn', 'bg-amber-50 text-amber-700'],
  spam: ['Rác', 'bg-red-50 text-red-700'],
}

export default function GuideReviewDetailManagement() {
  const { guideId } = useParams()
  const [reviews, setReviews] = useState([])
  const [pagination, setPagination] = useState({})
  const [guide, setGuide] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [rating, setRating] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await getAdminGuideReviews({ guide_id: Number(guideId), page, per_page: 15, search: search || undefined, rating: rating || undefined, status: status || undefined })
      const rows = Array.isArray(result.reviews) ? result.reviews : []
      setReviews(rows)
      setPagination(result.pagination || {})
      if (rows[0]?.guide) setGuide(rows[0].guide)
    } catch (loadError) {
      setError(loadError?.response?.data?.message || 'Không thể tải đánh giá của hướng dẫn viên.')
    } finally {
      setLoading(false)
    }
  }, [guideId, page, rating, search, status])

  useEffect(() => { void load() }, [load])

  const changeStatus = async (reviewId, nextStatus) => {
    try {
      setUpdating(reviewId)
      await updateAdminGuideReviewStatus(reviewId, nextStatus)
      await load()
    } catch (updateError) {
      setError(updateError?.response?.data?.message || 'Không thể cập nhật trạng thái đánh giá.')
    } finally {
      setUpdating(null)
    }
  }

  const lastPage = Math.max(Number(pagination.last_page || 1), 1)

  return (
    <div className="min-h-full bg-slate-50 p-6 lg:p-8">
      <header className="mb-6 flex flex-col justify-between gap-4 rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-indigo-100 p-7 shadow-sm md:flex-row md:items-center">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Đánh giá hướng dẫn viên</p><h1 className="mt-2 text-3xl font-black text-slate-900">{guide?.full_name || `Hướng dẫn viên #${guideId}`}</h1><p className="mt-2 text-sm text-slate-600">{guide?.guide_code || ''} {guide?.email ? `· ${guide.email}` : ''}</p></div>
        <Link to="/admin/reviews" className="inline-flex h-11 items-center justify-center rounded-xl border border-blue-200 bg-white px-5 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50">← Danh sách hướng dẫn viên</Link>
      </header>

      <section className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_170px_190px]">
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Tìm khách hàng, tour, booking, nội dung..." className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        <select value={rating} onChange={(event) => { setRating(event.target.value); setPage(1) }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="">Tất cả số sao</option>{[5,4,3,2,1].map((item) => <option key={item} value={item}>{item} sao</option>)}</select>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="">Tất cả trạng thái</option><option value="visible">Đang hiển thị</option><option value="hidden">Đã ẩn</option><option value="spam">Rác</option></select>
      </section>

      {error ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Khách hàng','Tour / Booking','Số sao','Nội dung','Ngày gửi','Trạng thái','Thao tác'].map((item) => <th key={item} className="px-5 py-4">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
          {loading ? <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">Đang tải đánh giá...</td></tr> : reviews.length === 0 ? <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">Không có đánh giá phù hợp.</td></tr> : reviews.map((review) => {
            const meta = STATUS[review.status] || [review.status, 'bg-slate-100 text-slate-700']
            return <tr key={review.id} className="align-top hover:bg-slate-50/70"><td className="px-5 py-4"><strong className="block text-slate-900">{review.reviewer?.full_name || '-'}</strong><span className="text-xs text-slate-500">{review.reviewer?.email || ''}</span></td><td className="px-5 py-4"><strong className="block max-w-[230px] text-slate-800">{review.tour?.title || '-'}</strong><span className="text-xs font-semibold text-blue-600">{review.booking?.booking_code || ''}</span></td><td className="px-5 py-4 font-black text-amber-500">{'★'.repeat(Number(review.rating || 0))}<span className="ml-2 text-slate-600">{review.rating}/5</span></td><td className="max-w-[320px] px-5 py-4 leading-6 text-slate-600">{review.comment || 'Không có nội dung.'}</td><td className="px-5 py-4 text-xs text-slate-500">{formatDate(review.created_at)}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${meta[1]}`}>{meta[0]}</span></td><td className="px-5 py-4"><select value={review.status} disabled={updating === review.id} onChange={(event) => void changeStatus(review.id, event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold"><option value="visible">Hiển thị</option><option value="hidden">Ẩn</option><option value="spam">Rác</option></select></td></tr>
          })}
        </tbody></table></div>
        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm"><span className="text-slate-500">Trang {page}/{lastPage}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 disabled:opacity-40">Trước</button><button disabled={page >= lastPage || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-40">Sau</button></div></footer>
      </section>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN')
}
