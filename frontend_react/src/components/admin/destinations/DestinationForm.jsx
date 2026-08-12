import { useEffect, useState } from 'react'
import Select from 'react-select'

import { DESTINATION_IMAGE_ACCEPT } from '../../../utils/imageUpload'

function DestinationForm({
  formData,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
  onRemoveThumbnail,
  provinces = [],
  onProvinceSelect,
}) {
  const [previewUrl, setPreviewUrl] = useState(formData.thumbnail_url || '')
  const selectedFile = formData.thumbnail_image
  const hasSelectedFile =
    typeof File !== 'undefined' && selectedFile instanceof File

  useEffect(() => {
    if (!hasSelectedFile) {
      setPreviewUrl(formData.thumbnail_url || '')
      return undefined
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [formData.thumbnail_url, hasSelectedFile, selectedFile])

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Core Info & Location (col-span-8) */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Card 1: Basic Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-500"></span>
              Thông tin cơ bản
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Tên điểm đến <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Ví dụ: Chùa Bà Nà"
                    value={formData.name}
                    onChange={onChange}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Slug đường dẫn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="slug"
                    placeholder="vi-du: chua-ba-na"
                    value={formData.slug}
                    onChange={onChange}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Tỉnh / Thành phố thuộc hệ thống <span className="text-red-500">*</span>
                </label>
                <Select
                  options={provinces.map((province) => ({ value: province.id, label: province.name }))}
                  value={
                    provinces
                      .map((province) => ({ value: province.id, label: province.name }))
                      .find((option) => String(option.value) === String(formData.province_ids?.[0] || '')) || null
                  }
                  onChange={(selectedOption) => onProvinceSelect?.(selectedOption)}
                  placeholder="Gõ để tìm kiếm và chọn Tỉnh/Thành phố..."
                  className="text-sm text-slate-900"
                  styles={{
                    control: (baseStyles, state) => ({
                      ...baseStyles,
                      minHeight: '2.75rem',
                      borderRadius: '0.75rem',
                      borderColor: state.isFocused ? '#0ea5e9' : '#cbd5e1',
                      boxShadow: state.isFocused ? '0 0 0 2px #e0f2fe' : 'none',
                      '&:hover': {
                        borderColor: state.isFocused ? '#0ea5e9' : '#94a3b8',
                      },
                    }),
                  }}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Tên tỉnh/thành được dùng tự động cho thông tin điểm đến.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Mô tả chi tiết
                </label>
                <textarea
                  name="description"
                  placeholder="Nhập nội dung mô tả về điểm đến du lịch..."
                  value={formData.description}
                  onChange={onChange}
                  rows="5"
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Media, Settings & Publish Actions (col-span-4) */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* Card 3: Thumbnail Media */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
              Ảnh đại diện
            </h2>

            <div>
              <label
                htmlFor="destination-thumbnail-image"
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-sky-300 bg-sky-50/40 p-4 text-center transition hover:border-sky-500 hover:bg-sky-50"
              >
                <span className="text-xs font-bold text-sky-700">
                  {hasSelectedFile ? 'Đổi ảnh đại diện' : 'Chọn tệp ảnh'}
                </span>
                <span className="mt-1 text-[11px] text-slate-500">
                  JPG, PNG, WebP (Tối đa 5MB)
                </span>
                <span className="mt-2 max-w-full truncate text-[11px] font-medium text-slate-600">
                  {hasSelectedFile
                    ? selectedFile.name
                    : formData.thumbnail_url
                      ? 'Đã chọn ảnh từ trước'
                      : 'Chưa chọn tệp'}
                </span>
                <input
                  id="destination-thumbnail-image"
                  type="file"
                  name="thumbnail_image"
                  accept={DESTINATION_IMAGE_ACCEPT}
                  onChange={onChange}
                  className="sr-only"
                />
              </label>

              {previewUrl ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <img
                    src={previewUrl}
                    alt={formData.name || 'Ảnh xem trước'}
                    className="h-16 w-20 rounded-lg object-cover border border-slate-200"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700">Ảnh xem trước</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {hasSelectedFile ? 'Ảnh mới chưa lưu' : 'Ảnh hiện tại'}
                    </p>
                  </div>
                  {onRemoveThumbnail ? (
                    <button
                      type="button"
                      onClick={onRemoveThumbnail}
                      disabled={submitting}
                      className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Card 4: Settings & Publish Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-6">
            <div>
              <h2 className="mb-4 text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                Xuất bản &amp; Cấu hình
              </h2>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Trạng thái hiển thị
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={onChange}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="active">Hoạt động (Hiển thị)</option>
                  <option value="inactive">Tạm ẩn (Khóa)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-sky-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Đang xử lý...' : submitLabel}
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

export default DestinationForm
