const STATUS_OPTIONS = [
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

function ServiceCategoryForm({
  mode,
  values,
  errors,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  const title = mode === 'edit' ? 'Cập nhật loại dịch vụ' : 'Thêm loại dịch vụ'

  return (
    <div
      className="service-category-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="service-category-modal service-category-form-modal"
        noValidate
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="service-category-modal-header">
          <div>
            <p>{title}</p>
            <h2>{mode === 'edit' ? values.name || 'Loại dịch vụ' : 'Loại dịch vụ mới'}</h2>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="service-category-form-grid">
          <label>
            Tên loại dịch vụ <span>*</span>
            <input
              autoFocus
              value={values.name}
              onChange={(event) => onChange('name', event.target.value)}
              placeholder="Ví dụ: Khách sạn"
            />
            {errors.name ? (
              <small className="service-category-field-error">{errors.name}</small>
            ) : null}
          </label>

          <label>
            Trạng thái <span>*</span>
            <select
              value={String(values.status)}
              onChange={(event) => onChange('status', event.target.value === 'true')}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.status ? (
              <small className="service-category-field-error">{errors.status}</small>
            ) : null}
          </label>

          <label className="service-category-form-wide">
            Mô tả
            <textarea
              rows="5"
              value={values.description}
              onChange={(event) => onChange('description', event.target.value)}
              placeholder="Nhập mô tả ngắn về nhóm dịch vụ"
            />
            {errors.description ? (
              <small className="service-category-field-error">{errors.description}</small>
            ) : null}
          </label>
        </div>

        <div className="service-category-modal-actions">
          <button type="button" disabled={saving} onClick={onClose}>
            Hủy
          </button>
          <button className="primary" type="submit" disabled={saving}>
            {saving ? 'Đang lưu...' : mode === 'edit' ? 'Lưu thay đổi' : 'Thêm loại dịch vụ'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ServiceCategoryForm
