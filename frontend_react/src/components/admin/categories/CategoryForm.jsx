function CategoryForm({
  formData,
  errors = {},
  submitting,
  submitLabel,
  onChange,
  onRemoveThumbnail,
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

        <div className="md:col-span-2 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
          <div>
            <label
              htmlFor="category-thumbnail-image"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Ảnh đại diện loại tour
            </label>

            <input
              id="category-thumbnail-image"
              type="file"
              name="thumbnail_image"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={onChange}
              aria-invalid={hasError('thumbnail_image')}
              className={fieldClass(
                'thumbnail_image',
                'block w-full rounded-xl border px-4 py-3 text-sm font-medium text-slate-700 outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:font-semibold file:text-sky-700 focus:ring-2',
              )}
            />

            <p className="mt-1.5 text-xs text-slate-500">
              JPG, PNG hoặc WEBP, dung lượng tối đa 5 MB.
            </p>

            {formData.thumbnail_image instanceof File ? (
              <p className="mt-2 text-xs font-semibold text-sky-700">
                Đã chọn: {formData.thumbnail_image.name}
              </p>
            ) : null}

            {renderError('thumbnail_image')}
          </div>

          <div>
            <label
              htmlFor="category-thumbnail-alt-text"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Mô tả ảnh
            </label>

            <input
              id="category-thumbnail-alt-text"
              type="text"
              name="thumbnail_alt_text"
              maxLength={255}
              placeholder="Ví dụ: Bãi biển trong tour biển đảo"
              value={formData.thumbnail_alt_text || ''}
              onChange={onChange}
              aria-invalid={hasError('thumbnail_alt_text')}
              className={fieldClass(
                'thumbnail_alt_text',
                'h-12 w-full rounded-xl border px-4 text-sm font-medium text-slate-900 outline-none transition focus:ring-2',
              )}
            />

            {renderError('thumbnail_alt_text')}
          </div>
        </div>

        {formData.thumbnail_url && !formData.remove_thumbnail ? (
          <div className="md:col-span-2 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <img
              src={formData.thumbnail_url}
              alt={formData.thumbnail_alt_text || formData.name || 'Ảnh loại tour'}
              className="h-20 w-28 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700">Ảnh hiện tại</p>
              <p className="mt-1 truncate text-xs text-slate-500">
                Chọn ảnh mới để thay ảnh hiện tại.
              </p>
            </div>
            {onRemoveThumbnail ? (
              <button
                type="button"
                onClick={onRemoveThumbnail}
                disabled={submitting}
                className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Xóa ảnh
              </button>
            ) : null}
          </div>
        ) : null}

        {formData.remove_thumbnail ? (
          <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Ảnh hiện tại sẽ được xóa khi bạn lưu thay đổi.
          </div>
        ) : null}
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
