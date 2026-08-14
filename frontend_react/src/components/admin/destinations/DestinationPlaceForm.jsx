import { TOUR_ACTIVITY_OPTIONS } from '../../../constants/tourActivityTypes'

function FieldError({ errors, name }) {
  const message = errors?.[name]?.[0]

  return message
    ? <small className="mt-1.5 block font-semibold text-rose-600">{message}</small>
    : null
}

function DestinationPlaceForm({
  form,
  provinces,
  districts = [],
  errors,
  saving,
  onChange,
  onActivityTypesChange,
  onSubmit,
  onCancel,
  submitLabel,
}) {
  const inputClass = 'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
  const activityTypes = Array.isArray(form.activity_types) ? form.activity_types : []

  return (
    <form onSubmit={onSubmit} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white px-7 py-5">
        <h2 className="text-lg font-extrabold text-slate-950">Thông tin địa điểm trong tỉnh</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chọn tỉnh đã đồng bộ, nhập địa điểm và gán các loại hoạt động để dùng nhanh trong lịch trình.
        </p>
      </div>

      <div className="grid gap-6 p-7 lg:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Tỉnh / Thành phố <span className="text-rose-500">*</span>
          </span>
          <select name="province_id" value={form.province_id} onChange={onChange} className={inputClass}>
            <option value="">Chọn tỉnh/thành đã đồng bộ</option>
            {(provinces || []).map((province) => (
              <option key={province.id} value={province.id}>
                {province.name} ({province.places_count ?? 0} địa điểm)
              </option>
            ))}
          </select>
          <FieldError errors={errors} name="province_id" />
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold text-slate-700">Quận / huyện</span>
          <select name="district_id" value={form.district_id} onChange={onChange} disabled={!form.province_id || form.districtsLoading} className={inputClass}>
            <option value="">
              {!form.province_id
                ? 'Chọn tỉnh/thành trước'
                : form.districtsLoading
                  ? 'Đang tải quận/huyện...'
                  : 'Chọn quận/huyện (không bắt buộc)'}
            </option>
            {(districts || []).map((district) => (
              <option key={district.id} value={district.id}>{district.name}</option>
            ))}
          </select>
          <FieldError errors={errors} name="district_id" />
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Tên địa điểm <span className="text-rose-500">*</span>
          </span>
          <input autoFocus name="name" value={form.name} onChange={onChange} maxLength={180} placeholder="Ví dụ: Nhà hàng Madame Lân" className={inputClass} />
          <FieldError errors={errors} name="name" />
        </label>

        <label>
          <span className="mb-2 block text-sm font-bold text-slate-700">Địa chỉ cụ thể</span>
          <input name="address" value={form.address} onChange={onChange} maxLength={500} placeholder="Ví dụ: 04 Bạch Đằng, Hải Châu" className={inputClass} />
          <FieldError errors={errors} name="address" />
        </label>

        <div className="lg:col-span-2">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            Loại hoạt động <span className="text-rose-500">*</span>
          </span>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOUR_ACTIVITY_OPTIONS.map((option) => {
              const checked = activityTypes.includes(option.value)

              return (
                <label
                  key={option.value}
                  className={checked
                    ? 'flex cursor-pointer items-center gap-3 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 transition'
                    : 'flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200'}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onActivityTypesChange?.(
                      checked
                        ? activityTypes.filter((type) => type !== option.value)
                        : [...activityTypes, option.value],
                    )}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  {option.label}
                </label>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Có thể chọn nhiều loại; ví dụ một sân bay vừa là điểm xuất phát vừa là điểm trở về.
          </p>
          <FieldError errors={errors} name="activity_types" />
        </div>

        <label className="lg:col-span-2">
          <span className="mb-2 block text-sm font-bold text-slate-700">URL ảnh đại diện</span>
          <input name="thumbnail_url" type="url" value={form.thumbnail_url} onChange={onChange} maxLength={500} placeholder="https://example.com/hinh-anh.jpg" className={inputClass} />
          <FieldError errors={errors} name="thumbnail_url" />
        </label>

        <label className="lg:col-span-2">
          <span className="mb-2 block text-sm font-bold text-slate-700">Mô tả</span>
          <textarea name="description" value={form.description} onChange={onChange} rows={6} className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
          <FieldError errors={errors} name="description" />
        </label>

        <label className="lg:col-span-2">
          <span className="mb-2 block text-sm font-bold text-slate-700">Trạng thái</span>
          <select name="status" value={form.status} onChange={onChange} className={inputClass}>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ẩn</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-7 py-5 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={saving} className="h-11 rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700">Hủy</button>
        <button type="submit" disabled={saving} className="h-11 rounded-xl bg-sky-600 px-7 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">{saving ? 'Đang lưu...' : submitLabel}</button>
      </div>
    </form>
  )
}

export default DestinationPlaceForm
