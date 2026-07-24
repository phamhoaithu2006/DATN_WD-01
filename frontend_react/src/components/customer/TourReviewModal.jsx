import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { submitCustomerTourReview } from '../../services/customerReviewApi'
import { mediaUrl } from '../../utils/mediaUrl'

const RATING_LABELS = {
  1: 'Rất không hài lòng',
  2: 'Chưa hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Tuyệt vời',
}

const QUICK_COMMENTS = [
  'Lịch trình hợp lý',
  'Dịch vụ chu đáo',
  'Điểm đến hấp dẫn',
  'Tổ chức chuyên nghiệp',
  'Ăn uống phù hợp',
  'Phương tiện thoải mái',
  'Khách sạn sạch sẽ',
  'Trải nghiệm đáng nhớ',
]

function StarIcon({ filled = false, className = 'h-9 w-9' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 2.75 2.82 5.72 6.31.92-4.57 4.45 1.08 6.28L12 17.15l-5.64 2.97 1.08-6.28-4.57-4.45 6.31-.92L12 2.75Z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v4M18 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function MoneyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 9H5v1M18 15h1v-1" />
    </svg>
  )
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 'Chưa cập nhật'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(number)
}

function getValidationMessage(error) {
  const errors = error?.response?.data?.errors
  if (errors && typeof errors === 'object') {
    const firstMessage = Object.values(errors).flat().find(Boolean)
    if (firstMessage) return String(firstMessage)
  }
  if (error?.response?.status === 409) {
    return error?.response?.data?.message || 'Bạn đã đánh giá tour này rồi.'
  }
  return error?.response?.data?.message || 'Không thể gửi đánh giá tour. Vui lòng thử lại.'
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm shadow-slate-100">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</span>
        <span className="mt-1 block truncate text-sm font-bold text-slate-800" title={value}>{value}</span>
      </span>
    </div>
  )
}

export default function TourReviewModal({ target, onClose, onSubmitted }) {
  const booking = target?.booking || null
  const tour = booking?.tour || null
  const departure = booking?.tour_departure || null

  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const activeRating = hoveredRating || rating
  const thumbnail = mediaUrl(tour?.thumbnail_url || tour?.image || tour?.thumbnail?.image_url)
  const tourTitle = tour?.title || target?.tourTitle || 'Tour đã hoàn thành'
  const destination = [
    tour?.destination?.name || tour?.destination_name,
    tour?.destination?.province_city,
  ].filter(Boolean).join(', ') || 'Chưa cập nhật'
  const schedule = `${formatDate(departure?.departure_date)} - ${formatDate(departure?.return_date)}`
  const duration = tour?.duration_days
    ? `${tour.duration_days} ngày${tour?.duration_nights !== undefined && tour?.duration_nights !== null ? ` ${tour.duration_nights} đêm` : ''}`
    : tour?.duration || 'Chưa cập nhật'

  const bookingId = Number(target?.bookingId || booking?.id)

  const selectedQuickComments = useMemo(
    () => QUICK_COMMENTS.filter((item) => comment.toLocaleLowerCase('vi-VN').includes(item.toLocaleLowerCase('vi-VN'))),
    [comment],
  )

  useEffect(() => {
    if (!target) return undefined

    setRating(0)
    setHoveredRating(0)
    setComment('')
    setError('')

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [target])

  if (!target) return null

  function addQuickComment(text) {
    setComment((current) => {
      const normalized = current.trim()
      if (normalized.toLocaleLowerCase('vi-VN').includes(text.toLocaleLowerCase('vi-VN'))) return current
      const next = normalized ? `${normalized}${/[.!?]$/.test(normalized) ? ' ' : '. '}${text}.` : `${text}.`
      return next.slice(0, 2000)
    })
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!rating) {
      setError('Vui lòng chọn số sao đánh giá tour.')
      return
    }

    if (!bookingId) {
      setError('Không tìm thấy mã booking để gửi đánh giá tour.')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const response = await submitCustomerTourReview({
        booking_id: bookingId,
        rating,
        comment: comment.trim() || null,
      })

      onSubmitted?.(response?.data || response)
    } catch (submitError) {
      setError(getValidationMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/65 backdrop-blur-md"
      style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-review-title"
    >
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        aria-label="Đóng biểu mẫu đánh giá"
        onClick={() => !submitting && onClose?.()}
      />

      <div className="relative z-10 flex min-h-full w-full items-start justify-center p-3 sm:p-6">
        <form
          onSubmit={handleSubmit}
          className="my-0 flex w-full max-w-5xl flex-col overflow-hidden rounded-[26px] border border-white/50 bg-white shadow-[0_35px_120px_rgba(2,6,23,0.38)] sm:rounded-[32px]"
          style={{ maxHeight: 'calc(100dvh - 24px)' }}
        >
          <header className="relative shrink-0 overflow-hidden bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 px-5 py-5 text-white sm:px-7 sm:py-6">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-28 left-1/3 h-52 w-52 rounded-full bg-cyan-300/20 blur-2xl" />

            <div className="relative flex items-start justify-between gap-5">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur-sm">
                  <StarIcon filled className="h-4 w-4 text-amber-300" />
                  GIAO DIỆN MỚI · Chuyến đi đã hoàn thành
                </div>
                <h2 id="tour-review-title" className="text-2xl font-black tracking-tight sm:text-3xl">Đánh giá chuyến đi</h2>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-blue-100">
                  Chia sẻ trải nghiệm thực tế để giúp ViVuGo nâng cao chất lượng tour và dịch vụ.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:rotate-90 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Đóng"
              >
                <CloseIcon />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70">
            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.92fr_1.08fr] lg:gap-7">
              <aside className="space-y-5">
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950">
                    {thumbnail ? (
                      <img src={thumbnail} alt={tourTitle} className="h-full w-full object-cover opacity-80" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-200">Thông tin chuyến đi</p>
                      <h3 className="mt-1 line-clamp-2 text-xl font-black leading-7">{tourTitle}</h3>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <InfoItem icon={<LocationIcon />} label="Điểm đến" value={destination} />
                      <InfoItem icon={<CalendarIcon />} label="Lịch trình" value={schedule} />
                      <InfoItem icon={<UsersIcon />} label="Số khách" value={`${Number(booking?.number_of_people || 0)} người`} />
                      <InfoItem icon={<MoneyIcon />} label="Tổng thanh toán" value={formatCurrency(booking?.total_amount)} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                        Mã booking: {booking?.booking_code || `#${bookingId}`}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{duration}</span>
                      {tour?.category?.name ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                          {tour.category.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-black text-slate-950">Bạn có thể nhận xét về</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-bold text-slate-700">
                    {['Lịch trình', 'Điểm đến', 'Phương tiện', 'Khách sạn', 'Ăn uống', 'Tổ chức tour'].map((item) => (
                      <div key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-xs text-blue-700">✓</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              </aside>

              <main className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <section>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">Mức độ hài lòng của bạn</h3>
                      <p className="mt-1 text-sm text-slate-500">Chọn từ 1 đến 5 sao.</p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${rating ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {rating ? `${rating}/5 · ${RATING_LABELS[rating]}` : 'Chưa chọn'}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-5 gap-2 sm:gap-3" onMouseLeave={() => setHoveredRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const selected = star <= activeRating
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoveredRating(star)}
                          onFocus={() => setHoveredRating(star)}
                          onBlur={() => setHoveredRating(0)}
                          onClick={() => {
                            setRating(star)
                            setError('')
                          }}
                          className={`group flex min-w-0 flex-col items-center gap-2 rounded-2xl border px-1 py-3 transition sm:px-2 sm:py-4 ${
                            rating === star
                              ? 'border-amber-300 bg-amber-50 shadow-md shadow-amber-100'
                              : selected
                                ? 'border-amber-200 bg-amber-50/50'
                                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50/40'
                          }`}
                          aria-label={`${star} sao - ${RATING_LABELS[star]}`}
                          aria-pressed={rating === star}
                        >
                          <StarIcon filled={selected} className={`h-8 w-8 transition sm:h-10 sm:w-10 ${selected ? 'text-amber-400' : 'text-slate-300 group-hover:text-amber-300'}`} />
                          <span className={`hidden text-[11px] font-extrabold sm:block ${rating === star ? 'text-amber-700' : 'text-slate-500'}`}>
                            {star} sao
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-3 min-h-6 text-center text-sm font-bold text-amber-700">
                    {activeRating ? RATING_LABELS[activeRating] : 'Hãy chọn mức đánh giá phù hợp'}
                  </div>
                </section>

                <div className="my-6 h-px bg-slate-100" />

                <section>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label htmlFor="tour-review-comment" className="text-lg font-black text-slate-950">Nhận xét chi tiết</label>
                      <p className="mt-1 text-sm text-slate-500">Chia sẻ điều bạn hài lòng hoặc góp ý để dịch vụ tour tốt hơn.</p>
                    </div>
                    <span className={`text-xs font-bold ${comment.length >= 1900 ? 'text-red-500' : 'text-slate-400'}`}>
                      {comment.length}/2000
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {QUICK_COMMENTS.map((item) => {
                      const selected = selectedQuickComments.includes(item)
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => addQuickComment(item)}
                          className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                            selected
                              ? 'border-blue-300 bg-blue-100 text-blue-800'
                              : 'border-blue-100 bg-blue-50/70 text-blue-700 hover:border-blue-300 hover:bg-blue-100'
                          }`}
                        >
                          + {item}
                        </button>
                      )
                    })}
                  </div>

                  <textarea
                    id="tour-review-comment"
                    value={comment}
                    onChange={(event) => {
                      setComment(event.target.value.slice(0, 2000))
                      setError('')
                    }}
                    rows={8}
                    placeholder="Ví dụ: Lịch trình hợp lý, điểm đến đẹp, xe di chuyển thoải mái, khách sạn sạch sẽ và nhân viên tổ chức hỗ trợ đoàn chu đáo..."
                    className="mt-4 min-h-48 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </section>

                {error ? (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-bold text-red-700" role="alert">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-100 text-xs">!</span>
                    <span>{error}</span>
                  </div>
                ) : null}

                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">✓</span>
                  <p className="text-xs font-semibold leading-5 text-emerald-800">
                    Đánh giá của bạn giúp những khách hàng khác lựa chọn hành trình phù hợp hơn.
                  </p>
                </div>
              </main>
            </div>
          </div>

          <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-xs font-semibold text-slate-400"><span className="text-red-500">*</span> Số sao là thông tin bắt buộc.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="min-w-36 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Đánh giá sau
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-w-52 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                <StarIcon filled className="h-4 w-4 text-amber-300" />
                {submitting ? 'Đang gửi...' : 'Gửi đánh giá tour'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}