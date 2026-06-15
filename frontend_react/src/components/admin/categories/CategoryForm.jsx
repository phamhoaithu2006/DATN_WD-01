function CategoryForm({
  formData,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="grid gap-6 p-8 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Tên loại tour <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            placeholder="Ví dụ: Tour biển đảo"
            value={formData.name}
            onChange={onChange}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Trạng thái
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={onChange}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm ẩn</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Mô tả
          </label>
          <textarea
            name="description"
            placeholder="Nhập mô tả ngắn gọn về loại tour"
            value={formData.description}
            onChange={onChange}
            rows="6"
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-8 py-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Hủy
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-sky-600 px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Đang lưu...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default CategoryForm