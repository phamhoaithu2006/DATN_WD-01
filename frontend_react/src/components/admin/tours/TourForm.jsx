import { useEffect, useMemo, useState } from 'react'

const getInitialFormData = (initialData = {}) => ({
  category_id: initialData.category_id ?? '',
  destination_id: initialData.destination_id ?? '',
  title: initialData.title ?? '',
  summary: initialData.summary ?? '',
  description: initialData.description ?? '',
  itinerary: initialData.itinerary ?? '',
  duration_days: initialData.duration_days ?? '',
  duration_nights: initialData.duration_nights ?? '',
  base_price: initialData.base_price ?? '',
  discount_price: initialData.discount_price ?? '',
  max_slots: initialData.max_slots ?? '',
  available_slots: initialData.available_slots ?? '',
  status: initialData.status ?? 'published',
})

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

  const [formData, setFormData] = useState(() =>
    getInitialFormData(initialData || {}),
  )

  useEffect(() => {
    setFormData(getInitialFormData(initialData || {}))
  }, [initialDataKey])

  const inputClass =
    'mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

  const textareaClass =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

  const labelClass = 'text-sm font-bold text-slate-700'

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.category_id) {
      alert('Vui lòng nhập ID danh mục')
      return
    }

    if (!formData.destination_id) {
      alert('Vui lòng nhập ID điểm đến')
      return
    }

    if (!formData.title.trim()) {
      alert('Vui lòng nhập tên tour')
      return
    }

    const payload = new FormData()

    payload.append('category_id', formData.category_id)
    payload.append('destination_id', formData.destination_id)
    payload.append('created_by', initialData?.created_by || 1)
    payload.append('title', formData.title.trim())
    payload.append('summary', formData.summary || '')
    payload.append('description', formData.description || '')
    payload.append('itinerary', formData.itinerary || '')
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-slate-950">
            Thông tin tour
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Nhập thông tin cơ bản để tạo hoặc cập nhật tour.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>ID danh mục</label>
            <input
              type="number"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              placeholder="Nhập ID danh mục"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>ID điểm đến</label>
            <input
              type="number"
              name="destination_id"
              value={formData.destination_id}
              onChange={handleChange}
              placeholder="Nhập ID điểm đến"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Tên tour</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ví dụ: Tour Đà Nẵng 3 ngày 2 đêm"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Số ngày</label>
            <input
              type="number"
              name="duration_days"
              value={formData.duration_days}
              onChange={handleChange}
              placeholder="Ví dụ: 3"
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
              placeholder="Ví dụ: 2"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Giá gốc</label>
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
            <label className={labelClass}>Giá giảm</label>
            <input
              type="number"
              name="discount_price"
              value={formData.discount_price}
              onChange={handleChange}
              placeholder="Ví dụ: 3000000"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Số chỗ tối đa</label>
            <input
              type="number"
              name="max_slots"
              value={formData.max_slots}
              onChange={handleChange}
              placeholder="Ví dụ: 30"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Số chỗ còn lại</label>
            <input
              type="number"
              name="available_slots"
              value={formData.available_slots}
              onChange={handleChange}
              placeholder="Bỏ trống sẽ lấy theo số chỗ tối đa"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Trạng thái</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="published">Hiển thị</option>
              <option value="draft">Nháp</option>
              <option value="inactive">Ẩn</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Tóm tắt</label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              placeholder="Nhập mô tả ngắn cho tour"
              rows="3"
              className={textareaClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Mô tả chi tiết</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Nhập mô tả chi tiết"
              rows="5"
              className={textareaClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Lịch trình</label>
            <textarea
              name="itinerary"
              value={formData.itinerary}
              onChange={handleChange}
              placeholder="Nhập lịch trình tour"
              rows="5"
              className={textareaClass}
            />
          </div>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Đang lưu...' : submitText}
          </button>
        </div>
      </div>
    </form>
  )
}

export default TourForm