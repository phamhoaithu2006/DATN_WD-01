function CategoryForm({
  formData,
  errors = {},
  submitting,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}) {
  const hasError = (field) => Boolean(errors[field])

  const fieldClass = (field, baseClass) =>
    `${baseClass} ${
      hasError(field)
        ? 'border-rose-500 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-100'
        : 'border-slate-300 bg-white focus:border-sky-500 focus:ring-sky-100'
    }`

  const renderError = (field) =>
    hasError(field) ? (
      <p className="mt-1.5 text-xs font-semibold text-rose-600">
        {errors[field]}
      </p>
    ) : null

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="grid gap-6 p-8 md:grid-cols-2">
        <div>
          <label
            htmlFor="category-name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Tên loại tour <span className="text-rose-500">*</span>
          </label>

          <input
            id="category-name"
            type="text"
            name="name"
            maxLength={100}
            placeholder="Ví dụ: Tour biển đảo"
            value={formData.name}
            onChange={onChange}
            aria-invalid={hasError('name')}
            aria-describedby={hasError('name') ? 'category-name-error' : undefined}
            className={fieldClass(
              'name',
              'h-12 w-full rounded-xl border px-4 text-sm font-semibold text-slate-900 outline-none transition focus:ring-2',
            )}
          />

          {hasError('name') ? (
            <p
              id="category-name-error"
              className="mt-1.5 text-xs font-semibold text-rose-600"
            >
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="category-status"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Trạng thái <span className="text-rose-500">*</span>
          </label>

          <select
            id="category-status"
            name="status"
            value={formData.status}
            onChange={onChange}
            aria-invalid={hasError('status')}
            className={fieldClass(
              'status',
              'h-12 w-full rounded-xl border px-4 text-sm font-semibold text-slate-900 outline-none transition focus:ring-2',
            )}
          >
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm ẩn</option>
          </select>

          {renderError('status')}
        </div>

        <div className="md:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="category-description"
              className="block text-sm font-semibold text-slate-700"
            >
              Mô tả
            </label>

            <span
              className={`text-xs font-semibold ${
                String(formData.description || '').length > 500
                  ? 'text-rose-600'
                  : 'text-slate-400'
              }`}
            >
              {String(formData.description || '').length}/500
            </span>
          </div>

          <textarea
            id="category-description"
            name="description"
            maxLength={500}
            placeholder="Nhập mô tả ngắn gọn về loại tour"
            value={formData.description}
            onChange={onChange}
            rows={6}
            aria-invalid={hasError('description')}
            className={fieldClass(
              'description',
              'w-full resize-y rounded-xl border px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:ring-2',
            )}
          />

          {renderError('description')}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-8 py-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Hủy
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-sky-600 px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Đang lưu...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  )
}

export default CategoryForm