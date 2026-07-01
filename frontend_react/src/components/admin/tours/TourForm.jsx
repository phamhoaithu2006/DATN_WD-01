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
    max_slots: initialData.max_slots ?? '',
    available_slots: initialData.available_slots ?? '',
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

  if (initialDataKey !== prevInitialDataKey) {
    setPrevInitialDataKey(initialDataKey)
    setFormData(getInitialFormData(initialData || {}))
    setThumbnailImage(null)
    setThumbnailPreview(getInitialThumbnailPreview(initialData || {}))
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

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0]

    setThumbnailImage(file || null)

    if (file) {
      setThumbnailPreview(URL.createObjectURL(file))
    } else {
      setThumbnailPreview(getInitialThumbnailPreview(initialData || {}))
    }
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
    const nextItinerary = formData.itinerary.filter(
      (_, idx) => idx !== indexToRemove,
    )

    updateItinerary(nextItinerary)
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
  }

  const submitForm = (statusOverride) => {
    if (!formData.category_id) {
      toast.error('Vui lòng chọn danh mục')
      return
    }

    if (!formData.destination_id) {
      toast.error('Vui lòng chọn điểm đến')
      return
    }

    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tên tour')
      return
    }

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

    payload.append('duration_days', formData.duration_days || 1)
    payload.append('duration_nights', formData.duration_nights || 0)
    payload.append('base_price', formData.base_price || 0)
    payload.append('discount_price', formData.discount_price || 0)
    payload.append('max_slots', formData.max_slots || 1)
    payload.append(
      'available_slots',
      formData.available_slots || formData.max_slots || 1,
    )
    payload.append('status', statusOverride || formData.status || 'published')

    if (thumbnailImage) {
      payload.append('thumbnail_image', thumbnailImage)
    }

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
              {Array.from({
                length: Math.max(1, Number(formData.duration_days || 1)),
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
                    Định dạng JPG, PNG, WebP. Tối đa 5MB.
                  </span>

                  <span className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-blue-100 bg-white px-4 text-xs font-black text-blue-600 shadow-sm">
                    Chọn ảnh
                  </span>
                </label>

                <input
                  id="thumbnail_image"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="sr-only"
                />
              </div>

              <div>
                <FieldLabel>Ảnh xem trước</FieldLabel>

                {thumbnailPreview ? (
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
                    value={formData.duration_days}
                    onChange={handleChange}
                    placeholder="VD: 3"
                    className={inputClass}
                  />
                </div>

                <div>
                  <FieldLabel required>Số đêm</FieldLabel>
                  <input
                    type="number"
                    name="duration_nights"
                    value={formData.duration_nights}
                    onChange={handleChange}
                    placeholder="VD: 2"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>Chỗ tối đa</FieldLabel>
                  <input
                    type="number"
                    name="max_slots"
                    value={formData.max_slots}
                    onChange={handleChange}
                    placeholder="VD: 30"
                    className={inputClass}
                  />
                </div>

                <div>
                  <FieldLabel required>Chỗ trống</FieldLabel>
                  <input
                    type="number"
                    name="available_slots"
                    value={formData.available_slots}
                    onChange={handleChange}
                    placeholder="Auto"
                    className={inputClass}
                  />
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
