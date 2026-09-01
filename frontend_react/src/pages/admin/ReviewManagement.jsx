import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import {
  getAdminGuideReviews,
  getAdminTourReviews,
  updateAdminGuideReviewStatus,
} from '../../services/adminReviewApi'

const BLUE = {
  primary: '#2563eb',
  dark: '#1d4ed8',
  navy: '#0f172a',
  soft: '#eff6ff',
  softer: '#f8fbff',
  border: '#dbeafe',
  muted: '#64748b',
  green: '#059669',
  orange: '#ea580c',
  red: '#dc2626',
}

function Stars({ rating = 0 }) {
  const value = Number(rating || 0)

  return (
    <span
      title={`${value.toFixed(1)} sao`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          color: '#f59e0b',
          fontSize: 16,
          letterSpacing: 1,
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= Math.round(value) ? '★' : '☆'}
          </span>
        ))}
      </span>

      <strong
        style={{
          color: '#334155',
          fontSize: 13,
        }}
      >
        {value.toFixed(2)}
      </strong>
    </span>
  )
}

function TourThumb({ title, imageUrl }) {
  const normalizedUrl = imageUrl
    ? String(imageUrl).startsWith('http')
      ? imageUrl
      : `${(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '')}/${String(imageUrl).replace(/^\//, '')}`
    : ''

  return (
    <span
      style={{
        display: 'grid',
        position: 'relative',
        flex: '0 0 auto',
        placeItems: 'center',
        width: 74,
        height: 54,
        borderRadius: 12,
        background:
          'linear-gradient(135deg, #bfdbfe 0%, #dbeafe 50%, #e0e7ff 100%)',
        color: BLUE.dark,
        fontSize: 23,
        fontWeight: 900,
        boxShadow: 'inset 0 0 0 1px rgba(37,99,235,.12)',
      }}
      title={title}
    >
      {normalizedUrl && (
        <img
          src={normalizedUrl}
          alt={title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            borderRadius: 12,
            objectFit: 'cover',
          }}
        />
      )}
      🗺
    </span>
  )
}

const GUIDE_REVIEW_STATUS = {
  visible: { label: 'Đang hiển thị', color: BLUE.green, background: '#ecfdf5' },
  hidden: { label: 'Đã ẩn', color: BLUE.orange, background: '#fff7ed' },
  spam: { label: 'Đánh dấu rác', color: BLUE.red, background: '#fef2f2' },
}

function GuideReviewPanel() {
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState({})
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 })
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [rating, setRating] = useState('')
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadGuideReviews = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await getAdminGuideReviews({
        page,
        per_page: 15,
        search: search || undefined,
        status: status || undefined,
        rating: rating || undefined,
      })

      setReviews(Array.isArray(result.reviews) ? result.reviews : [])
      setSummary(result.summary || {})
      setPagination(result.pagination || {})
    } catch (loadError) {
      setReviews([])
      setError(
        loadError?.response?.data?.message
          || 'Không thể tải danh sách đánh giá hướng dẫn viên.',
      )
    } finally {
      setLoading(false)
    }
  }, [page, rating, search, status])

  useEffect(() => {
    void loadGuideReviews()
  }, [loadGuideReviews])

  const handleFilter = (event) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleStatusChange = async (reviewId, nextStatus) => {
    try {
      setUpdatingId(reviewId)
      setError('')
      setNotice('')
      await updateAdminGuideReviewStatus(reviewId, nextStatus)
      setNotice('Cập nhật trạng thái đánh giá thành công.')
      await loadGuideReviews()
    } catch (updateError) {
      setError(
        updateError?.response?.data?.message
          || 'Không thể cập nhật trạng thái đánh giá.',
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const lastPage = Math.max(Number(pagination.last_page || 1), 1)
  const total = Number(pagination.total || summary.total || reviews.length)

  return (
    <section style={{ overflow: 'hidden', border: '1px solid #dbeafe', borderRadius: 20, background: '#fff', boxShadow: '0 14px 36px rgba(37, 99, 235, 0.06)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, padding: 16, background: '#f8fbff', borderBottom: '1px solid #dbeafe' }}>
        {[
          ['Tổng đánh giá', summary.total || 0, BLUE.primary],
          ['Đang hiển thị', summary.visible || 0, BLUE.green],
          ['Đã ẩn', summary.hidden || 0, BLUE.orange],
          ['Đánh dấu rác', summary.spam || 0, BLUE.red],
          ['Điểm trung bình', Number(summary.average_rating || 0).toFixed(2), '#f59e0b'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ padding: 15, border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff' }}>
            <div style={{ color: BLUE.muted, fontSize: 12, fontWeight: 700 }}>{label}</div>
            <strong style={{ display: 'block', marginTop: 7, color, fontSize: 24 }}>{value}</strong>
          </div>
        ))}
      </div>

      <form onSubmit={handleFilter} style={{ display: 'flex', gap: 10, padding: 16, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Tìm khách hàng, HDV, tour hoặc mã booking..."
          style={{ flex: '1 1 330px', minWidth: 240, padding: '11px 13px', border: '1px solid #cbd5e1', borderRadius: 11, outline: 0 }}
        />
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} style={filterSelectStyle()}>
          <option value="">Tất cả trạng thái</option>
          <option value="visible">Đang hiển thị</option>
          <option value="hidden">Đã ẩn</option>
          <option value="spam">Đánh dấu rác</option>
        </select>
        <select value={rating} onChange={(event) => { setRating(event.target.value); setPage(1) }} style={filterSelectStyle()}>
          <option value="">Tất cả số sao</option>
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao</option>)}
        </select>
        <button type="submit" style={{ padding: '11px 18px', border: 0, borderRadius: 11, background: BLUE.primary, color: '#fff', fontWeight: 900, cursor: 'pointer' }}>Tìm kiếm</button>
      </form>

      {error ? <div role="alert" style={{ margin: 16, padding: 13, border: '1px solid #fecaca', borderRadius: 11, background: '#fef2f2', color: '#b91c1c', fontWeight: 700 }}>{error}</div> : null}
      {notice ? <div role="status" style={{ margin: 16, padding: 13, border: '1px solid #a7f3d0', borderRadius: 11, background: '#ecfdf5', color: '#047857', fontWeight: 700 }}>{notice}</div> : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['Khách hàng', 'Hướng dẫn viên', 'Tour / Booking', 'Đánh giá', 'Nội dung', 'Ngày tạo', 'Trạng thái', 'Thao tác'].map((heading) => (
              <th key={heading} style={{ padding: '14px 15px', borderBottom: '1px solid #e2e8f0', color: BLUE.muted, fontSize: 11, textAlign: 'left', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{heading}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 50, textAlign: 'center', color: BLUE.muted }}>Đang tải đánh giá hướng dẫn viên...</td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 50, textAlign: 'center', color: BLUE.muted }}>Không có đánh giá phù hợp.</td></tr>
            ) : reviews.map((review) => {
              const statusInfo = GUIDE_REVIEW_STATUS[review.status] || { label: review.status, color: BLUE.muted, background: '#f1f5f9' }
              return (
                <tr key={review.id}>
                  <td style={cellStyle()}><strong>{review.reviewer?.full_name || '-'}</strong><small style={subTextStyle()}>{review.reviewer?.email || ''}</small></td>
                  <td style={cellStyle()}><strong>{review.guide?.full_name || '-'}</strong><small style={subTextStyle()}>{review.guide?.guide_code || ''}</small></td>
                  <td style={cellStyle()}><strong>{review.tour?.title || '-'}</strong><small style={subTextStyle()}>{review.booking?.booking_code || ''}</small></td>
                  <td style={cellStyle()}><Stars rating={review.rating} /></td>
                  <td style={{ ...cellStyle(), maxWidth: 300 }}><span style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>{review.comment || 'Không có nội dung'}</span></td>
                  <td style={cellStyle()}>{formatAdminReviewDate(review.created_at)}</td>
                  <td style={cellStyle()}><span style={{ display: 'inline-flex', padding: '6px 9px', borderRadius: 999, background: statusInfo.background, color: statusInfo.color, fontSize: 11, fontWeight: 900 }}>{statusInfo.label}</span></td>
                  <td style={cellStyle()}>
                    <select
                      value={review.status}
                      disabled={updatingId === review.id}
                      onChange={(event) => void handleStatusChange(review.id, event.target.value)}
                      style={{ ...filterSelectStyle(), minWidth: 135, opacity: updatingId === review.id ? 0.6 : 1 }}
                      aria-label={`Trạng thái đánh giá #${review.id}`}
                    >
                      <option value="visible">Hiển thị</option>
                      <option value="hidden">Ẩn</option>
                      <option value="spam">Rác</option>
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 15, borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap' }}>
        <span style={{ color: BLUE.muted, fontSize: 12 }}>Tổng cộng {total} đánh giá</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(current - 1, 1))} style={pageButtonStyle(page <= 1 || loading)}>Trước</button>
          <strong style={{ color: BLUE.dark, fontSize: 13 }}>Trang {page}/{lastPage}</strong>
          <button type="button" disabled={page >= lastPage || loading} onClick={() => setPage((current) => Math.min(current + 1, lastPage))} style={pageButtonStyle(page >= lastPage || loading)}>Sau</button>
        </div>
      </footer>
    </section>
  )
}

GuideReviewPanel.displayName = 'GuideReviewPanel'

function GuideDirectoryPanel() {
  const [reviews, setReviews] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('reviews_desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await getAdminGuideReviews({ per_page: 100, page: 1 })
        const lastPage = Math.max(Number(result.pagination?.last_page || 1), 1)
        const remainingResults = await Promise.all(
          Array.from(
            { length: lastPage - 1 },
            (_, index) => getAdminGuideReviews({ per_page: 100, page: index + 2 }),
          ),
        )
        const allReviews = [result, ...remainingResults]
          .flatMap((item) => item.reviews || [])
          .filter((review, index, items) => items.findIndex((item) => item.id === review.id) === index)
        if (!cancelled) {
          setReviews(allReviews)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.message || 'Không thể tải danh sách hướng dẫn viên.')
          setReviews([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  const guides = useMemo(() => {
    const grouped = new Map()
    reviews.forEach((review) => {
      const guide = review.guide
      if (!guide?.id) return
      if (!grouped.has(guide.id)) grouped.set(guide.id, { ...guide, total: 0, visible: 0, hidden: 0, spam: 0, ratingTotal: 0 })
      const item = grouped.get(guide.id)
      item.total += 1
      item.ratingTotal += Number(review.rating || 0)
      if (review.status === 'visible') item.visible += 1
      if (review.status === 'hidden') item.hidden += 1
      if (review.status === 'spam') item.spam += 1
    })

    const keyword = search.trim().toLocaleLowerCase('vi-VN')
    return Array.from(grouped.values())
      .map((guide) => ({ ...guide, reviewAverage: guide.total ? guide.ratingTotal / guide.total : 0 }))
      .filter((guide) => !keyword || `${guide.full_name} ${guide.guide_code} ${guide.email}`.toLocaleLowerCase('vi-VN').includes(keyword))
      .sort((a, b) => {
        if (sort === 'name') return String(a.full_name).localeCompare(String(b.full_name), 'vi')
        if (sort === 'rating') return b.reviewAverage - a.reviewAverage
        return b.total - a.total
      })
  }, [reviews, search, sort])

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, mã hoặc email hướng dẫn viên..." className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none">
          <option value="reviews_desc">Nhiều đánh giá nhất</option>
          <option value="rating">Điểm cao nhất</option>
          <option value="name">Tên A-Z</option>
        </select>
      </div>
      {error ? <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Hướng dẫn viên', 'Tổng đánh giá', 'Điểm trung bình', 'Đang hiển thị', 'Đã ẩn', 'Rác', 'Thao tác'].map((item) => <th key={item} className="px-5 py-4">{item}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">Đang tải danh sách hướng dẫn viên...</td></tr> : guides.length === 0 ? <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">Chưa có hướng dẫn viên phù hợp.</td></tr> : guides.map((guide) => (
              <tr key={guide.id} className="transition hover:bg-blue-50/40">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-blue-100 font-black text-blue-700">{String(guide.full_name || 'H').charAt(0).toUpperCase()}</div><div><strong className="block text-slate-900">{guide.full_name || 'Chưa cập nhật'}</strong><span className="text-xs text-slate-500">{guide.guide_code || `HDV-${guide.id}`} · {guide.email || ''}</span></div></div></td>
                <td className="px-5 py-4 font-bold text-slate-800">{guide.total}</td><td className="px-5 py-4"><Stars rating={guide.reviewAverage} /></td><td className="px-5 py-4 font-bold text-emerald-600">{guide.visible}</td><td className="px-5 py-4 font-bold text-amber-600">{guide.hidden}</td><td className="px-5 py-4 font-bold text-red-600">{guide.spam}</td>
                <td className="px-5 py-4"><Link to={`/admin/reviews/guides/${guide.id}`} className="inline-flex h-9 items-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700">Xem đánh giá →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function formatAdminReviewDate(value) {
  if (!value) return '-'
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN')
}

function filterSelectStyle() {
  return { minWidth: 155, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 11, background: '#fff', color: '#334155', fontWeight: 700 }
}

function subTextStyle() {
  return { display: 'block', marginTop: 4, color: '#94a3b8', fontSize: 11 }
}

function pageButtonStyle(disabled) {
  return { padding: '8px 12px', border: '1px solid #bfdbfe', borderRadius: 9, background: disabled ? '#f1f5f9' : '#fff', color: disabled ? '#94a3b8' : BLUE.dark, fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer' }
}

export default function ReviewManagement() {
  const [activeTab, setActiveTab] = useState('tour')
  const [reviews, setReviews] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('reviews_desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadReviews = useCallback(async () => {
    if (activeTab !== 'tour') return

    try {
      setLoading(true)
      setError('')

      const result = await getAdminTourReviews({
        per_page: 100,
      })

      setReviews(Array.isArray(result.reviews) ? result.reviews : [])
    } catch (loadError) {
      setReviews([])
      setError(
        loadError?.response?.data?.message
          || 'Không thể tải danh sách đánh giá tour.',
      )
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    void loadReviews()
  }, [loadReviews])

  const groupedTours = useMemo(() => {
    const map = new Map()

    reviews.forEach((review) => {
      const tour = review.tour || {}
      const id = Number(tour.id || review.tour_id)

      if (!id) return

      if (!map.has(id)) {
        map.set(id, {
          id,
          title: tour.title || `Tour #${id}`,
          code: tour.code || tour.slug || `TOUR-${id}`,
          thumbnailUrl: tour.thumbnail_url || '',
          total: 0,
          visible: 0,
          hidden: 0,
          spam: 0,
          ratingTotal: 0,
        })
      }

      const item = map.get(id)
      item.total += 1
      item.ratingTotal += Number(review.rating || 0)

      if (review.status === 'visible') item.visible += 1
      if (review.status === 'hidden') item.hidden += 1
      if (review.status === 'spam') item.spam += 1
    })

    const keyword = search.trim().toLowerCase()

    const list = Array.from(map.values())
      .map((item) => ({
        ...item,
        average: item.total ? item.ratingTotal / item.total : 0,
      }))
      .filter((item) => {
        if (!keyword) return true

        return (
          item.title.toLowerCase().includes(keyword)
          || item.code.toLowerCase().includes(keyword)
        )
      })

    return list.sort((a, b) => {
      if (sort === 'reviews_asc') return a.total - b.total
      if (sort === 'rating_desc') return b.average - a.average
      if (sort === 'rating_asc') return a.average - b.average
      if (sort === 'name_asc') return a.title.localeCompare(b.title, 'vi')

      return b.total - a.total
    })
  }, [reviews, search, sort])

  const totalTours = groupedTours.length

  return (
    <div
      style={{
        minHeight: '100%',
        padding: 24,
        background: '#f8fafc',
        color: BLUE.navy,
      }}
    >
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Đánh Giá']}
        title="Quản lý đánh giá"
        description="Theo dõi và quản lý đánh giá của khách hàng theo từng tour."
        actions={
          <Link
            to="/admin/reviews/hidden"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '12px 17px',
              border: '1px solid rgba(255,255,255,.25)',
              borderRadius: 13,
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 900,
              textDecoration: 'none',
              boxShadow: '0 12px 28px rgba(37, 99, 235, 0.24)',
            }}
          >
            Đánh giá đã ẩn
          </Link>
        }
      />

      <section
        style={{
          position: 'relative',
          display: 'none',
          overflow: 'hidden',
          marginBottom: 22,
          padding: '28px 30px',
          border: '1px solid #dbeafe',
          borderRadius: 22,
          background:
            'linear-gradient(135deg, #ffffff 0%, #eff6ff 58%, #dbeafe 100%)',
          boxShadow: '0 16px 40px rgba(37, 99, 235, 0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -90,
            top: -115,
            width: 310,
            height: 310,
            borderRadius: '50%',
            background: 'rgba(96,165,250,.12)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                lineHeight: 1.2,
                fontWeight: 950,
                letterSpacing: '-0.03em',
              }}
            >
              Quản lý đánh giá
            </h1>

            <p
              style={{
                margin: '9px 0 0',
                color: BLUE.muted,
                fontSize: 14,
              }}
            >
              Theo dõi và quản lý đánh giá của khách hàng theo từng tour.
            </p>
          </div>

          <Link
            to="/admin/reviews/hidden"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '12px 17px',
              border: '1px solid rgba(255,255,255,.25)',
              borderRadius: 13,
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 900,
              textDecoration: 'none',
              boxShadow: '0 12px 28px rgba(37, 99, 235, 0.24)',
            }}
          >
            ◌ Đánh giá đã ẩn
          </Link>
        </div>
      </section>

      <div
        style={{
          display: 'inline-flex',
          gap: 6,
          marginBottom: 20,
          padding: 6,
          border: '1px solid #dbeafe',
          borderRadius: 14,
          background: '#fff',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.06)',
        }}
      >
        {[
          { key: 'tour', label: 'Đánh giá tour', icon: '🗺' },
          { key: 'guide', label: 'Đánh giá HDV', icon: '🧭' },
        ].map((tab) => {
          const active = activeTab === tab.key

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: 0,
                borderRadius: 10,
                padding: '11px 17px',
                background: active ? BLUE.soft : 'transparent',
                color: active ? BLUE.dark : BLUE.muted,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: active ? 'inset 0 0 0 1px #bfdbfe' : 'none',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'guide' ? (
        <>
          <GuideDirectoryPanel />
        <section hidden
          style={{
            display: 'grid',
            placeItems: 'center',
            minHeight: 370,
            padding: 36,
            border: '1px solid #dbeafe',
            borderRadius: 20,
            background: '#fff',
            textAlign: 'center',
            boxShadow: '0 12px 34px rgba(37, 99, 235, 0.06)',
          }}
        >
          <div>
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 76,
                height: 76,
                margin: '0 auto',
                borderRadius: 22,
                background: BLUE.soft,
                color: BLUE.dark,
                fontSize: 34,
              }}
            >
              🧭
            </div>

            <h2
              style={{
                margin: '18px 0 8px',
                fontSize: 22,
              }}
            >
              Quản lý đánh giá hướng dẫn viên
            </h2>

            <p
              style={{
                maxWidth: 540,
                margin: '0 auto',
                color: BLUE.muted,
                lineHeight: 1.65,
              }}
            >
              Tab quản lý đánh giá HDV được giữ nguyên. Bạn có thể gắn API danh
              sách đánh giá HDV vào khu vực này khi backend đã trả dữ liệu.
            </p>
          </div>
        </section>
        </>
      ) : (
        <>
          <section
            style={{
              overflow: 'hidden',
              border: '1px solid #dbeafe',
              borderRadius: 20,
              background: '#fff',
              boxShadow: '0 14px 36px rgba(37, 99, 235, 0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: 16,
                borderBottom: '1px solid #e2e8f0',
                flexWrap: 'wrap',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 280,
                  flex: '1 1 380px',
                  padding: '0 13px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 11,
                  background: '#fff',
                }}
              >
                <span style={{ color: '#94a3b8' }}>⌕</span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm kiếm tour..."
                  style={{
                    width: '100%',
                    border: 0,
                    outline: 0,
                    padding: '11px 0',
                    background: 'transparent',
                    color: BLUE.navy,
                  }}
                />
              </label>

              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                style={{
                  minWidth: 190,
                  border: '1px solid #cbd5e1',
                  borderRadius: 11,
                  padding: '11px 13px',
                  background: '#fff',
                  color: '#334155',
                  fontWeight: 700,
                }}
              >
                <option value="reviews_desc">Nhiều đánh giá nhất</option>
                <option value="reviews_asc">Ít đánh giá nhất</option>
                <option value="rating_desc">Điểm cao nhất</option>
                <option value="rating_asc">Điểm thấp nhất</option>
                <option value="name_asc">Tên tour A-Z</option>
              </select>
            </div>

            {error ? (
              <div
                role="alert"
                style={{
                  margin: 16,
                  padding: 14,
                  border: '1px solid #fecaca',
                  borderRadius: 12,
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontWeight: 800,
                }}
              >
                {error}
              </div>
            ) : null}

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: 1080,
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {[
                      'Tour',
                      'Tổng đánh giá',
                      'Điểm trung bình',
                      'Đang hiển thị',
                      'Đã ẩn',
                      'Đánh dấu rác',
                      'Thao tác',
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: '15px 16px',
                          borderBottom: '1px solid #e2e8f0',
                          color: '#64748b',
                          fontSize: 11,
                          textAlign: 'left',
                          textTransform: 'uppercase',
                          letterSpacing: '.05em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: 52,
                          textAlign: 'center',
                          color: BLUE.muted,
                        }}
                      >
                        Đang tải danh sách tour...
                      </td>
                    </tr>
                  ) : groupedTours.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: 52,
                          textAlign: 'center',
                          color: BLUE.muted,
                        }}
                      >
                        Chưa có tour phù hợp.
                      </td>
                    </tr>
                  ) : (
                    groupedTours.map((tour) => {
                      const visiblePercent = tour.total
                        ? ((tour.visible / tour.total) * 100).toFixed(1)
                        : '0.0'
                      const hiddenPercent = tour.total
                        ? ((tour.hidden / tour.total) * 100).toFixed(1)
                        : '0.0'
                      const spamPercent = tour.total
                        ? ((tour.spam / tour.total) * 100).toFixed(1)
                        : '0.0'

                      return (
                        <tr key={tour.id}>
                          <td style={cellStyle()}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                              }}
                            >
                              <TourThumb title={tour.title} imageUrl={tour.thumbnailUrl} />

                              <div>
                                <strong
                                  style={{
                                    display: 'block',
                                    maxWidth: 320,
                                    color: BLUE.navy,
                                    fontSize: 14,
                                    lineHeight: 1.45,
                                  }}
                                >
                                  {tour.title}
                                </strong>

                                <span
                                  style={{
                                    display: 'block',
                                    marginTop: 4,
                                    color: '#94a3b8',
                                    fontSize: 11,
                                  }}
                                >
                                  Mã tour: {tour.code}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td style={cellStyle()}>
                            <strong
                              style={{
                                display: 'block',
                                color: BLUE.navy,
                                fontSize: 16,
                              }}
                            >
                              {tour.total}
                            </strong>

                            <span
                              style={{
                                color: '#94a3b8',
                                fontSize: 11,
                              }}
                            >
                              đánh giá
                            </span>
                          </td>

                          <td style={cellStyle()}>
                            <Stars rating={tour.average} />
                          </td>

                          <td style={cellStyle()}>
                            <strong style={{ color: BLUE.green }}>
                              {tour.visible}
                            </strong>

                            <div
                              style={{
                                marginTop: 4,
                                color: BLUE.green,
                                fontSize: 11,
                              }}
                            >
                              ({visiblePercent}%)
                            </div>
                          </td>

                          <td style={cellStyle()}>
                            <strong style={{ color: BLUE.orange }}>
                              {tour.hidden}
                            </strong>

                            <div
                              style={{
                                marginTop: 4,
                                color: BLUE.orange,
                                fontSize: 11,
                              }}
                            >
                              ({hiddenPercent}%)
                            </div>
                          </td>

                          <td style={cellStyle()}>
                            <strong style={{ color: BLUE.red }}>
                              {tour.spam}
                            </strong>

                            <div
                              style={{
                                marginTop: 4,
                                color: BLUE.red,
                                fontSize: 11,
                              }}
                            >
                              ({spamPercent}%)
                            </div>
                          </td>

                          <td style={cellStyle()}>
                            <Link
                              to={`/admin/reviews/tours/${tour.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 9,
                                padding: '9px 12px',
                                border: '1px solid #bfdbfe',
                                borderRadius: 10,
                                background: BLUE.soft,
                                color: BLUE.dark,
                                fontSize: 12,
                                fontWeight: 900,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Xem đánh giá
                              <span>›</span>
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <footer
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  color: BLUE.muted,
                  fontSize: 12,
                }}
              >
                Hiển thị {totalTours} tour có đánh giá
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 34,
                  height: 34,
                  borderRadius: 9,
                  background: BLUE.primary,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                1
              </span>
            </footer>
          </section>
        </>
      )}
    </div>
  )
}

function cellStyle() {
  return {
    padding: 16,
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
  }
}
