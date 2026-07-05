import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
).replace(/\/$/, '')

const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '')

const normalizeImageUrl = (url) => {
  if (!url) return ''

  const value = String(url).trim()

  if (!value) return ''

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  if (value.startsWith('/storage')) {
    return `${API_ORIGIN}${value}`
  }

  if (value.startsWith('storage')) {
    return `${API_ORIGIN}/${value}`
  }

  if (value.startsWith('/uploads')) {
    return `${API_ORIGIN}${value}`
  }

  if (value.startsWith('uploads')) {
    return `${API_ORIGIN}/${value}`
  }

  return value
}

const getAuthHeaders = () => {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('access_token')

  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const normalizeTimeForBackend = (value) => {
  if (!value) return null

  const raw = String(value).trim()

  if (!raw) return null

  const match24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (match24) {
    const hour = String(Math.min(Number(match24[1]), 23)).padStart(2, '0')
    const minute = String(Math.min(Number(match24[2]), 59)).padStart(2, '0')

    return `${hour}:${minute}`
  }

  const match12 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i)
  if (match12) {
    let hour = Number(match12[1])
    const minute = String(Math.min(Number(match12[2]), 59)).padStart(2, '0')
    const period = match12[3].toUpperCase()

    if (period === 'AM' && hour === 12) {
      hour = 0
    }

    if (period === 'PM' && hour < 12) {
      hour += 12
    }

    return `${String(hour).padStart(2, '0')}:${minute}`
  }

  return null
}

const normalizeTimeForInput = (value) => {
  return normalizeTimeForBackend(value) || ''
}

const normalizeItineraryForForm = (itinerary = []) => {
  if (!Array.isArray(itinerary)) return []

  return itinerary.map((step) => ({
    ...step,
    start_time: normalizeTimeForInput(step.start_time),
    end_time: normalizeTimeForInput(step.end_time),
    images: Array.isArray(step.images) ? step.images : [],
  }))
}

const normalizeItineraryForSubmit = (itinerary = []) => {
  if (!Array.isArray(itinerary)) return []

  return itinerary.map((step, stepIndex) => {
    const cleanedImages = (step.images || [])
      .filter((image) => image.image_url && String(image.image_url).trim() !== '')
      .map((image, imageIndex) => ({
        ...image,
        image_url: String(image.image_url).trim(),
        alt_text: image.alt_text || '',
        sort_order: image.sort_order ?? imageIndex,
      }))

    return {
      ...step,
      day_number: Number(step.day_number || stepIndex + 1),
      sort_order: step.sort_order ?? stepIndex,
      start_time: normalizeTimeForBackend(step.start_time),
      end_time: normalizeTimeForBackend(step.end_time),
      images: cleanedImages,
    }
  })
}

const parseAgeRangeLabel = (label) => {
  const raw = String(label || '').trim().toLowerCase()

  if (!raw) {
    return { min_age: 0, max_age: null }
  }

  const numbers = raw.match(/\d+/g)?.map(Number) || []

  if (numbers.length >= 2) {
    const minAge = Math.min(numbers[0], numbers[1])
    const maxAge = Math.max(numbers[0], numbers[1])

    return { min_age: minAge, max_age: maxAge }
  }

  if (numbers.length === 1) {
    const age = numbers[0]

    if (
      raw.includes('trên') ||
      raw.includes('tren') ||
      raw.includes('lớn hơn') ||
      raw.includes('lon hon') ||
      raw.includes('>') ||
      raw.includes('+') ||
      raw.includes('trở lên') ||
      raw.includes('tro len')
    ) {
      return { min_age: raw.includes('trên') || raw.includes('tren') || raw.includes('>') ? age + 1 : age, max_age: null }
    }

    if (
      raw.includes('dưới') ||
      raw.includes('duoi') ||
      raw.includes('nhỏ hơn') ||
      raw.includes('nho hon') ||
      raw.includes('<')
    ) {
      return { min_age: 0, max_age: Math.max(age - 1, 0) }
    }

    return { min_age: age, max_age: age }
  }

  return { min_age: 0, max_age: null }
}

const normalizeAgePricingRulesForForm = (initialData = {}) => {
  const rules = Array.isArray(initialData.age_pricing_rules)
    ? initialData.age_pricing_rules
    : Array.isArray(initialData.agePricingRules)
      ? initialData.agePricingRules
      : []

  return rules.map((rule, index) => ({
    label: rule.label || '',
    price_value: rule.price_value ?? '',
    min_age: rule.min_age ?? 0,
    max_age: rule.max_age ?? null,
    pricing_type: rule.pricing_type || 'fixed',
    sort_order: rule.sort_order ?? index,
    is_active: rule.is_active ?? true,
  }))
}

const normalizeAgePricingRulesForSubmit = (rules = []) => {
  if (!Array.isArray(rules)) return []

  return rules
    .map((rule, index) => {
      const label = String(rule.label || '').trim()
      const priceValue = String(rule.price_value ?? '').trim()

      if (!label || priceValue === '') {
        return null
      }

      const parsedAges = parseAgeRangeLabel(label)

      return {
        label,
        min_age: parsedAges.min_age,
        max_age: parsedAges.max_age,
        pricing_type: 'fixed',
        price_value: Number(priceValue) || 0,
        sort_order: index,
        is_active: true,
      }
    })
    .filter(Boolean)
}

const getBasePriceFromAgeRules = (rules = [], fallback = 0) => {
  const prices = normalizeAgePricingRulesForSubmit(rules)
    .map((rule) => Number(rule.price_value || 0))
    .filter((price) => price > 0)

  if (prices.length > 0) {
    return Math.min(...prices)
  }

  return fallback || 0
}


const MAX_SUMMARY_LENGTH = 300
const MAX_TITLE_LENGTH = 180
const MAX_ALT_TEXT_LENGTH = 150
const MAX_IMAGE_SIZE_MB = 5
const MAX_GALLERY_IMAGES = 10
const DOMESTIC_MAX_TOUR_DURATION_DAYS = 7
const INTERNATIONAL_MAX_TOUR_DURATION_DAYS = 15
const ALLOWED_STATUSES = ['draft', 'published', 'hidden']
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const getDurationNightsFromDays = (value) => {
  const days = Number(value)

  if (!Number.isInteger(days) || days < 1) {
    return ''
  }

  return Math.max(days - 1, 0)
}

const isIntegerGreaterOrEqual = (value, min) => {
  const numberValue = Number(value)

  return Number.isInteger(numberValue) && numberValue >= min
}


const normalizeTextForMatching = (value) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const getCategorySearchText = (category = {}) => {
  if (!category || typeof category !== 'object') return ''

  return normalizeTextForMatching(
    [
      category.type,
      category.slug,
      category.code,
      category.name,
      category.title,
      category.category_name,
      category.description,
    ]
      .filter(Boolean)
      .join(' '),
  )
}

const isInternationalCategory = (category) => {
  const text = getCategorySearchText(category)

  return [
    'quoc te',
    'nuoc ngoai',
    'international',
    'foreign',
    'oversea',
    'outbound',
  ].some((keyword) => text.includes(keyword))
}

const getTourDurationLimit = (category) => {
  if (isInternationalCategory(category)) {
    return {
      maxDays: INTERNATIONAL_MAX_TOUR_DURATION_DAYS,
      label: 'quốc tế',
    }
  }

  return {
    maxDays: DOMESTIC_MAX_TOUR_DURATION_DAYS,
    label: 'nội địa',
  }
}

const isValidImageUrlOrPath = (value) => {
  const raw = String(value || '').trim()

  if (!raw) return true

  if (
    raw.startsWith('/storage') ||
    raw.startsWith('storage') ||
    raw.startsWith('/uploads') ||
    raw.startsWith('uploads')
  ) {
    return true
  }

  try {
    const url = new URL(raw)

    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

const validateImageFile = (file, label) => {
  if (!file) return ''

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `${label} chỉ hỗ trợ JPG, PNG hoặc WEBP.`
  }

  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `${label} không được vượt quá ${MAX_IMAGE_SIZE_MB}MB.`
  }

  return ''
}

const validateAgePricingRules = (rules = []) => {
  if (!Array.isArray(rules)) return ''

  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index] || {}
    const label = String(rule.label || '').trim()
    const priceText = String(rule.price_value ?? '').trim()
    const hasAnyValue = label || priceText

    if (!hasAnyValue) {
      continue
    }

    if (!label) {
      return `Vui lòng nhập độ tuổi cho dòng giá #${index + 1}.`
    }

    if (!/\d+/.test(label)) {
      return `Độ tuổi ở dòng giá #${index + 1} cần có số tuổi, ví dụ: 3-5 tuổi.`
    }

    if (priceText === '') {
      return `Vui lòng nhập giá cho dòng giá #${index + 1}.`
    }

    const priceValue = Number(priceText)

    if (!Number.isFinite(priceValue) || priceValue < 0) {
      return `Giá ở dòng #${index + 1} không hợp lệ.`
    }
  }

  return ''
}

const validateItinerary = (itinerary = [], durationDays = 1, strict = false) => {
  if (!Array.isArray(itinerary)) return ''

  const maxDay = Number(durationDays)

  if (strict && itinerary.length === 0) {
    return 'Vui lòng thêm ít nhất 1 chặng trong lịch trình trước khi hiển thị tour.'
  }

  for (let index = 0; index < itinerary.length; index += 1) {
    const step = itinerary[index] || {}
    const dayNumber = Number(step.day_number || 0)
    const title = String(step.title || '').trim()
    const imageError = (step.images || []).some(
      (image) => !isValidImageUrlOrPath(image.image_url),
    )

    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > maxDay) {
      return `Chặng #${index + 1} có ngày không hợp lệ.`
    }

    if (strict && !title) {
      return `Vui lòng nhập tiêu đề cho chặng #${index + 1}.`
    }

    if (imageError) {
      return `Link ảnh ở chặng #${index + 1} không hợp lệ.`
    }
  }

  return ''
}

const validateTourForm = ({
  formData,
  thumbnailImage,
  thumbnailPreview,
  galleryImages,
  status,
  selectedCategory,
}) => {
  const submitStatus = status || formData.status || 'published'
  const isStrictSubmit = submitStatus !== 'draft'
  const title = String(formData.title || '').trim()
  const summary = String(formData.summary || '').trim()
  const description = String(formData.description || '').trim()
  const basePrice = Number(formData.base_price)
  const durationDays = Number(formData.duration_days)
  const durationNights = getDurationNightsFromDays(formData.duration_days)
  const durationLimit = getTourDurationLimit(selectedCategory)
  const maxSlots = Number(formData.max_slots ?? 1)
  const availableSlots = Number(formData.available_slots ?? maxSlots ?? 1)

  if (!ALLOWED_STATUSES.includes(submitStatus)) {
    return 'Trạng thái tour không hợp lệ.'
  }

  if (!formData.category_id) {
    return 'Vui lòng chọn danh mục.'
  }

  if (!formData.destination_id) {
    return 'Vui lòng chọn điểm đến.'
  }

  if (!title) {
    return 'Vui lòng nhập tên tour.'
  }

  if (title.length < 5) {
    return 'Tên tour cần có ít nhất 5 ký tự.'
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return `Tên tour không được vượt quá ${MAX_TITLE_LENGTH} ký tự.`
  }

  if (summary.length > MAX_SUMMARY_LENGTH) {
    return `Tóm tắt không được vượt quá ${MAX_SUMMARY_LENGTH} ký tự.`
  }

  if (isStrictSubmit && !description) {
    return 'Vui lòng nhập mô tả chi tiết trước khi hiển thị tour.'
  }

  if (isStrictSubmit && description.length < 20) {
    return 'Mô tả chi tiết cần có ít nhất 20 ký tự.'
  }

  if (!isIntegerGreaterOrEqual(formData.duration_days, 1)) {
    return 'Số ngày phải là số nguyên lớn hơn hoặc bằng 1.'
  }

  if (durationDays > durationLimit.maxDays) {
    return `Số ngày không được vượt quá ${durationLimit.maxDays} ngày đối với tour ${durationLimit.label}.`
  }

  if (durationNights === '' || durationNights !== Math.max(durationDays - 1, 0)) {
    return 'Số đêm phải bằng số ngày - 1.'
  }

  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return 'Giá gốc tour không hợp lệ.'
  }

  if (isStrictSubmit && basePrice <= 0) {
    return 'Giá gốc tour phải lớn hơn 0 trước khi hiển thị tour.'
  }

  if (!Number.isInteger(maxSlots) || maxSlots < 1) {
    return 'Số slot tối đa phải là số nguyên lớn hơn hoặc bằng 1.'
  }

  if (!Number.isInteger(availableSlots) || availableSlots < 0) {
    return 'Số slot còn lại phải là số nguyên lớn hơn hoặc bằng 0.'
  }

  if (availableSlots > maxSlots) {
    return 'Số slot còn lại không được lớn hơn số slot tối đa.'
  }

  const agePricingError = validateAgePricingRules(formData.age_pricing_rules)
  if (agePricingError) {
    return agePricingError
  }

  const itineraryError = validateItinerary(
    formData.itinerary,
    durationDays,
    isStrictSubmit,
  )
  if (itineraryError) {
    return itineraryError
  }

  if (isStrictSubmit && !thumbnailImage && !thumbnailPreview) {
    return 'Vui lòng chọn ảnh đại diện trước khi hiển thị tour.'
  }

  const thumbnailError = validateImageFile(thumbnailImage, 'Ảnh đại diện')
  if (thumbnailError) {
    return thumbnailError
  }

  if ((galleryImages || []).length > MAX_GALLERY_IMAGES) {
    return `Thư viện ảnh không được vượt quá ${MAX_GALLERY_IMAGES} ảnh.`
  }

  for (let index = 0; index < (galleryImages || []).length; index += 1) {
    const galleryError = validateImageFile(
      galleryImages[index],
      `Ảnh thư viện #${index + 1}`,
    )

    if (galleryError) {
      return galleryError
    }
  }

  if (String(formData.thumbnail_alt_text || '').length > MAX_ALT_TEXT_LENGTH) {
    return `Alt text không được vượt quá ${MAX_ALT_TEXT_LENGTH} ký tự.`
  }

  return ''
}

const getInitialFormData = (initialData = {}) => {
  let itineraryData = []
  if (Array.isArray(initialData.itinerary)) {
    itineraryData = initialData.itinerary
  } else if (
    typeof initialData.itinerary === 'string' &&
    initialData.itinerary.trim() !== ''
  ) {
    try {
      itineraryData = JSON.parse(initialData.itinerary)
    } catch {
      itineraryData = []
    }
  }

  return {
    category_id: initialData.category_id ?? '',
    destination_id: initialData.destination_id ?? '',
    title: initialData.title ?? '',
    summary: initialData.summary ?? '',
    description: initialData.description ?? '',
    itinerary: normalizeItineraryForForm(itineraryData),
    duration_days: initialData.duration_days ?? '',
    duration_nights: initialData.duration_nights ?? '',
    base_price: initialData.base_price ?? '',
    discount_price: initialData.discount_price ?? '',
    max_slots: initialData.max_slots ?? 1,
    available_slots: initialData.available_slots ?? 1,
    age_pricing_rules: normalizeAgePricingRulesForForm(initialData),
    status: initialData.status ?? 'published',
    thumbnail_alt_text:
      initialData.thumbnail_alt_text ??
      initialData.thumbnail?.alt_text ??
      initialData.images?.find?.((image) => Number(image.is_thumbnail) === 1)
        ?.alt_text ??
      initialData.images?.[0]?.alt_text ??
      '',
  }
}

const getInitialThumbnailPreview = (initialData = {}) => {
  const thumbnailFromImages = Array.isArray(initialData.images)
    ? initialData.images.find((image) => Number(image.is_thumbnail) === 1)
        ?.image_url || initialData.images[0]?.image_url
    : ''

  return normalizeImageUrl(
    initialData.thumbnail_url ||
      initialData.thumbnail?.image_url ||
      initialData.image_url ||
      thumbnailFromImages ||
      '',
  )
}

const getInitialImagePreviews = (initialData = {}) => {
  const images = Array.isArray(initialData.images) ? initialData.images : []

  return images
    .map((image) => normalizeImageUrl(image?.image_url || image?.url || image))
    .filter(Boolean)
}

const normalizeList = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.data)) return data.data.data
  return []
}

const getOptionName = (item, fallback) => {
  return (
    item.name ||
    item.title ||
    item.category_name ||
    item.destination_name ||
    item.destination ||
    fallback
  )
}

const TYPE_ICONS = {
  departure: (
    <svg
      className="h-3.5 w-3.5 text-blue-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  ),
  transport: (
    <svg
      className="h-3.5 w-3.5 text-amber-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  ),
  sightseeing: (
    <svg
      className="h-3.5 w-3.5 text-emerald-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  meal: (
    <svg
      className="h-3.5 w-3.5 text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  free_time: (
    <svg
      className="h-3.5 w-3.5 text-teal-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  return: (
    <svg
      className="h-3.5 w-3.5 text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  ),
}

function CardTitle({ icon, title, description }) {
  return (
    <div className="mb-5 border-b border-slate-100 pb-3">
      <h3 className="flex items-center gap-2 text-[13px] font-black uppercase tracking-wide text-slate-800">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </span>
        {title}
      </h3>

      {description ? (
        <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  )
}

function FieldLabel({ children, required = false }) {
  return (
    <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
      {children}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
    </label>
  )
}

function TourForm({
  initialData = null,
  onSubmit,
  submitting = false,
  submitText = 'Lưu tour',
}) {
  const initialDataKey = useMemo(
    () => JSON.stringify(initialData || {}),
    [initialData],
  )

  const [prevInitialDataKey, setPrevInitialDataKey] = useState(initialDataKey)
  const [formData, setFormData] = useState(() =>
    getInitialFormData(initialData || {}),
  )

  const [categories, setCategories] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [optionError, setOptionError] = useState('')
  const [thumbnailImage, setThumbnailImage] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(() =>
    getInitialThumbnailPreview(initialData || {}),
  )
  const [galleryImages, setGalleryImages] = useState([])
  const [galleryPreviews, setGalleryPreviews] = useState(() =>
    getInitialImagePreviews(initialData || {}),
  )

  if (initialDataKey !== prevInitialDataKey) {
    setPrevInitialDataKey(initialDataKey)
    setFormData(getInitialFormData(initialData || {}))
    setThumbnailImage(null)
    setThumbnailPreview(getInitialThumbnailPreview(initialData || {}))
    setGalleryImages([])
    setGalleryPreviews(getInitialImagePreviews(initialData || {}))
  }

  useEffect(() => {
    let cancelled = false

    const loadOptions = async () => {
      try {
        setLoadingOptions(true)
        setOptionError('')

        const [categoryRes, destinationRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/categories`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${API_BASE_URL}/admin/destinations`, {
            headers: getAuthHeaders(),
          }),
        ])

        if (categoryRes.status === 401 || destinationRes.status === 401) {
          throw new Error('Bạn chưa đăng nhập hoặc token đã hết hạn.')
        }

        if (!categoryRes.ok) {
          throw new Error(`Không tải được danh mục: ${categoryRes.status}`)
        }

        if (!destinationRes.ok) {
          throw new Error(`Không tải được điểm đến: ${destinationRes.status}`)
        }

        const categoryData = await categoryRes.json()
        const destinationData = await destinationRes.json()

        if (!cancelled) {
          setCategories(normalizeList(categoryData))
          setDestinations(normalizeList(destinationData))
        }
      } catch (error) {
        console.error('LOAD TOUR OPTIONS ERROR:', error)

        if (!cancelled) {
          setOptionError(
            error.message ||
              'Không tải được danh mục hoặc điểm đến. Kiểm tra API backend.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false)
        }
      }
    }

    loadOptions()

    return () => {
      cancelled = true
    }
  }, [])

  const inputClass =
    'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 hover:border-slate-300'

  const selectClass =
    'mt-1.5 h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

  const textareaClass =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

  const widgetClass =
    'rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.04)]'

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'duration_days') {
      setFormData((prev) => ({
        ...prev,
        duration_days: value,
        duration_nights: getDurationNightsFromDays(value),
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const showConfirmToast = ({
    title,
    description,
    confirmText = 'Xác nhận',
    tone = 'rose',
    onConfirm,
  }) => {
    const toneClass =
      tone === 'amber'
        ? {
            border: 'border-amber-100',
            iconBg: 'bg-amber-50',
            iconText: 'text-amber-600',
            button: 'bg-amber-500 hover:bg-amber-600',
          }
        : {
            border: 'border-rose-100',
            iconBg: 'bg-rose-50',
            iconText: 'text-rose-600',
            button: 'bg-rose-500 hover:bg-rose-600',
          }

    toast.custom(
      (toastId) => (
        <div
          className={`w-full max-w-sm rounded-2xl border bg-white p-4 shadow-xl ${toneClass.border}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClass.iconBg} ${toneClass.iconText}`}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {title}
                  </p>
                  <p className="mt-1 text-sm font-normal leading-6 text-slate-500">
                    {description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toast.dismiss(toastId)}
                  className="rounded-md px-2 py-1 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Đóng xác nhận"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => toast.dismiss(toastId)}
                  className="h-9 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toast.dismiss(toastId)
                    onConfirm?.()
                  }}
                  className={`h-9 rounded-lg text-sm font-medium text-white shadow-sm transition ${toneClass.button}`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: 'top-right',
      },
    )
  }

  const handleAddAgePricingRule = () => {
    setFormData((prev) => ({
      ...prev,
      age_pricing_rules: [
        ...(prev.age_pricing_rules || []),
        {
          label: '',
          price_value: '',
          pricing_type: 'fixed',
          sort_order: prev.age_pricing_rules?.length || 0,
          is_active: true,
        },
      ],
    }))
  }

  const handleUpdateAgePricingRule = (indexToUpdate, field, value) => {
    setFormData((prev) => ({
      ...prev,
      age_pricing_rules: (prev.age_pricing_rules || []).map((rule, index) =>
        index === indexToUpdate ? { ...rule, [field]: value } : rule,
      ),
    }))
  }

  const handleRemoveAgePricingRule = (indexToRemove) => {
    const rule = formData.age_pricing_rules?.[indexToRemove]

    showConfirmToast({
      title: 'Xóa mức giá này?',
      description: `Mức giá “${rule?.label || `#${indexToRemove + 1}`}” sẽ bị xóa khỏi form.`,
      confirmText: 'Xóa giá',
      onConfirm: () => {
        setFormData((prev) => ({
          ...prev,
          age_pricing_rules: (prev.age_pricing_rules || []).filter(
            (_, index) => index !== indexToRemove,
          ),
        }))
      },
    })
  }

  const handleThumbnailChange = (e) => {
    const selectedFiles = Array.from(e.target.files || [])

    if (selectedFiles.length === 0) {
      return
    }

    const currentFiles = thumbnailImage ? [thumbnailImage, ...galleryImages] : []

    const nextFiles = [...currentFiles, ...selectedFiles]
    const firstFile = nextFiles[0] || null
    const otherFiles = nextFiles.slice(1)
    const nextObjectUrls = selectedFiles.map((file) => URL.createObjectURL(file))

    setThumbnailImage(firstFile)
    setGalleryImages(otherFiles)

    if (firstFile) {
      setThumbnailPreview(URL.createObjectURL(firstFile))
      setGalleryPreviews((prev) => {
        const keptPreviews = thumbnailImage ? prev : getInitialImagePreviews(initialData || {})

        return [...keptPreviews, ...nextObjectUrls]
      })
    }

    e.target.value = ''
  }

  const updateItinerary = (newItinerary) => {
    setFormData((prev) => ({
      ...prev,
      itinerary: newItinerary,
    }))
  }

  const handleAddStep = (dayNumber) => {
    const daySteps = formData.itinerary.filter(
      (item) => Number(item.day_number) === Number(dayNumber),
    )

    const newStep = {
      day_number: Number(dayNumber),
      sort_order: daySteps.length,
      type: 'sightseeing',
      title: '',
      start_time: '',
      end_time: '',
      duration: '',
      transport: '',
      description: '',
      images: [],
    }

    updateItinerary([...formData.itinerary, newStep])
  }

  const handleRemoveStep = (indexToRemove) => {
    const step = formData.itinerary?.[indexToRemove]

    showConfirmToast({
      title: 'Xóa chặng này?',
      description: `Chặng “${step?.title || `#${indexToRemove + 1}`}” sẽ bị xóa khỏi lịch trình.`,
      confirmText: 'Xóa chặng',
      onConfirm: () => {
        const nextItinerary = formData.itinerary.filter(
          (_, idx) => idx !== indexToRemove,
        )

        updateItinerary(nextItinerary)
      },
    })
  }

  const handleUpdateStep = (indexToUpdate, field, value) => {
    const nextItinerary = formData.itinerary.map((step, idx) => {
      if (idx === indexToUpdate) {
        return { ...step, [field]: value }
      }

      return step
    })

    updateItinerary(nextItinerary)
  }

  const handleAddStepImage = (stepIndex) => {
    const nextItinerary = formData.itinerary.map((step, idx) => {
      if (idx === stepIndex) {
        const currentImages = step.images || []
        const newImages = [
          ...currentImages,
          { image_url: '', alt_text: '', sort_order: currentImages.length },
        ]

        return { ...step, images: newImages }
      }

      return step
    })

    updateItinerary(nextItinerary)
  }

  const handleUpdateStepImage = (stepIndex, imageIndex, field, value) => {
    const nextItinerary = formData.itinerary.map((step, idx) => {
      if (idx === stepIndex) {
        const nextImages = (step.images || []).map((img, imgIdx) => {
          if (imgIdx === imageIndex) {
            return { ...img, [field]: value }
          }

          return img
        })

        return { ...step, images: nextImages }
      }

      return step
    })

    updateItinerary(nextItinerary)
  }

  const handleRemoveStepImage = (stepIndex, imageIndex) => {
    showConfirmToast({
      title: 'Xóa ảnh đính kèm này?',
      description: 'Liên kết ảnh này sẽ bị xóa khỏi chặng hiện tại.',
      confirmText: 'Xóa ảnh',
      onConfirm: () => {
        const nextItinerary = formData.itinerary.map((step, idx) => {
          if (idx === stepIndex) {
            const nextImages = (step.images || []).filter(
              (_, imgIdx) => imgIdx !== imageIndex,
            )

            return { ...step, images: nextImages }
          }

          return step
        })

        updateItinerary(nextItinerary)
      },
    })
  }

  const submitForm = (statusOverride) => {
    const submitStatus = statusOverride || formData.status || 'published'
    const durationNights = getDurationNightsFromDays(formData.duration_days)

    const validationError = validateTourForm({
      formData,
      thumbnailImage,
      thumbnailPreview,
      galleryImages,
      status: submitStatus,
      selectedCategory,
    })

    if (validationError) {
      toast.error(validationError)
      return
    }

    const agePricingRules = normalizeAgePricingRulesForSubmit(
      formData.age_pricing_rules,
    )

    const payload = new FormData()

    payload.append('category_id', formData.category_id)
    payload.append('destination_id', formData.destination_id)
    payload.append('title', formData.title.trim())
    payload.append('summary', formData.summary || '')
    payload.append('description', formData.description || '')

    payload.append(
      'itinerary',
      JSON.stringify(normalizeItineraryForSubmit(formData.itinerary)),
    )

    payload.append('duration_days', Number(formData.duration_days))
    payload.append('duration_nights', durationNights)
    payload.append('base_price', Number(formData.base_price || 0))
    payload.append('discount_price', 0)
    payload.append('max_slots', Number(formData.max_slots ?? 1))
    payload.append(
      'available_slots',
      Number(formData.available_slots ?? formData.max_slots ?? 1),
    )
    payload.append('status', submitStatus)
    payload.append('age_pricing_rules', JSON.stringify(agePricingRules))

    if (thumbnailImage) {
      payload.append('thumbnail_image', thumbnailImage)
    }

    galleryImages.forEach((file) => {
      payload.append('gallery_images[]', file)
    })

    payload.append(
      'thumbnail_alt_text',
      formData.thumbnail_alt_text || formData.title.trim() || 'Ảnh tour',
    )

    onSubmit(payload)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    submitForm()
  }

  const handleSaveDraft = () => {
    submitForm('draft')
  }

  const currentCategoryMissing =
    formData.category_id &&
    !categories.some((item) => String(item.id) === String(formData.category_id))

  const currentDestinationMissing =
    formData.destination_id &&
    !destinations.some(
      (item) => String(item.id) === String(formData.destination_id),
    )

  const selectedCategory =
    categories.find((item) => String(item.id) === String(formData.category_id)) ||
    initialData?.category ||
    initialData?.category_data ||
    initialData?.categoryInfo ||
    null
  const durationLimit = getTourDurationLimit(selectedCategory)
  const requestedDurationDays = Number(formData.duration_days || 1)
  const visibleDurationDays = Math.max(
    1,
    Math.min(
      Number.isFinite(requestedDurationDays) ? requestedDurationDays : 1,
      durationLimit.maxDays,
    ),
  )
  const isDurationDaysOverLimit =
    Number(formData.duration_days) > durationLimit.maxDays

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {optionError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
          {optionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className={widgetClass}>
            <CardTitle
              title="Thông tin cơ bản"
              icon={
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.4}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7h8M8 11h8M8 15h5M6 3h9l3 3v15H6V3z"
                  />
                </svg>
              }
            />

            <div className="space-y-5">
              <div>
                <FieldLabel required>Tên tour</FieldLabel>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  maxLength={MAX_TITLE_LENGTH}
                  placeholder="Nhập tên tour (ví dụ: Đà Nẵng - Hội An 3N2Đ)"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <FieldLabel>Tóm tắt</FieldLabel>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {(formData.summary || '').length}/300
                  </span>
                </div>

                <textarea
                  name="summary"
                  value={formData.summary}
                  onChange={handleChange}
                  maxLength={MAX_SUMMARY_LENGTH}
                  placeholder="Nhập tóm tắt ngắn gọn về tour (hiển thị trên danh sách tour)..."
                  rows="3"
                  className={textareaClass}
                />
              </div>

              <div>
                <FieldLabel required>Mô tả chi tiết</FieldLabel>

                <div className="mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                  <div className="flex h-11 items-center gap-1 border-b border-slate-100 bg-slate-50/60 px-2.5 text-slate-600">
                    <button
                      type="button"
                      className="h-8 rounded-lg px-3 text-xs font-bold hover:bg-white"
                    >
                      Đoạn
                    </button>
                    {['B', 'I', 'U', 'S'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="h-8 w-8 rounded-lg text-sm font-black hover:bg-white"
                      >
                        {item}
                      </button>
                    ))}
                    <span className="mx-1 h-5 w-px bg-slate-200" />
                    {['☷', '☰', '≡', '↔', '🔗', '▧', '⋯'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="h-8 w-8 rounded-lg text-sm font-bold hover:bg-white"
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Nhập thông tin chi tiết về các hoạt động chính, quy định, lưu ý..."
                    rows="7"
                    className="w-full resize-y border-0 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                  />

                  <div className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2 text-[11px] font-semibold text-slate-400">
                    <span>{(formData.description || '').trim() ? (formData.description || '').trim().split(/\s+/).length : 0} từ</span>
                    <span>Được hỗ trợ bởi trình soạn thảo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={widgetClass}>
            <CardTitle
              title="Lịch trình chi tiết theo ngày"
              description="Tạo các chặng tham quan, ăn uống, di chuyển cho từng ngày dựa theo số ngày bên phải."
              icon={
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.4}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3M5 11h14M5 5h14v16H5V5z"
                  />
                </svg>
              }
            />

            <div className="space-y-5">
              {isDurationDaysOverLimit ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-700">
                  Số ngày tối đa cho tour {durationLimit.label} là {durationLimit.maxDays}. Lịch trình chỉ hiển thị tối đa {durationLimit.maxDays} ngày để tránh form bị quá tải; dữ liệu đã nhập không bị xóa.
                </div>
              ) : null}

              {Array.from({
                length: visibleDurationDays,
              }).map((_, dIdx) => {
                const dayNum = dIdx + 1
                const daySteps = formData.itinerary
                  .map((step, originalIdx) => ({ ...step, originalIdx }))
                  .filter((step) => Number(step.day_number) === dayNum)
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

                return (
                  <div
                    key={dayNum}
                    className="rounded-xl border border-slate-200 bg-slate-50/40 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-sm font-black text-slate-800">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-700">
                          {dayNum}
                        </span>
                        Ngày {dayNum}
                      </h4>

                      <button
                        type="button"
                        onClick={() => handleAddStep(dayNum)}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-100 bg-white px-3 text-xs font-black text-blue-600 shadow-sm transition hover:bg-blue-50"
                      >
                        + Thêm chặng mới
                      </button>
                    </div>

                    {daySteps.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-blue-200 bg-white px-4 py-9 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                            />
                          </svg>
                        </div>

                        <p className="text-xs font-semibold text-slate-500">
                          Chưa có chặng nào được thiết lập trong ngày {dayNum}
                        </p>

                        <button
                          type="button"
                          onClick={() => handleAddStep(dayNum)}
                          className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-sm shadow-blue-100 transition hover:bg-blue-700"
                        >
                          + Thêm chặng đầu tiên
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {daySteps.map((step, stepIdx) => {
                          const originalIdx = step.originalIdx
                          const currentType = step.type || 'sightseeing'

                          return (
                            <div
                              key={stepIdx}
                              className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.03)] transition hover:border-slate-300"
                            >
                              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-500">
                                    #{stepIdx + 1}
                                  </span>

                                  <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                    {TYPE_ICONS[currentType] ||
                                      TYPE_ICONS.sightseeing}
                                    <span>{currentType}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveStep(originalIdx)}
                                  className="text-[11px] font-black text-red-500 transition hover:text-red-700"
                                >
                                  Xóa chặng
                                </button>
                              </div>

                              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                                <div>
                                  <FieldLabel>Loại hoạt động</FieldLabel>
                                  <select
                                    value={currentType}
                                    onChange={(e) =>
                                      handleUpdateStep(
                                        originalIdx,
                                        'type',
                                        e.target.value,
                                      )
                                    }
                                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                                  >
                                    <option value="departure">
                                      Điểm xuất phát (Departure)
                                    </option>
                                    <option value="transport">
                                      Di chuyển (Transport)
                                    </option>
                                    <option value="sightseeing">
                                      Điểm tham quan (Sightseeing)
                                    </option>
                                    <option value="meal">Ăn uống (Meal)</option>
                                    <option value="free_time">
                                      Tự do (Free time)
                                    </option>
                                    <option value="return">
                                      Trở về (Return)
                                    </option>
                                  </select>
                                </div>

                                <div className="md:col-span-2">
                                  <FieldLabel>Tiêu đề chặng</FieldLabel>
                                  <input
                                    type="text"
                                    value={step.title || ''}
                                    onChange={(e) =>
                                      handleUpdateStep(
                                        originalIdx,
                                        'title',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Ví dụ: Đón sân bay Nội Bài / Khám phá Phố Cổ"
                                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <FieldLabel>Giờ bắt đầu</FieldLabel>
                                  <input
                                    type="time"
                                    value={step.start_time || ''}
                                    onChange={(e) =>
                                      handleUpdateStep(
                                        originalIdx,
                                        'start_time',
                                        e.target.value,
                                      )
                                    }
                                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <FieldLabel>Thời lượng</FieldLabel>
                                  <input
                                    type="text"
                                    value={step.duration || ''}
                                    onChange={(e) =>
                                      handleUpdateStep(
                                        originalIdx,
                                        'duration',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Ví dụ: 2 tiếng, 45 phút"
                                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <FieldLabel>Phương tiện</FieldLabel>
                                  <input
                                    type="text"
                                    value={step.transport || ''}
                                    onChange={(e) =>
                                      handleUpdateStep(
                                        originalIdx,
                                        'transport',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Ví dụ: Ô tô, Xe máy, Đi bộ"
                                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                                  />
                                </div>

                                <div className="md:col-span-3">
                                  <FieldLabel>Mô tả chi tiết hoạt động</FieldLabel>
                                  <textarea
                                    value={step.description || ''}
                                    onChange={(e) =>
                                      handleUpdateStep(
                                        originalIdx,
                                        'description',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Nhập mô tả hoạt động của chặng dừng hoặc hướng dẫn..."
                                    rows="2"
                                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                                  />
                                </div>

                                <div className="mt-1 border-t border-slate-100 pt-3 md:col-span-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                                      Hình ảnh đính kèm (
                                      {(step.images || []).length})
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAddStepImage(originalIdx)
                                      }
                                      className="text-[11px] font-black text-blue-600 transition hover:text-blue-700"
                                    >
                                      + Thêm liên kết ảnh
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    {(step.images || []).map((img, imgIdx) => (
                                      <div
                                        key={imgIdx}
                                        className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2"
                                      >
                                        <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
                                          <input
                                            type="text"
                                            value={img.image_url || ''}
                                            onChange={(e) =>
                                              handleUpdateStepImage(
                                                originalIdx,
                                                imgIdx,
                                                'image_url',
                                                e.target.value,
                                              )
                                            }
                                            placeholder="URL ảnh"
                                            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500"
                                          />

                                          <input
                                            type="text"
                                            value={img.alt_text || ''}
                                            onChange={(e) =>
                                              handleUpdateStepImage(
                                                originalIdx,
                                                imgIdx,
                                                'alt_text',
                                                e.target.value,
                                              )
                                            }
                                            placeholder="Mô tả ảnh (Alt)"
                                            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500"
                                          />
                                        </div>

                                        {img.image_url && (
                                          <div className="h-9 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                            <img
                                              src={img.image_url}
                                              alt="preview"
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveStepImage(
                                              originalIdx,
                                              imgIdx,
                                            )
                                          }
                                          className="px-1 text-xs font-bold text-red-500 hover:text-red-700"
                                        >
                                          Xóa
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="w-full space-y-5 xl:w-[360px]">
          <div className={widgetClass}>
            <CardTitle
              title="Hình ảnh tour"
              icon={
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.4}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
            />

            <div className="space-y-4">
              <div>
                <FieldLabel>Ảnh đại diện</FieldLabel>

                <label
                  htmlFor="thumbnail_image"
                  className="mt-1.5 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/30 px-4 py-6 text-center transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <svg
                    className="mb-2 h-8 w-8 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3"
                    />
                  </svg>

                  <span className="text-sm font-black text-slate-700">
                    Tải ảnh lên hoặc kéo thả vào đây
                  </span>
                  <span className="mt-1 text-xs font-medium text-slate-400">
                    Chọn 1 hoặc nhiều ảnh. Ảnh đầu tiên là ảnh đại diện.
                  </span>

                  <span className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-blue-100 bg-white px-4 text-xs font-black text-blue-600 shadow-sm">
                    Chọn / thêm ảnh
                  </span>
                </label>

                <input
                  id="thumbnail_image"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleThumbnailChange}
                  className="sr-only"
                />
              </div>

              <div>
                <FieldLabel>Ảnh xem trước</FieldLabel>

                {galleryPreviews.length > 0 ? (
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {galleryPreviews.map((src, index) => (
                      <div
                        key={`${src}-${index}`}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                      >
                        <img
                          src={src}
                          alt={`Xem trước ảnh tour ${index + 1}`}
                          className="aspect-square w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : thumbnailPreview ? (
                  <div className="mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={thumbnailPreview}
                      alt="Xem trước ảnh tour"
                      className="h-32 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mt-1.5 flex h-24 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-xs font-semibold text-slate-400">
                    Chưa có ảnh
                  </div>
                )}
              </div>

              <div>
                <FieldLabel>Văn bản thay thế (Alt text)</FieldLabel>
                <input
                  type="text"
                  name="thumbnail_alt_text"
                  value={formData.thumbnail_alt_text}
                  onChange={handleChange}
                  maxLength={MAX_ALT_TEXT_LENGTH}
                  placeholder="Mô tả ảnh (tùy chọn)..."
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className={widgetClass}>
            <CardTitle
              title="Cấu trúc & Cài đặt"
              icon={
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.4}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.591 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.592c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.591c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.591 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.591-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.591c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.592c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.591-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
            />

            <div className="space-y-4">
              <div>
                <FieldLabel required>Danh mục</FieldLabel>
                <div className="relative">
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    disabled={loadingOptions}
                    className={selectClass}
                  >
                    <option value="">
                      {loadingOptions ? 'Đang tải...' : 'Chọn danh mục'}
                    </option>

                    {currentCategoryMissing && (
                      <option value={formData.category_id}>
                        Danh mục #{formData.category_id}
                      </option>
                    )}

                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getOptionName(item, `Danh mục #${item.id}`)}
                      </option>
                    ))}
                  </select>

                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 pt-1.5 text-slate-400">
                    <svg
                      className="h-3.5 w-3.5 stroke-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel required>Điểm đến</FieldLabel>
                <div className="relative">
                  <select
                    name="destination_id"
                    value={formData.destination_id}
                    onChange={handleChange}
                    disabled={loadingOptions}
                    className={selectClass}
                  >
                    <option value="">
                      {loadingOptions ? 'Đang tải...' : 'Chọn điểm đến'}
                    </option>

                    {currentDestinationMissing && (
                      <option value={formData.destination_id}>
                        Điểm đến #{formData.destination_id}
                      </option>
                    )}

                    {destinations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getOptionName(item, `Điểm đến #${item.id}`)}
                      </option>
                    ))}
                  </select>

                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 pt-1.5 text-slate-400">
                    <svg
                      className="h-3.5 w-3.5 stroke-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>Số ngày</FieldLabel>
                  <input
                    type="number"
                    name="duration_days"
                    min="1"
                    max={durationLimit.maxDays}
                    step="1"
                    value={formData.duration_days}
                    onChange={handleChange}
                    placeholder="VD: 3"
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Tối đa {durationLimit.maxDays} ngày với tour {durationLimit.label}.
                  </p>
                </div>

                <div>
                  <FieldLabel required>Số đêm</FieldLabel>
                  <input
                    type="number"
                    name="duration_nights"
                    value={getDurationNightsFromDays(formData.duration_days)}
                    readOnly
                    placeholder="Tự động"
                    className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`}
                  />
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Tự động tính bằng số ngày - 1.
                  </p>
                </div>
              </div>

              <div>
                <FieldLabel required>Giá gốc tour</FieldLabel>
                <input
                  type="number"
                  name="base_price"
                  min="0"
                  step="1000"
                  value={formData.base_price}
                  onChange={handleChange}
                  placeholder="VD: 1000000"
                  className={inputClass}
                />
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <FieldLabel>Giá theo độ tuổi / phụ thu</FieldLabel>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">
                      ví dụ: 3-5 tuổi, 10-15 tuổi, trên 18 tuổi.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddAgePricingRule}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white px-3 text-xs font-black text-blue-600 shadow-sm transition hover:bg-blue-50"
                  >
                    + Thêm giá
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(formData.age_pricing_rules || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-xs font-semibold text-slate-400">
                      Chưa có mức giá theo độ tuổi / phụ thu
                    </div>
                  ) : (
                    (formData.age_pricing_rules || []).map((rule, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[minmax(0,1fr)_130px_auto] items-end gap-2 rounded-xl border border-slate-100 bg-white p-2.5"
                      >
                        <div>
                          <FieldLabel>Độ tuổi</FieldLabel>
                          <input
                            type="text"
                            value={rule.label || ''}
                            onChange={(e) =>
                              handleUpdateAgePricingRule(
                                index,
                                'label',
                                e.target.value,
                              )
                            }
                            placeholder="VD: 3-5 tuổi"
                            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <FieldLabel>Giá / phụ thu</FieldLabel>
                          <input
                            type="number"
                            min="0"
                            value={rule.price_value ?? ''}
                            onChange={(e) =>
                              handleUpdateAgePricingRule(
                                index,
                                'price_value',
                                e.target.value,
                              )
                            }
                            placeholder="VD: 300000"
                            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAgePricingRule(index)}
                          className="mb-0.5 h-10 rounded-lg px-2 text-[11px] font-black text-red-500 transition hover:bg-red-50 hover:text-red-700"
                        >
                          Xóa
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={widgetClass}>
            <CardTitle
              title="Trạng thái & Hành động"
              icon={
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.4}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 6h9.75M10.5 12h9.75M10.5 18h9.75M3.75 6h.008v.008H3.75V6zm0 6h.008v.008H3.75V12zm0 6h.008v.008H3.75V18z"
                  />
                </svg>
              }
            />

            <div className="space-y-4">
              <div>
                <FieldLabel required>Trạng thái</FieldLabel>

                <div className="relative">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Hiển thị</option>
                    <option value="hidden">Ẩn</option>
                  </select>

                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 pt-1.5 text-slate-400">
                    <svg
                      className="h-3.5 w-3.5 stroke-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Lưu nháp
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow-sm shadow-blue-100 transition hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Đang lưu...' : submitText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

export default TourForm
