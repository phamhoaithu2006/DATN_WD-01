import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import {
  changeUserRole,
  createUser,
  getRoles,
  getUserDetail,
  getUserStats,
  getUsers,
  lockUser,
  unlockUser,
} from '../../services/adminUserService'
import '../../styles/user-management.css'

const roleLabels = {
  admin: 'Admin',
  customer: 'Khách Hàng',
  'support staff': 'NV Hỗ Trợ',
  'tour guide': 'Hướng Dẫn Viên',
}

const roleIcons = {
  admin: '🛡️',
  customer: '👥',
  'support staff': '🎧',
  'tour guide': '🧭',
}

const statusLabels = {
  active: 'Hoạt Động',
  locked: 'Bị Khóa',
  inactive: 'Không Hoạt Động',
}

const defaultForm = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  role_id: '',
  status: 'active',
}

function getRoleLabel(role) {
  return role?.description || roleLabels[role?.name] || role?.name || 'Chưa phân quyền'
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'ND'
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('vi-VN') : '---'
}

function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleId, setRoleId] = useState('')
  const [status, setStatus] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const queryParams = useMemo(
    () => ({
      search: search || undefined,
      role_id: roleId || undefined,
      status: status || undefined,
    }),
    [search, roleId, status],
  )

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [userList, roleList, statList] = await Promise.all([
        getUsers(queryParams),
        getRoles(),
        getUserStats(),
      ])

      setUsers(userList)
      setRoles(roleList)
      setStats(statList)
      setForm((current) => ({
        ...current,
        role_id: current.role_id || roleList[0]?.id || '',
      }))
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải dữ liệu người dùng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [queryParams])

  function openCreateForm() {
    setError('')
    setForm({
      ...defaultForm,
      role_id: roles[0]?.id || '',
    })
    setShowCreateForm(true)
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleView(userId) {
    setError('')

    try {
      const detail = await getUserDetail(userId)
      setSelectedUser(detail)
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể xem chi tiết người dùng.')
    }
  }

  async function handleToggleStatus(user) {
    setError('')

    try {
      if (user.status === 'locked') {
        await unlockUser(user.id)
      } else {
        await lockUser(user.id)
      }

      await loadData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể cập nhật trạng thái người dùng.')
    }
  }

  async function handleRoleChange(userId, nextRoleId) {
    setError('')

    try {
      await changeUserRole(userId, nextRoleId)
      await loadData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể phân quyền người dùng.')
    }
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await createUser(form)

      setForm({
        ...defaultForm,
        role_id: roles[0]?.id || '',
      })

      setShowCreateForm(false)
      await loadData()
    } catch (err) {
      const validationErrors = err?.response?.data?.errors
      const firstMessage = validationErrors ? Object.values(validationErrors).flat()[0] : null

      setError(firstMessage || err?.response?.data?.message || 'Không thể thêm người dùng mới.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <section className="user-page">
        <div className="user-header">
          <div>
            <span className="user-eyebrow">VivuGo Admin</span>
            <h1>Quản Lý Người Dùng</h1>
            <p>Quản lý tài khoản, trạng thái hoạt động và phân quyền người dùng trong hệ thống.</p>
          </div>

          <button className="user-add-button" type="button" onClick={openCreateForm}>
            <span>＋</span>
            Thêm Người Dùng
          </button>
        </div>

        {error && (
          <div className="user-alert">
            {error}
          </div>
        )}

        <div className="user-stat-grid">
          <article className="user-stat-card user-stat-card-total">
            <span className="user-stat-icon role-all">✨</span>
            <div>
              <strong>{users.length}</strong>
              <p>Người dùng đang hiển thị</p>
            </div>
          </article>

          {stats.map((item) => (
            <article className="user-stat-card" key={item.id}>
              <span className={`user-stat-icon role-${item.name?.replaceAll(' ', '-')}`}>
                {roleIcons[item.name] || '👤'}
              </span>
              <div>
                <strong>{item.total}</strong>
                <p>{roleLabels[item.name] || item.description || item.name}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="user-toolbar">
          <label className="user-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, số điện thoại..."
            />
          </label>

          <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Tất cả vai trò</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt Động</option>
            <option value="locked">Bị Khóa</option>
            <option value="inactive">Không Hoạt Động</option>
          </select>
        </div>

        <div className="user-table-card">
          <table className="user-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Liên hệ</th>
                <th>Ngày đăng ký</th>
                <th>Vai trò</th>
                <th>Booking</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="user-empty">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="user-empty">
                    Không có người dùng phù hợp
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-profile-cell">
                        <span className="user-avatar">
                          {getInitials(user.full_name || user.name)}
                        </span>
                        <div>
                          <strong>{user.full_name || user.name}</strong>
                          <small>ID: U{String(user.id).padStart(3, '0')}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="user-contact-cell">
                        <span>{user.email}</span>
                        <small>{user.phone || 'Chưa cập nhật SĐT'}</small>
                      </div>
                    </td>

                    <td>{formatDate(user.created_at)}</td>

                    <td>
                      <span className="user-role-badge">
                        {getRoleLabel(user.role)}
                      </span>
                    </td>

                    <td>
                      <b className="booking-count">
                        {user.bookings_count || 0}
                      </b>
                    </td>

                    <td>
                      <span className={`status-badge ${user.status || 'active'}`}>
                        {statusLabels[user.status] || 'Hoạt Động'}
                      </span>
                    </td>

                    <td>{formatDate(user.updated_at)}</td>

                    <td>
                      <div className="user-actions">
                        <button
                          type="button"
                          title="Xem chi tiết"
                          onClick={() => handleView(user.id)}
                        >
                          👁
                        </button>

                        <button
                          type="button"
                          title={user.status === 'locked' ? 'Mở khóa' : 'Khóa'}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === 'locked' ? '🔓' : '🔒'}
                        </button>

                        <select
                          title="Phân quyền"
                          value={user.role_id || ''}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {getRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser && (
        <div className="user-modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="user-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setSelectedUser(null)}>
              ×
            </button>

            <div className="modal-user-head">
              <span className="user-avatar modal-avatar">
                {getInitials(selectedUser.full_name || selectedUser.name)}
              </span>
              <div>
                <h2>Chi tiết người dùng</h2>
                <p>{selectedUser.email}</p>
              </div>
            </div>

            <div className="modal-info-grid">
              <p>
                <b>Họ tên:</b>
                <span>{selectedUser.full_name || selectedUser.name}</span>
              </p>
              <p>
                <b>Email:</b>
                <span>{selectedUser.email}</span>
              </p>
              <p>
                <b>Số điện thoại:</b>
                <span>{selectedUser.phone || '---'}</span>
              </p>
              <p>
                <b>Vai trò:</b>
                <span>{getRoleLabel(selectedUser.role)}</span>
              </p>
              <p>
                <b>Trạng thái:</b>
                <span>{statusLabels[selectedUser.status] || 'Hoạt Động'}</span>
              </p>
              <p>
                <b>Số booking:</b>
                <span>{selectedUser.bookings_count || 0}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="user-modal-backdrop" onClick={() => setShowCreateForm(false)}>
          <form
            className="user-modal create-user-modal"
            onSubmit={handleCreateSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setShowCreateForm(false)}>
              ×
            </button>

            <div className="create-form-header">
              <span className="create-form-icon">👤</span>
              <div>
                <h2>Thêm người dùng mới</h2>
                <p>Nhập thông tin tài khoản và phân quyền người dùng.</p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                <span>Họ tên</span>
                <input
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={form.full_name}
                  onChange={(e) => updateForm('full_name', e.target.value)}
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  required
                  type="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                />
              </label>

              <label>
                <span>Số điện thoại</span>
                <input
                  placeholder="0901234567"
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                />
              </label>

              <label>
                <span>Mật khẩu</span>
                <input
                  required
                  type="password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={form.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                />
              </label>

              <label>
                <span>Vai trò</span>
                <select value={form.role_id} onChange={(e) => updateForm('role_id', e.target.value)}>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {getRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Trạng thái</span>
                <select value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                  <option value="active">Hoạt Động</option>
                  <option value="locked">Bị Khóa</option>
                  <option value="inactive">Không Hoạt Động</option>
                </select>
              </label>
            </div>

            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowCreateForm(false)}
              >
                Hủy
              </button>

              <button className="user-submit-button" type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu người dùng'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  )
}

export default UserManagementPage