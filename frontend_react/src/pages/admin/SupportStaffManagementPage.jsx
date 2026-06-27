import { useCallback, useEffect, useState } from 'react'

import {
  createSupportStaff,
  deleteSupportStaff,
  getSupportStaff,
  getSupportStaffStatistics,
  getSupportStaffs,
  updateSupportStaff,
} from '../../services/supportStaffApi'
import '../../styles/support-staff.css'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang làm việc' },
  { value: 'inactive', label: 'Tạm nghỉ' },
  { value: 'hidden', label: 'Đã ẩn' },
]

const EMPTY_FORM = {
  name: '',
  email: '',
  status: 'active',
  performance_rating: '',
}

function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'NV'
  )
}

function formatDateTime(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'long',
  }).format(new Date(value))
}

function formatRating(value) {
  const rating = Number(value ?? 0)
  return Number.isFinite(rating) ? rating.toFixed(2) : '0.00'
}

function formatRatingPercent(value) {
  const rating = Number(value ?? 0)

  if (!Number.isFinite(rating)) {
    return '0%'
  }

  return `${Math.round((rating / 5) * 100)}%`
}

function getServerMessage(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function getListData(payload) {
  const page = payload?.data?.data

  if (Array.isArray(page)) {
    return page
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload)) {
    return payload
  }

  return []
}

function getPaginationMeta(payload) {
  const page = payload?.data?.data

  if (!page || Array.isArray(page)) {
    return { currentPage: 1, lastPage: 1, total: 0, perPage: 10 }
  }

  return {
    currentPage: page.current_page || 1,
    lastPage: page.last_page || 1,
    total: page.total || 0,
    perPage: page.per_page || 10,
  }
}

function getStatisticsData(payload) {
  return payload?.data || {}
}

function getRoleLabel(role) {
  if (!role) return 'Chưa xác định'

  const normalized = String(role).replaceAll('-', '_')

  return (
    {
      technical: 'Kỹ thuật',
      customer_service: 'CSKH',
      billing: 'Thanh toán',
      qa: 'Kiểm thử',
      supervisor: 'Giám sát',
      lead: 'Trưởng nhóm',
    }[normalized] || role
  )
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status
}

function validateForm(form) {
  const errors = {}
  const rating = Number(form.performance_rating)

  if (!form.name.trim()) {
    errors.name = 'Vui lòng nhập họ tên.'
  } else if (form.name.trim().length > 255) {
    errors.name = 'Họ tên tối đa 255 ký tự.'
  }

  if (!form.email.trim()) {
    errors.email = 'Vui lòng nhập email.'
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  ) {
    errors.email = 'Email không hợp lệ.'
  }

  if (!STATUS_OPTIONS.some((item) => item.value === form.status)) {
    errors.status = 'Trạng thái không hợp lệ.'
  }

  if (
    form.performance_rating === '' ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5
  ) {
    errors.performance_rating = 'Hiệu suất phải từ 0 đến 5.'
  }

  return errors
}

function makeToast(type, text) {
  return { id: Date.now(), type, text }
}

function SupportStaffFormModal({
  form,
  errors,
  saving,
  onChange,
  onClose,
  onSubmit,
  editing,
}) {
  return (
    <div
      className="support-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="support-modal"
        noValidate
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="support-modal-heading">
          <div>
            <h2>{editing ? 'Cập nhật nhân viên hỗ trợ' : 'Thêm nhân viên hỗ trợ'}</h2>
            <p>Thông tin được lưu trực tiếp.</p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="support-form-grid">
          <label>
            Họ và tên
            <input
              value={form.name}
              onChange={onChange('name')}
            />
            {errors.name ? <span className="support-field-error">{errors.name}</span> : null}
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={onChange('email')}
            />
            {errors.email ? <span className="support-field-error">{errors.email}</span> : null}
          </label>

          <label>
            Trạng thái
            <select value={form.status} onChange={onChange('status')}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            {errors.status ? <span className="support-field-error">{errors.status}</span> : null}
          </label>

          <label className="support-form-wide">
            Hiệu suất
            <input
              min="0"
              max="5"
              step="0.01"
              type="number"
              value={form.performance_rating}
              onChange={onChange('performance_rating')}
            />
            {errors.performance_rating ? (
              <span className="support-field-error">{errors.performance_rating}</span>
            ) : null}
          </label>
        </div>

        <div className="support-modal-actions">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary" disabled={saving} type="submit">
            {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm nhân viên'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SupportStaffDetailModal({ staff, loading, onClose }) {
  return (
    <div
      className="support-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="support-modal support-detail-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="support-modal-heading">
          <div>
            <h2>Chi tiết nhân viên hỗ trợ</h2>
            <p>{staff ? `Mã hiển thị: NV${String(staff.id).padStart(3, '0')}` : 'Đang tải...'}</p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="support-empty-state">Đang tải dữ liệu chi tiết...</div>
        ) : (
          <>
            <div className="support-detail-profile">
              <span>{initials(staff?.name)}</span>
              <div>
                <h3>{staff?.name || '—'}</h3>
                <em className={`support-status ${staff?.status || 'inactive'}`}>
                  {getStatusLabel(staff?.status)}
                </em>
              </div>
            </div>

            <dl className="support-detail-grid">
              <div>
                <dt>Email</dt>
                <dd>{staff?.email || '—'}</dd>
              </div>
              <div>
                <dt>Hiệu suất</dt>
                <dd>{formatRating(staff?.performance_rating)} / 5</dd>
              </div>
              <div>
                <dt>Ngày tạo</dt>
                <dd>{formatDateTime(staff?.created_at)}</dd>
              </div>
              <div>
                <dt>Cập nhật gần nhất</dt>
                <dd>{formatDateTime(staff?.updated_at)}</dd>
              </div>
              <div>
                <dt>Ẩn từ</dt>
                <dd>{formatDateTime(staff?.hidden_at)}</dd>
              </div>
            </dl>

            <div className="support-modal-actions">
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

function SupportStaffManagementPage() {
  const [staffList, setStaffList] = useState([])
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    hidden: 0,
    average_rating: 0,
    role_options: [],
    top_staff: [],
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [detailStaff, setDetailStaff] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})

  const topStaff = statistics.top_staff || []

  function openToast(type, text) {
    setNotice(makeToast(type, text))
  }

  function closeToast() {
    setNotice(null)
  }

  function resetForm(nextEditing = null) {
    if (nextEditing) {
      setForm({
        name: nextEditing.name || '',
        email: nextEditing.email || '',
        status: nextEditing.status || 'active',
        performance_rating: formatRating(nextEditing.performance_rating),
      })
      setEditingStaff(nextEditing)
    } else {
      setForm(EMPTY_FORM)
      setEditingStaff(null)
    }

    setFormErrors({})
    setFormVisible(true)
  }

  function openCreateForm() {
    resetForm(null)
  }

  function openEditForm(staff) {
    resetForm(staff)
  }

  function closeForm() {
    setFormVisible(false)
    setEditingStaff(null)
    setFormErrors({})
  }

  function changeField(field) {
    return (event) => {
      const value = event.target.value

      setForm((current) => ({
        ...current,
        [field]: value,
      }))

      setFormErrors((current) => ({
        ...current,
        [field]: '',
      }))
    }
  }

  const loadStatistics = useCallback(async () => {
    try {
      const response = await getSupportStaffStatistics()
      setStatistics(getStatisticsData(response))
    } catch (error) {
      openToast('error', getServerMessage(error, 'Không tải được thống kê nhân viên hỗ trợ.'))
    }
  }, [])

  const loadList = useCallback(
    async (pageNumber = page) => {
      setLoading(true)

      try {
        const response = await getSupportStaffs({
          page: pageNumber,
          per_page: 10,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        })

        setStaffList(getListData(response))
        setPagination(getPaginationMeta(response))
      } catch (error) {
        openToast('error', getServerMessage(error, 'Không tải được danh sách nhân viên hỗ trợ.'))
      } finally {
        setLoading(false)
      }
    },
    [page, search, statusFilter],
  )

  const refreshAll = useCallback(async (pageNumber = page) => {
    await Promise.all([loadStatistics(), loadList(pageNumber)])
  }, [loadList, loadStatistics, page])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStatistics()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadStatistics])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadList(page)
    }, 280)

    return () => window.clearTimeout(timer)
  }, [loadList, page])

  useEffect(() => {
    if (!notice) return undefined

    const timer = window.setTimeout(() => {
      closeToast()
    }, 3500)

    return () => window.clearTimeout(timer)
  }, [notice])

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateForm(form)

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: 'customer_service',
        status: form.status,
        performance_rating: Number(form.performance_rating),
      }

      const response = editingStaff
        ? await updateSupportStaff(editingStaff.id, payload)
        : await createSupportStaff(payload)

      openToast('success', response.message || (editingStaff ? 'Đã cập nhật nhân viên.' : 'Đã thêm nhân viên.'))
      closeForm()
      await refreshAll(page)
    } catch (error) {
      const serverErrors = error.response?.data?.errors

      if (serverErrors) {
        setFormErrors(
          Object.entries(serverErrors).reduce((accumulator, [field, messages]) => {
            accumulator[field] = Array.isArray(messages) ? messages[0] : String(messages)
            return accumulator
          }, {}),
        )
      } else {
        openToast('error', getServerMessage(error, 'Không lưu được thông tin nhân viên hỗ trợ.'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(staff) {
    setDetailStaff(staff)
    setDetailLoading(true)

    try {
      const response = await getSupportStaff(staff.id)
      setDetailStaff(response?.data?.data || response?.data || staff)
    } catch (error) {
      openToast('error', getServerMessage(error, 'Không tải được chi tiết nhân viên.'))
    } finally {
      setDetailLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    setDeleting(true)

    try {
      const response = await deleteSupportStaff(deleteTarget.id)
      openToast('success', response.message || 'Đã xóa nhân viên hỗ trợ.')
      setDeleteTarget(null)
      await refreshAll(page)
    } catch (error) {
      openToast('error', getServerMessage(error, 'Không xóa được nhân viên hỗ trợ.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="support-page">
      <div className="support-heading">
        <div>
          <div className="support-breadcrumb">ViVuGo / Quản Lý Nhân Viên Hỗ Trợ</div>
          <h1>Quản Lý Nhân Viên Hỗ Trợ</h1>
          <p>Quản lý tài khoản hỗ trợ khách hàng, thao tác trực tiếp qua API thật.</p>
        </div>

        <button className="support-add-button" type="button" onClick={openCreateForm}>
          <span aria-hidden="true">+</span>
          Thêm nhân viên
        </button>
      </div>

      <div className="support-stat-grid">
        <article className="support-stat-card blue">
          <strong>{statistics.total || pagination.total || staffList.length}</strong>
          <span>Tổng nhân viên</span>
          <small>Toàn bộ tài khoản hỗ trợ</small>
        </article>
        <article className="support-stat-card green">
          <strong>{statistics.active || 0}</strong>
          <span>Đang hoạt động</span>
          <small>Sẵn sàng xử lý ticket</small>
        </article>
        <article className="support-stat-card amber">
          <strong>{formatRating(statistics.average_rating)}</strong>
          <span>Hiệu suất trung bình</span>
          <small>Thống kê từ API backend</small>
        </article>
        <article className="support-stat-card purple">
          <strong>{statistics.hidden || 0}</strong>
          <span>Đã ẩn</span>
          <small>Tài khoản tạm ngưng hiển thị</small>
        </article>
      </div>

      <div className="support-content-grid">
        <div className="support-main-panel">
          <div className="support-filter-bar">
            <label className="support-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Tìm theo tên, email..."
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="support-table-wrap">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Hiệu suất</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="support-empty-row" colSpan="7">
                      <div className="support-loading">
                        <span />
                        <p>Đang tải danh sách nhân viên hỗ trợ...</p>
                      </div>
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td className="support-empty-row" colSpan="7">
                      <div className="support-empty-state">
                        <strong>Không tìm thấy nhân viên phù hợp</strong>
                        <span>Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff, index) => (
                    <tr key={staff.id}>
                      <td>
                        <span
                          className={`support-avatar tone-${index % 5}`}
                          title={staff.name}
                        >
                          {initials(staff.name)}
                        </span>
                      </td>
                      <td>
                        <strong className="support-code">
                          NV{String(staff.id).padStart(3, '0')}
                        </strong>
                      </td>
                      <td>
                        <strong>{staff.name}</strong>
                        <small>{formatDate(staff.created_at)}</small>
                      </td>
                      <td>{staff.email}</td>
                      <td>
                        <div className="support-rating-cell">
                          <div className="support-rating-track">
                            <span
                              style={{ width: `${Math.max(0, Math.min(100, (Number(staff.performance_rating || 0) / 5) * 100))}%` }}
                            />
                          </div>
                          <strong>{formatRatingPercent(staff.performance_rating)}</strong>
                        </div>
                      </td>
                      <td>
                        <span className={`support-status ${staff.status}`}>
                          {getStatusLabel(staff.status)}
                        </span>
                      </td>
                      <td>
                        <div className="support-actions">
                          <button type="button" onClick={() => openDetail(staff)}>
                            Chi tiết
                          </button>
                          <button type="button" onClick={() => openEditForm(staff)}>
                            Sửa
                          </button>
                          <button
                            className="danger"
                            type="button"
                            onClick={() => setDeleteTarget(staff)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="support-pagination">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pagination.currentPage <= 1 || loading}
            >
              Trước
            </button>
            <span>
              Trang {pagination.currentPage} / {pagination.lastPage}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(pagination.lastPage, current + 1))
              }
              disabled={pagination.currentPage >= pagination.lastPage || loading}
            >
              Sau
            </button>
          </div>
        </div>

        <aside className="support-side-panel">
          <h2>Top hiệu suất</h2>
          <p>Nhân viên có điểm hiệu suất cao nhất theo dữ liệu backend.</p>

          {topStaff.length > 0 ? (
            <div className="support-top-list">
              {topStaff.map((staff, index) => (
                <article className="support-top-item" key={staff.id}>
                  <div className="support-top-rank">{index + 1}</div>
                  <div className="support-top-avatar">{initials(staff.name)}</div>
                  <div className="support-top-content">
                    <strong>{staff.name}</strong>
                    <div className="support-top-bar">
                      <span style={{ width: `${Math.max(0, Math.min(100, (Number(staff.performance_rating || 0) / 5) * 100))}%` }} />
                    </div>
                  </div>
                  <div className="support-top-rating">{formatRating(staff.performance_rating)}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="support-empty-state compact">
              <strong>Chưa có thống kê</strong>
              <span>Hệ thống sẽ hiển thị top nhân viên khi có dữ liệu.</span>
            </div>
          )}
        </aside>
      </div>

      {formVisible ? (
        <SupportStaffFormModal
          editing={editingStaff}
          errors={formErrors}
          form={form}
          onChange={changeField}
          onClose={closeForm}
          onSubmit={handleSubmit}
          saving={saving}
        />
      ) : null}

      {detailStaff ? (
        <SupportStaffDetailModal
          loading={detailLoading}
          onClose={() => setDetailStaff(null)}
          staff={detailStaff}
        />
      ) : null}

      {deleteTarget ? (
        <div
          className="support-modal-backdrop"
          role="presentation"
          onMouseDown={() => {
            if (!deleting) setDeleteTarget(null)
          }}
        >
          <div
            className="support-delete-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="support-delete-icon">!</div>
            <h3>Xóa nhân viên hỗ trợ?</h3>
            <p>
              Bạn có chắc muốn xóa{' '}
              <strong>{deleteTarget.name}</strong> khỏi hệ thống?
              Thao tác này sẽ dùng API xóa thật.
            </p>
            <div className="support-modal-actions">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </button>
              <button
                className="danger primary"
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className={`support-toast ${notice.type}`}>
          <div>
            <strong>{notice.type === 'success' ? 'Thành công' : 'Có lỗi xảy ra'}</strong>
            <p>{notice.text}</p>
          </div>
          <button type="button" onClick={closeToast}>
            ×
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default SupportStaffManagementPage
