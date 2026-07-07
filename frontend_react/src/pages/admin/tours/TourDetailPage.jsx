import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import tourApi from '../../../services/toursApi'

const API_ORIGIN = 'http://127.0.0.1:8000'

function BackIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function EditIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function DocumentIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  )
}

function CalendarIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function ImageIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.2-3.2a2 2 0 0 0-2.8 0L6 21" />
    </svg>
  )
}

function TagIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.6 13.5 12.5 21.6a2 2 0 0 1-2.8 0L2.4 14.3a2 2 0 0 1 0-2.8L10.5 3.4A2 2 0 0 1 11.9 3H19a2 2 0 0 1 2 2v7.1a2 2 0 0 1-.4 1.4ZM16 9.5A1.5 1.5 0 1 0 16 6a1.5 1.5 0 0 0 0 3.5Z" />
    </svg>
  )
}

function StarIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 2 3.1 6.3 7 .9-5 4.9 1.2 6.9L12 17.7 5.7 21l1.2-6.9-5-4.9 7-.9Z" />
    </svg>
  )
}

function CategoryIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
      <path d="M7 6v12" />
    </svg>
  )
}

function PinIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ClockIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function BusIcon({ className = 'h-3 w-3' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="16" rx="2" />
      <path d="M4 11h16" />
      <path d="M8 6v5" />
      <path d="M16 6v5" />
      <path d="M6 19v2" />
      <path d="M18 19v2" />
      <path d="M7 15h.01" />
      <path d="M17 15h.01" />
    </svg>
  )
}

function EyeIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function normalizeImageUrl(url) {
  if (!url) return ''

  const value = String(url).trim()
  if (!value) return ''

  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('/storage')) return `${API_ORIGIN}${value}`
  if (value.startsWith('storage')) return `${API_ORIGIN}/${value}`
  if (value.startsWith('/uploads')) return `${API_ORIGIN}${value}`
  if (value.startsWith('uploads')) return `${API_ORIGIN}/${value}`

  return value
}

function getResponseData(payload) {
  if (payload?.data?.data) return payload.data.data
  if (payload?.data?.tour) return payload.data.tour
  if (payload?.data) return payload.data
  if (payload?.tour) return payload.tour
  return payload || null
}

function formatMoney(value) {
  const number = Number(value || 0)

  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(number)}đ`
}

function getAgePricingRules(tour) {
  const rules = Array.isArray(tour?.agePricingRules)
    ? tour.agePricingRules
    : Array.isArray(tour?.age_pricing_rules)
      ? tour.age_pricing_rules
      : []

  return [...rules]
    .filter((rule) => rule && Number(rule.is_active ?? 1) !== 0)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
}

function formatAgePricingLabel(rule) {
  if (rule?.label) return rule.label

  const minAge = rule?.min_age
  const maxAge = rule?.max_age

  if (minAge !== undefined && minAge !== null && maxAge !== undefined && maxAge !== null) {
    return `${minAge} - ${maxAge} tuổi`
  }

  if (minAge !== undefined && minAge !== null) {
    return `Từ ${minAge} tuổi trở lên`
  }

  if (maxAge !== undefined && maxAge !== null) {
    return `Dưới ${maxAge} tuổi`
  }

  return 'Mức giá'
}

function formatAgePricingValue(rule, basePrice = 0) {
  const pricingType = rule?.pricing_type || 'fixed'
  const priceValue = Number(rule?.price_value || 0)

  if (pricingType === 'free') {
    return 'Miễn phí'
  }

  if (pricingType === 'percentage') {
    return `${priceValue}% giá gốc`
  }

  return formatMoney(priceValue || basePrice)
}

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatTourTitle(value = '') {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return ''

      return (
        word.charAt(0).toLocaleUpperCase('vi-VN') +
        word.slice(1).toLocaleLowerCase('vi-VN')
      )
    })
    .join(' ')
}

function getStatusMeta(status) {
  switch (status) {
    case 'published':
      return {
        label: 'Đang hiển thị',
        className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        dot: 'bg-emerald-500',
      }
    case 'draft':
      return {
        label: 'Bản nháp',
        className: 'bg-amber-50 text-amber-700 ring-amber-100',
        dot: 'bg-amber-500',
      }
    case 'hidden':
      return {
        label: 'Đã ẩn',
        className: 'bg-slate-100 text-slate-600 ring-slate-200',
        dot: 'bg-slate-400',
      }
    case 'cancelled':
      return {
        label: 'Đã hủy',
        className: 'bg-rose-50 text-rose-700 ring-rose-100',
        dot: 'bg-rose-500',
      }
    default:
      return {
        label: status || 'Đang hiển thị',
        className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        dot: 'bg-emerald-500',
      }
  }
}

function getDepartureStatusMeta(status, availableSlots, maxSlots) {
  const value = String(status || '').toLowerCase()
  const available = Number(availableSlots || 0)
  const max = Number(maxSlots || 0)
  const ratio = max > 0 ? available / max : 0

  if (value.includes('full') || value.includes('closed') || value.includes('đủ') || ratio >= 1) {
    return {
      label: status || 'Đủ đoàn',
      className: 'bg-rose-50 text-rose-600 ring-rose-100',
      dot: 'bg-rose-500',
    }
  }

  if (value.includes('soon') || value.includes('limited') || value.includes('sắp') || ratio >= 0.88) {
    return {
      label: status || 'Sắp đầy',
      className: 'bg-amber-50 text-amber-600 ring-amber-100',
      dot: 'bg-amber-500',
    }
  }

  return {
    label: status || 'Còn chỗ',
    className: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    dot: 'bg-emerald-500',
  }
}

function SectionCard({ children, className = '' }) {
  return (
    <section className={`rounded-[18px] border border-slate-200/80 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.06)] ring-1 ring-white ${className}`}>
      {children}
    </section>
  )
}

function SectionTitle({ icon: Icon, title, right }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="inline-flex items-center gap-2 text-[18px] font-black tracking-[-0.02em] text-slate-900">
        {Icon && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-50 text-[#0575f9] ring-1 ring-sky-100">
            <Icon className="h-4 w-4" />
          </span>
        )}
        {title}
      </h2>

      {right}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, tone = 'sky' }) {
  const toneClass = {
    sky: 'bg-sky-50 text-[#0575f9] ring-sky-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-500 ring-amber-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  }[tone]

  const displayValue = value || '-'

  return (
    <div className="group flex min-h-[76px] min-w-0 items-center gap-3 rounded-[15px] border border-slate-200/90 bg-white px-3.5 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-100 hover:shadow-[0_14px_28px_rgba(15,23,42,0.07)]">
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition duration-200 group-hover:scale-105 ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold leading-none text-slate-500">
          {label}
        </p>

        <p
          title={String(displayValue)}
          className="mt-1.5 text-[13.5px] font-black leading-[18px] text-slate-950"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {displayValue}
        </p>
      </div>
    </div>
  )
}

function PriceInfoRow({ icon: Icon, label, value, tone = 'sky', strike = false, subText }) {
  const rowClass = {
    sky: 'border-sky-100 bg-sky-50/45 text-[#0575f9]',
    emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-600',
    amber: 'border-amber-100 bg-amber-50/75 text-amber-500',
  }[tone]

  const valueClass = {
    sky: 'text-slate-500',
    emerald: 'text-emerald-600',
    amber: 'text-amber-500',
  }[tone]

  return (
    <div className={`flex min-h-[68px] items-center justify-between gap-4 rounded-[16px] border px-4 py-3.5 shadow-[0_8px_22px_rgba(15,23,42,0.035)] ${rowClass}`}>
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/85 shadow-sm ring-1 ring-white/90">
          <Icon />
        </span>
        <p className="min-w-0 text-[14.5px] font-bold text-slate-700">{label}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className={`whitespace-nowrap text-[21px] font-black tracking-[-0.04em] ${valueClass} ${strike ? 'line-through decoration-2' : ''}`}>
          {value}
        </p>
        {subText && <p className="mt-0.5 text-[12px] font-semibold text-slate-600">{subText}</p>}
      </div>
    </div>
  )
}

function TimelineDayCard({ day, items }) {
  const title =
    items[0]?.day_title ||
    items[0]?.route_title ||
    items[0]?.day_name ||
    `Lịch trình ngày ${day}`

  return (
    <div className="rounded-[12px] border border-slate-200 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="mb-3 flex items-start gap-3">
        <span className="inline-flex h-10 w-8 shrink-0 flex-col items-center justify-center rounded-lg bg-sky-50 text-center text-[9px] font-black leading-tight text-[#0575f9] ring-1 ring-sky-200">
          Ngày
          <span className="text-[14px] leading-none">{day}</span>
        </span>

        <h3 className="pt-0.5 text-[12.5px] font-black leading-[18px] text-slate-900">
          {title}
        </h3>
      </div>

      <div>
        {items.map((item, index) => {
          const time = [item.start_time, item.end_time].filter(Boolean).join(' - ') || item.duration || ''

          return (
            <div key={item.id || `${day}-${index}`} className="relative grid grid-cols-[48px_13px_minmax(0,1fr)] gap-2.5 pb-2.5 last:pb-0">
              {index < items.length - 1 && <span className="absolute left-[54px] top-4 h-full w-px bg-sky-200" />}

              <p className="pt-0.5 text-[11px] font-black text-slate-800">{time}</p>

              <span className="relative z-10 mt-1.5 h-2 w-2 rounded-full border-2 border-white bg-[#0575f9] shadow-[0_0_0_2px_rgba(5,117,249,0.18)]" />

              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-black leading-5 text-slate-900">
                  {item.title || `Hoạt động ${index + 1}`}
                  {item.transport && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500">
                      <BusIcon />
                      {item.transport}
                    </span>
                  )}
                </p>

                {item.description && (
                  <p className="line-clamp-2 text-[10.5px] font-medium leading-[17px] text-slate-500">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TourDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [tour, setTour] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchTour = async () => {
      try {
        setLoading(true)
        setError('')

        const res = await tourApi.getById(id)
        const data = getResponseData(res.data)

        if (isMounted) {
          setTour(data)
        }
      } catch (e) {
        console.error('GET TOUR DETAIL ERROR:', e)

        if (isMounted) {
          setError(e.response?.data?.message || 'Không thể tải chi tiết tour.')
          setTour(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchTour()

    return () => {
      isMounted = false
    }
  }, [id])

  const images = useMemo(() => {
    if (!tour) return []

    const rawImages = tour.images || tour.tour_images || []

    return rawImages
      .map((image) => ({
        ...image,
        image_url: normalizeImageUrl(image.image_url || image.url),
      }))
      .filter((image) => image.image_url)
  }, [tour])

  const thumbnailUrl = useMemo(() => {
    if (!tour) return ''

    const thumbnailFromImages =
      images.find((image) => Number(image.is_thumbnail) === 1)?.image_url ||
      images[0]?.image_url

    const imageUrl =
      tour.thumbnail_url ||
      tour.thumbnail?.image_url ||
      tour.image_url ||
      thumbnailFromImages ||
      ''

    return normalizeImageUrl(imageUrl)
  }, [tour, images])

  const galleryImages = useMemo(() => {
    if (images.length > 0) {
      return images
    }

    if (thumbnailUrl) {
      return [{ id: 'thumbnail', image_url: thumbnailUrl, alt_text: tour?.title }]
    }

    return []
  }, [images, thumbnailUrl, tour?.title])

  const itineraries = useMemo(() => {
    if (!tour) return []

    if (Array.isArray(tour.itineraries)) return tour.itineraries
    if (Array.isArray(tour.itinerary)) return tour.itinerary

    return []
  }, [tour])

  const groupedItineraries = useMemo(() => {
    return itineraries.reduce((groups, item) => {
      const day = item.day_number || item.day || 1

      if (!groups[day]) groups[day] = []
      groups[day].push(item)

      return groups
    }, {})
  }, [itineraries])

  if (loading) {
    return (
      <div className="min-h-full bg-[#f8fbff] px-6 py-7 text-slate-900 xl:px-8" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div className="rounded-[18px] border border-slate-100 bg-white p-12 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/80">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-[#0575f9]" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Đang tải chi tiết tour...</p>
        </div>
      </div>
    )
  }

  if (error || !tour) {
    return (
      <div className="min-h-full bg-[#f8fbff] px-6 py-7 text-slate-900 xl:px-8" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div className="rounded-[18px] border border-rose-100 bg-white p-12 text-center shadow-[0_24px_70px_rgba(244,63,94,0.08)] ring-1 ring-rose-50">
          <p className="text-base font-bold text-rose-600">
            {error || 'Không tìm thấy tour.'}
          </p>

          <button
            type="button"
            onClick={() => navigate('/admin/tours')}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#0575f9] px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(5,117,249,0.26)] transition hover:bg-blue-700"
          >
            Quay lại danh sách tour
          </button>
        </div>
      </div>
    )
  }

  const statusMeta = getStatusMeta(tour.status)
  const discountPrice = Number(tour.discount_price || 0)
  const basePrice = Number(tour.base_price || 0)
  const displayPrice = discountPrice > 0 ? discountPrice : basePrice
  const departures = Array.isArray(tour.departures) ? tour.departures : []
  const itineraryDays = Object.entries(groupedItineraries).sort(([a], [b]) => Number(a) - Number(b))
  const visibleGalleryImages = galleryImages.slice(0, 6)
  const agePricingRules = getAgePricingRules(tour)

  return (
    <div
      className="min-h-full bg-gradient-to-br from-[#f8fbff] via-white to-sky-50/40 px-6 py-5 text-slate-900 xl:px-8 xl:py-6"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="mx-auto w-full max-w-[1480px]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-5 rounded-[22px] border border-white bg-white/70 p-4 shadow-[0_18px_46px_rgba(15,23,42,0.045)] backdrop-blur">
          <div>
            <nav className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-slate-500">
              <span>ViVuGo</span>
              <span className="text-slate-300">/</span>
              <span>Quản lý tour</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800">Chi tiết tour</span>
            </nav>

            <h1 className="text-[31px] font-black leading-none tracking-[-0.04em] text-slate-950">
              Chi tiết tour
            </h1>
            <p className="mt-2.5 text-[14px] font-medium leading-6 text-slate-500">
              Xem thông tin tổng quan, hình ảnh, giá, lịch trình và lịch khởi hành của tour.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/admin/tours"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-extrabold text-slate-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#0575f9]"
            >
              <BackIcon />
              Quay lại
            </Link>

            <Link
              to={`/admin/tours/${tour.id}/edit`}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0575f9] px-5 text-[14px] font-extrabold text-white shadow-[0_14px_32px_rgba(5,117,249,0.28)] transition hover:bg-blue-700"
            >
              <EditIcon />
              Sửa tour
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_430px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="space-y-4">
            <SectionCard className="overflow-hidden">
              <div className="grid min-h-[320px] lg:grid-cols-[42%_58%]">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={tour.title || 'Ảnh tour'}
                    className="h-[300px] w-full object-cover lg:h-full"
                  />
                ) : (
                  <div className="flex h-[300px] w-full items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 text-sm font-semibold text-slate-400 lg:h-full">
                    Chưa có ảnh đại diện
                  </div>
                )}

                <div className="flex min-w-0 flex-col justify-center p-5 xl:p-6">
                  <h2 className="text-[25px] font-black leading-tight tracking-[-0.04em] text-slate-950 xl:text-[28px]">
                    {formatTourTitle(tour.title)}
                  </h2>

                  <span className={`mt-3 inline-flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-extrabold ring-1 ${statusMeta.className}`}>
                    <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
                    {statusMeta.label}
                  </span>

                  <p className="mt-3.5 text-[13.5px] font-medium leading-6 text-slate-600 xl:text-[14px]">
                    {tour.summary || 'Chưa có mô tả ngắn cho tour này.'}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <MetricCard
                      icon={CategoryIcon}
                      label="Danh mục"
                      value={tour.category?.name || tour.category_name || tour.category_id}
                      tone="sky"
                    />
                    <MetricCard
                      icon={PinIcon}
                      label="Điểm đến"
                      value={tour.destination?.name || tour.destination_name || tour.destination_id}
                      tone="emerald"
                    />
                    <MetricCard
                      icon={ClockIcon}
                      label="Thời gian"
                      value={`${tour.duration_days || 0}N / ${tour.duration_nights || 0}Đ`}
                      tone="amber"
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard className="p-5">
              <SectionTitle icon={DocumentIcon} title="Mô tả chi tiết" />
              <p className="whitespace-pre-line text-[13.5px] font-medium leading-6 text-slate-600 xl:text-[14px]">
                {tour.description || 'Chưa có mô tả chi tiết.'}
              </p>
            </SectionCard>

            <SectionCard className="p-5">
              <SectionTitle icon={CalendarIcon} title="Lịch trình tour" />

              {itineraryDays.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {itineraryDays.slice(0, 3).map(([day, items]) => (
                    <TimelineDayCard key={day} day={day} items={items} />
                  ))}
                </div>
              ) : tour.itinerary ? (
                <div className="whitespace-pre-line rounded-[14px] border border-slate-100 bg-slate-50/80 p-5 text-sm font-medium leading-7 text-slate-600">
                  {tour.itinerary}
                </div>
              ) : (
                <div className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
                  Chưa có lịch trình tour.
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard className="p-5">
              <SectionTitle title="Thông tin giá" />

              <div className="space-y-3">
                <PriceInfoRow
                  icon={TagIcon}
                  label="Giá gốc tour"
                  value={formatMoney(basePrice)}
                  tone="sky"
                />
                <PriceInfoRow
                  icon={StarIcon}
                  label="Đánh giá"
                  value={`${tour.average_rating || 0}/5`}
                  tone="amber"
                  subText={`(${tour.review_count || 0} đánh giá)`}
                />
              </div>

              <div className="mt-4 rounded-[16px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[14px] font-black text-slate-900">
                    Giá theo độ tuổi / phụ thu
                  </h3>

                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                    {agePricingRules.length} mức giá
                  </span>
                </div>

                <p className="mb-3 text-[12px] font-semibold leading-5 text-slate-500">
                 
                </p>

                {agePricingRules.length > 0 ? (
                  <div className="space-y-2">
                    {agePricingRules.map((rule, index) => (
                      <div
                        key={rule.id || `${rule.label || 'age'}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-slate-800">
                            {formatAgePricingLabel(rule)}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                            Áp dụng khi đặt tour
                          </p>
                        </div>

                        <p className="shrink-0 text-right text-[15px] font-black text-[#0575f9]">
                          {formatAgePricingValue(rule, basePrice)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-[13px] font-semibold text-slate-400">
                    Chưa có giá theo độ tuổi / phụ thu.
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard className="p-5">
              <SectionTitle
                icon={ImageIcon}
                title="Thư viện ảnh"
                right={<span className="text-[13px] font-bold text-[#0575f9]">{galleryImages.length} ảnh</span>}
              />

              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {visibleGalleryImages.map((image, index) => {
                    const isLastVisible = index === visibleGalleryImages.length - 1
                    const hasMoreImages = galleryImages.length > visibleGalleryImages.length

                    return (
                      <div
                        key={image.id || `${image.image_url}-${index}`}
                        className="group relative overflow-hidden rounded-[14px] border border-slate-100 bg-slate-50 shadow-sm"
                      >
                        <img
                          src={image.image_url}
                          alt={image.alt_text || tour.title || 'Ảnh tour'}
                          className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                        />

                        {isLastVisible && hasMoreImages && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-[18px] font-black text-white">
                            +{galleryImages.length - visibleGalleryImages.length}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="aspect-square rounded-[14px] border border-dashed border-slate-200 bg-slate-50" />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        <SectionCard className="mt-5 p-5">
          <SectionTitle icon={CalendarIcon} title="Lịch khởi hành" />

          {departures.length > 0 ? (
            <div className="overflow-x-auto rounded-[14px] border border-slate-200">
              <table className="w-full min-w-[920px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-center text-[13px] font-black text-slate-700">
                    <th className="px-5 py-3.5">Ngày khởi hành</th>
                    <th className="px-5 py-3.5">Ngày kết thúc</th>
                    <th className="px-5 py-3.5">Giá</th>
                    <th className="px-5 py-3.5">Số chỗ</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white text-center">
                  {departures.map((departure) => {
                    const departureStatus = getDepartureStatusMeta(
                      departure.status,
                      departure.available_slots,
                      departure.max_slots,
                    )

                    return (
                      <tr key={departure.id} className="transition hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-medium text-slate-700">
                          {formatDate(
                            departure.start_date ||
                              departure.departure_date ||
                              departure.departure_time,
                          )}
                        </td>

                        <td className="px-5 py-3.5 font-medium text-slate-700">
                          {formatDate(departure.end_date || departure.return_date)}
                        </td>

                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {departure.discount_price ? (
                            <div>
                              <div className="text-xs text-slate-400 line-through">
                                {formatMoney(departure.base_price || displayPrice)}
                              </div>
                              <div className="text-rose-600">
                                {formatMoney(departure.discount_price)}
                              </div>
                            </div>
                          ) : (
                            formatMoney(departure.base_price || departure.price || displayPrice)
                          )}
                        </td>

                        <td className="px-5 py-3.5 font-medium text-slate-700">
                          {departure.available_slots || 0}/{departure.max_slots || 0}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-bold ring-1 ${departureStatus.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${departureStatus.dot}`} />
                            {departureStatus.label}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            className="inline-flex h-8 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0575f9] shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
                            aria-label="Xem lịch khởi hành"
                          >
                            <EyeIcon />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
              Tour này chưa có lịch khởi hành.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

export default TourDetailPage
