import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
).replace(/\/$/, '')

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

const getInitialFormData = (initialData = {}) => {
  let itineraryData = []
  if (Array.isArray(initialData.itinerary)) {
    itineraryData = initialData.itinerary
  } else if (typeof initialData.itinerary === 'string' && initialData.itinerary.trim() !== '') {
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
    itinerary: itineraryData,
    duration_days: initialData.duration_days ?? '',
    duration_nights: initialData.duration_nights ?? '',
    base_price: initialData.base_price ?? '',
    discount_price: initialData.discount_price ?? '',
    max_slots: initialData.max_slots ?? '',
    available_slots: initialData.available_slots ?? '',
    status: initialData.status ?? 'published',
  }
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
    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  transport: (
    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  sightseeing: (
    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  meal: (
    <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  free_time: (
    <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  return: (
    <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
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

  if (initialDataKey !== prevInitialDataKey) {
    setPrevInitialDataKey(initialDataKey)
    setFormData(getInitialFormData(initialData || {}))
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
        error.message || 'Không tải được danh mục hoặc điểm đến. Kiểm tra API backend.',
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
    'mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 hover:border-slate-300'

  const selectClass =
    'mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 hover:border-slate-300 cursor-pointer appearance-none'

  const textareaClass =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 hover:border-slate-300'

  const labelClass = 'text-[10px] font-extrabold uppercase tracking-wider text-slate-500'

  const widgetClass = 'rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]'

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Helpers to update internal itinerary array
  const updateItinerary = (newItinerary) => {
    setFormData((prev) => ({
      ...prev,
      itinerary: newItinerary,
    }))
  }

  const handleAddStep = (dayNumber) => {
    const daySteps = formData.itinerary.filter((item) => Number(item.day_number) === Number(dayNumber))
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
      images: []
    }
    updateItinerary([...formData.itinerary, newStep])
  }

  const handleRemoveStep = (indexToRemove) => {
    const nextItinerary = formData.itinerary.filter((_, idx) => idx !== indexToRemove)
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
          { image_url: '', alt_text: '', sort_order: currentImages.length }
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
        const nextImages = (step.images || []).filter((_, imgIdx) => imgIdx !== imageIndex)
        return { ...step, images: nextImages }
      }
      return step
    })
    updateItinerary(nextItinerary)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

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
    
    // Convert itinerary to string representation of JSON array
    payload.append('itinerary', JSON.stringify(formData.itinerary))
    
    payload.append('duration_days', formData.duration_days || 1)
    payload.append('duration_nights', formData.duration_nights || 0)
    payload.append('base_price', formData.base_price || 0)
    payload.append('discount_price', formData.discount_price || 0)
    payload.append('max_slots', formData.max_slots || 1)
    payload.append(
      'available_slots',
      formData.available_slots || formData.max_slots || 1,
    )
    payload.append('status', formData.status || 'published')

    onSubmit(payload)
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
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs font-semibold text-red-655">
          {optionError}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* LEFT COLUMN: Main Editor Area (2/3 width) */}
        <div className="flex-1 min-w-0 space-y-6 w-full">
          
          {/* Main Title Input (Gutenberg / Medium Style) */}
          <div className="mb-4">
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Nhập tên tour mới..."
              className="w-full text-2xl md:text-3xl font-black text-slate-900 border-b border-slate-100 hover:border-slate-200 focus:border-blue-500 rounded-none bg-transparent py-3 outline-none transition placeholder:text-slate-400"
            />
          </div>

          {/* Card: Nội dung giới thiệu */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Nội dung & Giới thiệu
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Tóm tắt Tour</label>
                <textarea
                  name="summary"
                  value={formData.summary}
                  onChange={handleChange}
                  placeholder="Nhập mô tả ngắn gọn thu hút khách hàng..."
                  rows="2"
                  className={textareaClass}
                />
              </div>

              <div>
                <label className={labelClass}>Mô tả chi tiết</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Nhập thông tin chi tiết về các hoạt động chính, quy định, lưu ý..."
                  rows="6"
                  className={textareaClass}
                />
              </div>
            </div>
          </div>

          {/* Card: Lịch trình chi tiết */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Lịch trình chi tiết theo ngày
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                  Tạo các chặng tham quan, ăn uống, di chuyển cho từng ngày dựa theo Số ngày trên Sidebar
                </p>
              </div>
            </div>

            {/* Loop through duration_days */}
            <div className="space-y-6">
              {Array.from({ length: Math.max(1, Number(formData.duration_days || 1)) }).map((_, dIdx) => {
                const dayNum = dIdx + 1
                const daySteps = formData.itinerary
                  .map((step, originalIdx) => ({ ...step, originalIdx }))
                  .filter((step) => Number(step.day_number) === dayNum)
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

                return (
                  <div key={dayNum} className="rounded-xl border border-slate-150 bg-slate-50/20 p-4">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100/50">
                      <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-bold">
                          {dayNum}
                        </span>
                        Ngày {dayNum}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleAddStep(dayNum)}
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-50 px-3 text-[10px] font-extrabold text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                      >
                        + Thêm chặng mới
                      </button>
                    </div>

                    {daySteps.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-white/50">
                        <p className="text-[11px] text-slate-400 italic">
                          Chưa có chặng nào được thiết lập trong ngày {dayNum}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAddStep(dayNum)}
                          className="mt-2 text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          Tạo chặng đầu tiên
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
                              className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:border-slate-300 transition"
                            >
                              <div className="flex items-center justify-between mb-3 border-b border-slate-100/60 pb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                                    #{stepIdx + 1}
                                  </span>
                                  <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    {TYPE_ICONS[currentType] || TYPE_ICONS.sightseeing}
                                    <span>{currentType}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStep(originalIdx)}
                                  className="text-[10px] font-extrabold text-red-500 hover:text-red-700 transition cursor-pointer"
                                >
                                  Xóa chặng
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                {/* Type Select */}
                                <div>
                                  <label className={labelClass}>Loại hoạt động</label>
                                  <select
                                    value={currentType}
                                    onChange={(e) => handleUpdateStep(originalIdx, 'type', e.target.value)}
                                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition cursor-pointer"
                                  >
                                    <option value="departure">Điểm xuất phát (Departure)</option>
                                    <option value="transport">Di chuyển (Transport)</option>
                                    <option value="sightseeing">Điểm tham quan (Sightseeing)</option>
                                    <option value="meal">Ăn uống (Meal)</option>
                                    <option value="free_time">Tự do (Free time)</option>
                                    <option value="return">Trở về (Return)</option>
                                  </select>
                                </div>

                                {/* Title Input */}
                                <div className="md:col-span-2">
                                  <label className={labelClass}>Tiêu đề chặng</label>
                                  <input
                                    type="text"
                                    value={step.title || ''}
                                    onChange={(e) => handleUpdateStep(originalIdx, 'title', e.target.value)}
                                    placeholder="Ví dụ: Đón sân bay Nội Bài / Khám phá Phố Cổ"
                                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition"
                                  />
                                </div>

                                {/* Start Time */}
                                <div>
                                  <label className={labelClass}>Giờ bắt đầu</label>
                                  <input
                                    type="time"
                                    value={step.start_time ? step.start_time.slice(0, 5) : ''}
                                    onChange={(e) => handleUpdateStep(originalIdx, 'start_time', e.target.value)}
                                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition"
                                  />
                                </div>

                                {/* Duration */}
                                <div>
                                  <label className={labelClass}>Thời lượng</label>
                                  <input
                                    type="text"
                                    value={step.duration || ''}
                                    onChange={(e) => handleUpdateStep(originalIdx, 'duration', e.target.value)}
                                    placeholder="Ví dụ: 2 tiếng, 45 phút"
                                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition"
                                  />
                                </div>

                                {/* Transport */}
                                <div>
                                  <label className={labelClass}>Phương tiện</label>
                                  <input
                                    type="text"
                                    value={step.transport || ''}
                                    onChange={(e) => handleUpdateStep(originalIdx, 'transport', e.target.value)}
                                    placeholder="Ví dụ: Ô tô, Xe máy, Đi bộ"
                                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition"
                                  />
                                </div>

                                {/* Description */}
                                <div className="md:col-span-3">
                                  <label className={labelClass}>Mô tả chi tiết hoạt động</label>
                                  <textarea
                                    value={step.description || ''}
                                    onChange={(e) => handleUpdateStep(originalIdx, 'description', e.target.value)}
                                    placeholder="Nhập mô tả hoạt động của chặng dừng hoặc hướng dẫn..."
                                    rows="2"
                                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition"
                                  />
                                </div>

                                {/* Images Section */}
                                <div className="md:col-span-3 border-t border-slate-100 pt-3 mt-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={labelClass}>
                                      Hình ảnh đính kèm ({ (step.images || []).length })
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAddStepImage(originalIdx)}
                                      className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                                    >
                                      + Thêm liên kết ảnh
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    {(step.images || []).map((img, imgIdx) => (
                                      <div key={imgIdx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                          <input
                                            type="text"
                                            value={img.image_url || ''}
                                            onChange={(e) => handleUpdateStepImage(originalIdx, imgIdx, 'image_url', e.target.value)}
                                            placeholder="URL ảnh"
                                            className="h-8 rounded border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500"
                                          />
                                          <input
                                            type="text"
                                            value={img.alt_text || ''}
                                            onChange={(e) => handleUpdateStepImage(originalIdx, imgIdx, 'alt_text', e.target.value)}
                                            placeholder="Mô tả ảnh (Alt)"
                                            className="h-8 rounded border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500"
                                          />
                                        </div>
                                        
                                        {img.image_url && (
                                          <div className="w-10 h-8 rounded overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                                            <img src={img.image_url} alt="preview" className="w-full h-full object-cover" />
                                          </div>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveStepImage(originalIdx, imgIdx)}
                                          className="text-xs text-red-500 hover:text-red-700 px-1 font-bold cursor-pointer"
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

        {/* RIGHT COLUMN: Sidebar Widgets (1/3 width) */}
        <div className="w-full lg:w-80 space-y-6 flex-shrink-0">
          
          {/* Widget 1: Publish Controls */}
          <div className={widgetClass}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Xuất bản
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Trạng thái</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="published">Hiển thị (Published)</option>
                  <option value="draft">Bản nháp (Draft)</option>
                  <option value="inactive">Tạm ẩn (Inactive)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm shadow-blue-100 transition hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Đang lưu...' : submitText}
              </button>
            </div>
          </div>

          {/* Widget 2: Classification & Settings */}
          <div className={widgetClass}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Cấu trúc & Cài đặt
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Danh mục</label>
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
                    <svg className="h-3.5 w-3.5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Điểm đến</label>
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
                    <svg className="h-3.5 w-3.5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Số ngày</label>
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
                  <label className={labelClass}>Số đêm</label>
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
            </div>
          </div>

          {/* Widget 3: Pricing & Capacity */}
          <div className={widgetClass}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Giá cả & Vận hành
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Giá gốc (VND)</label>
                <input
                  type="number"
                  name="base_price"
                  value={formData.base_price}
                  onChange={handleChange}
                  placeholder="Ví dụ: 3500000"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Giá giảm (VND)</label>
                <input
                  type="number"
                  name="discount_price"
                  value={formData.discount_price}
                  onChange={handleChange}
                  placeholder="Ví dụ: 3000000"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Chỗ tối đa</label>
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
                  <label className={labelClass}>Chỗ trống</label>
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

        </div>
      </div>
    </form>
  )
}

export default TourForm