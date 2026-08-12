function FieldError({ errors, name }) {
  const message = errors?.[name]?.[0]
  return message ? <small className="mt-1.5 block font-semibold text-rose-600">{message}</small> : null
}

function DestinationPlaceForm({ form, destinations, districtGroups = [], districtsLoading = false, errors, saving, onChange, onSubmit, onCancel, submitLabel }) {
  const inputClass = 'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
  const changeField = (name, value) => onChange({ target: { name, value } })
  const destinationLabel = (item) => {
    const linkedNames = item.provinces?.map((province) => province.name).filter(Boolean) || []
    const provinceNames = [...new Set(linkedNames.length ? linkedNames : [item.province_city].filter(Boolean))]
    const differentNames = provinceNames.filter(
      (provinceName) => item.name.trim().localeCompare(provinceName.trim(), 'vi', { sensitivity: 'base' }) !== 0,
    )

    return differentNames.length ? `${item.name} — ${differentNames.join(', ')}` : item.name
  }

  return <form onSubmit={onSubmit} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white px-7 py-5">
      <h2 className="text-lg font-extrabold text-slate-950">Thông tin điểm đến chi tiết</h2>
      <p className="mt-1 text-sm text-slate-500">Tên địa điểm được nhập tự do; quận/huyện được lấy từ dữ liệu hành chính của các tỉnh thuộc điểm đến.</p>
    </div>
    <div className="grid gap-6 p-7 lg:grid-cols-2">
      <label><span className="mb-2 block text-sm font-bold text-slate-700">Điểm đến chính <span className="text-rose-500">*</span></span>
        <select name="destination_id" value={form.destination_id} onChange={(event) => { onChange(event); changeField('district_id', '') }} className={inputClass}>
          <option value="">Chọn điểm đến chính</option>
          {destinations.map((item) => <option key={item.id} value={item.id}>{destinationLabel(item)}</option>)}
        </select><FieldError errors={errors} name="destination_id" />
      </label>
      <label><span className="mb-2 block text-sm font-bold text-slate-700">Quận / huyện</span>
        <select name="district_id" value={form.district_id} onChange={onChange} disabled={!form.destination_id || districtsLoading} className={inputClass}>
          <option value="">{districtsLoading ? 'Đang tải quận / huyện...' : form.destination_id ? 'Chọn quận / huyện' : 'Chọn điểm đến chính trước'}</option>
          {districtGroups.map((province) => <optgroup key={province.id} label={`Tỉnh/Thành: ${province.name}`}>{(province.districts || []).map((district) => <option key={district.id} value={district.id}>{district.name} — {province.name}</option>)}</optgroup>)}
        </select>
        {!districtsLoading && form.destination_id && districtGroups.length === 0 ? <small className="mt-1.5 block text-slate-500">Điểm đến này chưa được gán tỉnh/thành.</small> : null}
        <FieldError errors={errors} name="district_id" />
      </label>
      <label><span className="mb-2 block text-sm font-bold text-slate-700">Tên địa điểm <span className="text-rose-500">*</span></span><input autoFocus name="name" value={form.name} onChange={onChange} maxLength={180} placeholder="Ví dụ: Phố cổ Hội An" className={inputClass} /><FieldError errors={errors} name="name" /></label>
      <label><span className="mb-2 block text-sm font-bold text-slate-700">Địa chỉ cụ thể</span><input name="address" value={form.address} onChange={onChange} maxLength={500} placeholder="Ví dụ: Minh An, Hội An" className={inputClass} /><FieldError errors={errors} name="address" /></label>
      <label className="lg:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">URL ảnh đại diện</span><input name="thumbnail_url" type="url" value={form.thumbnail_url} onChange={onChange} maxLength={500} placeholder="https://example.com/hinh-anh.jpg" className={inputClass} /><FieldError errors={errors} name="thumbnail_url" /></label>
      <label className="lg:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">Mô tả</span><textarea name="description" value={form.description} onChange={onChange} rows={7} className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /><FieldError errors={errors} name="description" /></label>
      <label className="lg:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-700">Trạng thái</span><select name="status" value={form.status} onChange={onChange} className={inputClass}><option value="active">Đang hoạt động</option><option value="inactive">Tạm ẩn</option></select></label>
    </div>
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-7 py-5 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} disabled={saving} className="h-11 rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700">Hủy</button><button type="submit" disabled={saving} className="h-11 rounded-xl bg-sky-600 px-7 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">{saving ? 'Đang lưu...' : submitLabel}</button></div>
  </form>
}

export default DestinationPlaceForm
