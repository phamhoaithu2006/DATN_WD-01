import { useEffect, useMemo, useState } from 'react'
import { getGuideReviews } from '../../../services/guideTourApi'

const PAGE_SIZE = 6


const CUSTOMER_OBJECT_KEYS = [
  'customer',
  'user',
  'reviewer',
  'traveler',
  'tourist',
  'client',
  'guest',
  'account',
  'created_by',
  'createdBy',
]

const CUSTOMER_NAME_KEYS = [
  'full_name',
  'fullName',
  'fullname',
  'display_name',
  'displayName',
  'customer_name',
  'customerName',
  'user_name',
  'userName',
  'reviewer_name',
  'reviewerName',
  'name',
]

const AVATAR_KEYS = [
  'avatar_url',
  'avatarUrl',
  'avatar',
  'profile_photo_url',
  'profilePhotoUrl',
  'photo_url',
  'photoUrl',
  'image_url',
  'imageUrl',
]

function cleanText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getNameFromObject(value) {
  if (!value || typeof value !== 'object') return null

  for (const key of CUSTOMER_NAME_KEYS) {
    const name = cleanText(value?.[key])
    if (name) return name
  }

  const firstName =
    cleanText(value?.first_name) ||
    cleanText(value?.firstName)

  const lastName =
    cleanText(value?.last_name) ||
    cleanText(value?.lastName)

  const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim()

  return combinedName || null
}

function getCustomerName(review) {
  if (!review || typeof review !== 'object') return null

  // Ưu tiên các trường tên nằm trực tiếp trong review.
  const directName = getNameFromObject(review)
  if (directName) return directName

  // Các vị trí backend thường trả thông tin khách hàng.
  const commonPaths = [
    review?.customer,
    review?.user,
    review?.reviewer,
    review?.traveler,
    review?.tourist,
    review?.client,
    review?.guest,
    review?.account,
    review?.created_by,
    review?.createdBy,
    review?.booking?.customer,
    review?.booking?.user,
    review?.booking?.reviewer,
    review?.booking?.traveler,
    review?.booking?.tourist,
    review?.tour_booking?.customer,
    review?.tour_booking?.user,
    review?.tourBooking?.customer,
    review?.tourBooking?.user,
    review?.order?.customer,
    review?.order?.user,
    review?.reservation?.customer,
    review?.reservation?.user,
  ]

  for (const item of commonPaths) {
    const name = getNameFromObject(item)
    if (name) return name
  }

  // Tìm có giới hạn trong object lồng sâu để hỗ trợ response khác cấu trúc.
  const visited = new WeakSet()

  function search(value, depth = 0) {
    if (!value || typeof value !== 'object' || depth > 5) return null
    if (visited.has(value)) return null

    visited.add(value)

    for (const key of CUSTOMER_OBJECT_KEYS) {
      const name = getNameFromObject(value?.[key])
      if (name) return name
    }

    for (const [key, child] of Object.entries(value)) {
      if (
        key === 'guide' ||
        key === 'tour_guide' ||
        key === 'tourGuide' ||
        key === 'staff' ||
        key === 'employee'
      ) {
        continue
      }

      if (child && typeof child === 'object') {
        const found = search(child, depth + 1)
        if (found) return found
      }
    }

    return null
  }

  return search(review)
}

function getCustomerAvatar(review) {
  if (!review || typeof review !== 'object') return null

  const candidates = [
    review,
    review?.customer,
    review?.user,
    review?.reviewer,
    review?.traveler,
    review?.tourist,
    review?.client,
    review?.guest,
    review?.account,
    review?.created_by,
    review?.createdBy,
    review?.booking?.customer,
    review?.booking?.user,
    review?.tour_booking?.customer,
    review?.tourBooking?.customer,
    review?.order?.customer,
    review?.reservation?.customer,
  ]

  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue

    for (const key of AVATAR_KEYS) {
      const avatar = cleanText(item?.[key])
      if (avatar) return avatar
    }
  }

  return null
}

function extractReviewList(response) {
  const candidates = [
    response?.data?.data?.data,
    response?.data?.data,
    response?.data?.reviews,
    response?.data?.items,
    response?.reviews,
    response?.items,
    response?.data,
  ]

  return candidates.find(Array.isArray) || []
}


function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    star: (
      <path d="m12 2.75 2.82 5.72 6.31.92-4.57 4.45 1.08 6.28L12 17.15l-5.64 2.97 1.08-6.28-4.57-4.45 6.31-.92L12 2.75Z" />
    ),
    message: (
      <>
        <path d="M8 10h8M8 14h5" />
        <path d="M6.5 19.5 3 21l1.5-3.5A8.5 8.5 0 1 1 6.5 19.5Z" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    filter: (
      <>
        <path d="M4 5h16M7 12h10M10 19h4" />
      </>
    ),
    chevronDown: <path d="m7 10 5 5 5-5" />,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    refresh: (
      <>
        <path d="M20 11a8 8 0 1 0-2.34 5.66" />
        <path d="M20 4v7h-7" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill={name === 'star' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Stars({ rating, size = 'text-lg' }) {
  const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)))

  return (
    <div className={`flex items-center gap-1 ${size}`} aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map(star => (
        <Icon
          key={star}
          name="star"
          className={`h-[1em] w-[1em] ${star <= value ? 'text-amber-400' : 'text-slate-200'}`}
        />
      ))}
    </div>
  )
}

function MountainCloudDecoration() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 overflow-hidden opacity-90">
      <svg viewBox="0 0 1440 180" preserveAspectRatio="none" className="h-full w-full">
        <path
          d="M0 112c122-38 174-20 278 8 112 30 184-5 278-18 115-16 171 32 275 31 108-1 159-49 278-33 100 13 177 61 331 35v45H0Z"
          fill="#dbeafe"
        />
        <path
          d="M0 137c105-24 174-11 270 11 122 27 212-23 333-8 123 15 181 42 298 28 126-16 210-48 326-17 73 19 133 24 213 13v16H0Z"
          fill="#bfdbfe"
        />
      </svg>
    </div>
  )
}

function EmptyState({ filtered, onReset }) {
  return (
    <div className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <MountainCloudDecoration />

      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[28px] bg-blue-50 text-blue-600 shadow-[0_12px_35px_rgba(37,99,235,0.12)] ring-1 ring-blue-100">
        <Icon name={filtered ? 'search' : 'message'} className="h-9 w-9" />
      </div>

      <h3 className="relative z-10 mt-5 text-lg font-bold text-slate-900">
        {filtered ? 'Không có đánh giá phù hợp' : 'Chưa có đánh giá'}
      </h3>

      <p className="relative z-10 mt-2 max-w-md text-sm leading-6 text-slate-500">
        {filtered
          ? 'Chưa có đánh giá ở mức sao bạn đã chọn. Hãy thử xem toàn bộ phản hồi.'
          : 'Các đánh giá mới sẽ xuất hiện tại đây sau khi khách hàng hoàn thành chuyến đi.'}
      </p>

      {filtered && (
        <button
          type="button"
          onClick={onReset}
          className="relative z-10 mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
        >
          Xem tất cả đánh giá
        </button>
      )}
    </div>
  )
}

export default function GuideReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState({ average_rating: 0, review_count: 0 })
  const [selectedRating, setSelectedRating] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReviews()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [selectedRating])

  async function loadReviews() {
    try {
      setLoading(true)
      setError('')

      const res = await getGuideReviews()
      const list = extractReviewList(res)

      console.log('Guide reviews response:', res)
      console.log('Review đầu tiên:', list?.[0])

      setReviews(list)
      setSummary({
        average_rating: Number(res?.summary?.average_rating) || 0,
        review_count: Number(res?.summary?.review_count) || list.length,
      })
    } catch (err) {
      console.error('Lỗi tải danh sách đánh giá:', err)
      setReviews([])
      setError('Không thể tải danh sách đánh giá. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const distribution = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    reviews.forEach(review => {
      const rating = Math.round(Number(review?.rating) || 0)
      if (rating >= 1 && rating <= 5) counts[rating] += 1
    })

    const total = reviews.length || 1

    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: counts[star],
      percent: Math.round((counts[star] / total) * 100),
    }))
  }, [reviews])

  const filteredReviews = useMemo(() => {
    if (selectedRating === 'all') return reviews
    return reviews.filter(review => Number(review?.rating) === Number(selectedRating))
  }, [reviews, selectedRating])

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE))

  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredReviews.slice(start, start + PAGE_SIZE)
  }, [filteredReviews, currentPage])

  const averageRating = summary.average_rating || (
    reviews.length
      ? reviews.reduce((sum, review) => sum + (Number(review?.rating) || 0), 0) / reviews.length
      : 0
  )

  const reviewCount = summary.review_count || reviews.length

  const formatDate = value => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[620px] items-center justify-center rounded-[28px] border border-slate-100 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="text-sm font-medium text-slate-500">Đang tải đánh giá...</p>
        </div>
      </div>
    )
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_45px_rgba(15,23,42,0.05)] sm:p-6 lg:p-8">

      <header className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-[30px]">
            Danh sách đánh giá
          </h1>
          {reviews.length > 0 && (
            <p className="mt-1.5 text-sm text-slate-500">
              Theo dõi và quản lý phản hồi từ khách hàng sau các chuyến tour.
            </p>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="relative w-full sm:w-[210px]">
            <Icon name="filter" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select
              value={selectedRating}
              onChange={event => setSelectedRating(event.target.value)}
              className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">Tất cả đánh giá</option>
              <option value="5">5 sao</option>
              <option value="4">4 sao</option>
              <option value="3">3 sao</option>
              <option value="2">2 sao</option>
              <option value="1">1 sao</option>
            </select>
            <Icon name="chevronDown" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        )}
      </header>

      {(averageRating > 0 || reviewCount > 0) && (
        <div className="relative z-10 mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1.25fr]">
          {averageRating > 0 && (
            <article className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-[#fffaf0] via-white to-[#fffdf7] p-5 shadow-[0_12px_35px_rgba(245,158,11,0.08)]">
              <div className="absolute right-7 top-8 text-amber-200">✦</div>
              <div className="absolute bottom-8 right-12 text-amber-100">✦</div>

              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-400">
                  <Icon name="star" className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Điểm đánh giá trung bình</p>
                  <div className="mt-1 flex items-end gap-2">
                    <strong className="text-5xl font-black leading-none text-amber-400">
                      {averageRating.toFixed(1)}
                    </strong>
                    <span className="pb-1 text-xl font-medium text-slate-500">/ 5</span>
                  </div>
                  <div className="mt-3"><Stars rating={averageRating} size="text-[22px]" /></div>
                  {reviewCount > 0 && (
                    <p className="mt-2 text-sm text-slate-500">Dựa trên {reviewCount} đánh giá</p>
                  )}
                </div>
              </div>
            </article>
          )}

          {reviewCount > 0 && (
            <article className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-[#f5f9ff] via-white to-[#f6faff] p-5 shadow-[0_12px_35px_rgba(37,99,235,0.08)]">
              <MountainCloudDecoration />
              <div className="relative z-10 flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Icon name="message" className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Tổng số đánh giá</p>
                  <strong className="mt-1 block text-5xl font-black leading-none text-blue-600">
                    {reviewCount}
                  </strong>
                  <p className="mt-3 text-sm text-slate-500">Đánh giá từ khách hàng</p>
                </div>
              </div>
            </article>
          )}

          {reviews.length > 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
              <div className="flex h-full items-center justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-900">Phân bố đánh giá</h2>
                  <div className="mt-4 space-y-2.5">
                    {distribution.map(item => (
                      <div key={item.star} className="grid grid-cols-[42px_1fr_36px] items-center gap-3 text-xs">
                        <span className="font-medium text-slate-600">{item.star} sao</span>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-all duration-500"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                        <span className="text-right font-semibold text-slate-500">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative hidden h-28 w-28 shrink-0 sm:block">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(#2563eb 0 ${distribution[0]?.percent || 0}%, #60a5fa ${distribution[0]?.percent || 0}% ${(distribution[0]?.percent || 0) + (distribution[1]?.percent || 0)}%, #fbbf24 ${(distribution[0]?.percent || 0) + (distribution[1]?.percent || 0)}% 100%)`,
                    }}
                  />
                  <div className="absolute inset-[13px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                    <strong className="text-2xl font-black text-slate-900">{reviewCount}</strong>
                    <span className="text-[11px] text-slate-500">Tổng số</span>
                  </div>
                </div>
              </div>
            </article>
          )}
        </div>
      )}

      <div className="relative z-10 mt-6 border-t border-slate-200 pt-5">
        {error ? (
          <div className="flex min-h-[390px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <Icon name="refresh" className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Đã xảy ra lỗi</h3>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
            <button
              type="button"
              onClick={loadReviews}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Icon name="refresh" className="h-4 w-4" />
              Tải lại
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState />
        ) : filteredReviews.length === 0 ? (
          <EmptyState filtered onReset={() => setSelectedRating('all')} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedReviews.map((review, index) => {
                const userName = getCustomerName(review) || 'Khách hàng'
                const avatarUrl = getCustomerAvatar(review)
                const tourTitle = review?.tour?.title?.trim()
                const comment = review?.comment?.trim()
                const createdDate = formatDate(review?.created_at)
                const rating = Math.max(0, Math.min(5, Number(review?.rating) || 0))
                const fallbackName = userName.charAt(0).toUpperCase()

                return (
                  <article
                    key={review?.id || `${currentPage}-${index}`}
                    className="group relative flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_35px_rgba(37,99,235,0.10)]"
                  >
                    <div className="flex items-start gap-3">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={userName}
                          className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-blue-100"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-50 to-blue-100 text-base font-black text-blue-600 shadow-sm ring-1 ring-blue-100">
                          {fallbackName}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 truncate text-[15px] font-extrabold text-slate-950">
                            {userName}
                          </h3>

                          {rating > 0 && (
                            <span className="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-600">
                              {rating}/5
                            </span>
                          )}
                        </div>

                        {tourTitle && (
                          <div className="mt-1 flex min-w-0 items-center gap-1 text-xs font-semibold text-blue-600">
                            <Icon name="pin" className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{tourTitle}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {rating > 0 && (
                      <div className="mt-3 flex items-center">
                        <Stars rating={rating} size="text-[16px]" />
                      </div>
                    )}

                    {comment && (
                      <p className="mt-3 line-clamp-3 flex-1 text-[13px] leading-5 text-slate-600">
                        {comment}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      {createdDate ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                          <Icon name="calendar" className="h-3.5 w-3.5" />
                          <span>{createdDate}</span>
                        </div>
                      ) : (
                        <span />
                      )}

                      {review?.can_reply && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                        >
                          <Icon name="message" className="h-3.5 w-3.5" />
                          Trả lời
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 border-t border-slate-100 px-5 py-4" aria-label="Phân trang đánh giá">
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Icon name="chevronLeft" className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 min-w-9 rounded-lg px-3 text-sm font-bold transition ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Icon name="chevronRight" className="h-4 w-4" />
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  )
}
