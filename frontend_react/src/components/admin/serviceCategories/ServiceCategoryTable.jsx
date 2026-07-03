function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function ActionIcon({ type }) {
  if (type === 'detail') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    )
  }

  if (type === 'edit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L16.5 4a2.1 2.1 0 0 0-3 0L3 14.5V20Z" />
        <path d="M13.5 6.5 17.5 10.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  )
}

function StatusBadge({ active }) {
  return (
    <span className={`service-category-status ${active ? 'active' : 'inactive'}`}>
      {active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
    </span>
  )
}

function ServiceCategoryTable({
  items,
  loading,
  error,
  hasFilters,
  pagination,
  onRetry,
  onView,
  onEdit,
  onDelete,
  onPageChange,
  onPerPageChange,
}) {
  const startIndex = (pagination.currentPage - 1) * pagination.perPage

  return (
    <div className="service-category-table-wrap">
      <div className="service-category-table-scroll">
        <table className="service-category-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên loại dịch vụ</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="service-category-empty-row" colSpan="5">
                  <div className="service-category-loading">
                    <span />
                    <p>Đang tải danh sách loại dịch vụ...</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="service-category-empty-row" colSpan="5">
                  <div className="service-category-empty-state">
                    <strong>Không tải được dữ liệu</strong>
                    <span>{error}</span>
                    <button type="button" onClick={onRetry}>
                      Thử lại
                    </button>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="service-category-empty-row" colSpan="5">
                  <div className="service-category-empty-state">
                    <strong>
                      {hasFilters
                        ? 'Không tìm thấy loại dịch vụ phù hợp'
                        : 'Chưa có loại dịch vụ nào'}
                    </strong>
                    <span>
                      {hasFilters
                        ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái.'
                        : 'Danh sách sẽ hiển thị tại đây sau khi có dữ liệu.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id}>
                  <td>{startIndex + index + 1}</td>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    <p className="service-category-description">
                      {item.description || '—'}
                    </p>
                  </td>
                  <td>
                    <StatusBadge active={item.status} />
                  </td>
                  <td>
                    <div className="service-category-actions">
                      <button
                        type="button"
                        title="Xem chi tiết"
                        aria-label={`Xem chi tiết ${item.name}`}
                        onClick={() => onView(item)}
                      >
                        <ActionIcon type="detail" />
                      </button>
                      <button
                        type="button"
                        title="Chỉnh sửa"
                        aria-label={`Chỉnh sửa ${item.name}`}
                        onClick={() => onEdit(item)}
                      >
                        <ActionIcon type="edit" />
                      </button>
                      <button
                        className="danger"
                        type="button"
                        title="Xóa mềm"
                        aria-label={`Xóa mềm ${item.name}`}
                        onClick={() => onDelete(item)}
                      >
                        <ActionIcon type="delete" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="service-category-pagination">
        <div className="service-category-pagination-summary">
          <span>
            Trang {pagination.currentPage} / {pagination.lastPage}
          </span>
        </div>

        <div className="service-category-page-buttons">
          <button
            type="button"
            disabled={pagination.currentPage <= 1 || loading}
            onClick={() => onPageChange(pagination.currentPage - 1)}
            aria-label="Trang trước"
          >
            ←
          </button>
          <button
            type="button"
            disabled={pagination.currentPage >= pagination.lastPage || loading}
            onClick={() => onPageChange(pagination.currentPage + 1)}
            aria-label="Trang sau"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}

export default ServiceCategoryTable

