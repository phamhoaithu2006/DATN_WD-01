import { useEffect, useState } from 'react'
import adminGuideActivityApi from '../../../services/adminGuideActivityApi'

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function AdminGuideActivityPanel({ onClose }) {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    adminGuideActivityApi.list({ search, per_page: 50 })
      .then((response) => {
        if (active) setItems(response?.data?.data || [])
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Không tải được lịch sử thao tác.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [search])

  return (
    <section className="admin-guide-leave-panel" aria-label="Lịch sử thao tác HDV">
      <div className="admin-guide-leave-head">
        <div>
          <span>LỊCH SỬ THAO TÁC</span>
          <h3>Hoạt động tài khoản hướng dẫn viên</h3>
          <p>Thông báo và sự kiện tour đã gửi đến tài khoản HDV.</p>
        </div>
        <button type="button" onClick={onClose}>Đóng</button>
      </div>

      <div className="admin-guide-leave-filter compact">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setLoading(true)
            setSearch(event.target.value)
          }}
          placeholder="Tìm theo HDV, email hoặc nội dung..."
        />
      </div>

      <div className="admin-guide-leave-section active-tab-panel">
        {error ? <div className="admin-guide-leave-alert error">{error}</div> : null}
        {loading ? <div className="admin-guide-leave-empty">Đang tải lịch sử thao tác...</div> : null}
        {!loading && !error && items.length === 0 ? (
          <div className="admin-guide-leave-empty">Chưa có hoạt động nào của HDV.</div>
        ) : null}
        {!loading && !error && items.length > 0 ? (
          <div className="admin-guide-activity-list">
            {items.map((item) => (
              <article className="admin-guide-activity-item" key={item.id}>
                <div>
                  <strong>{item.guide_name || 'Hướng dẫn viên'}</strong>
                  <span>{item.guide_code || item.guide_email || '—'}</span>
                </div>
                <div className="admin-guide-activity-content">
                  <strong>{item.title || 'Hoạt động hệ thống'}</strong>
                  <p>{item.message || 'Không có mô tả chi tiết.'}</p>
                  <time>{formatDateTime(item.created_at)}</time>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default AdminGuideActivityPanel
