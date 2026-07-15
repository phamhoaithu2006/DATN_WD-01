import { formatDateTimeDdMmYyyy } from '../../../utils/dateFormat'

function formatDateTime(value) {
  return formatDateTimeDdMmYyyy(value, '?')
}

function StatusBadge({ active }) {
  return (
    <span className={`service-category-status ${active ? 'active' : 'inactive'}`}>
      {active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
    </span>
  )
}

function ServiceCategoryDetailModal({ category, loading, onClose }) {
  return (
    <div
      className="service-category-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="service-category-modal service-category-detail-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="service-category-modal-header">
          <div>
            <p>Chi tiết loại dịch vụ</p>
            <h2>{category?.name || 'Đang tải...'}</h2>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="service-category-empty-state compact">
            Đang tải dữ liệu chi tiết...
          </div>
        ) : (
          <>
            <dl className="service-category-detail-grid">
              <div>
                <dt>Tên loại dịch vụ</dt>
                <dd>{category?.name || '—'}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <StatusBadge active={category?.status} />
                </dd>
              </div>
              <div>
                <dt>Ngày tạo</dt>
                <dd>{formatDateTime(category?.created_at)}</dd>
              </div>
              <div>
                <dt>Ngày cập nhật</dt>
                <dd>{formatDateTime(category?.updated_at)}</dd>
              </div>
            </dl>

            <div className="service-category-detail-section">
              <h3>Mô tả</h3>
              <p>{category?.description || 'Chưa có mô tả.'}</p>
            </div>

            <div className="service-category-modal-actions">
              <button className="primary" type="button" onClick={onClose}>
                Đóng
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default ServiceCategoryDetailModal
