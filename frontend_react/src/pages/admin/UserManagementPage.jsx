import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import {
  createUser,
  getUserCount,
  getUserDetail,
  getUsers,
  lockUser,
  unlockUser,
  updateUser,
} from '../../services/adminUserService'
import '../../styles/user-management.css'

const defaultForm = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  status: 'active',
}

const statusLabels = {
  active: 'Hoạt Động',
  inactive: 'Bị Khóa',
}

function getInitials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'ND'
  )
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString('vi-VN') : '---'
}

function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const [selectedUser, setSelectedUser] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const keyword = search.toLowerCase().trim()

      const matchSearch =
        !keyword ||
        user.full_name?.toLowerCase().includes(keyword) ||
        user.name?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.phone?.includes(keyword)

      const matchStatus = !status || user.status === status

      return matchSearch && matchStatus
    })
  }, [users, search, status])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [userList, count] = await Promise.all([
        getUsers(),
        getUserCount(),
      ])

      setUsers(userList)
      setTotalUsers(count)
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách người dùng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function openCreateForm() {
    setError('')
    setEditingUser(null)
    setForm(defaultForm)
    setShowForm(true)
  }

  function openEditForm(user) {
    setError('')
    setEditingUser(user)
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      status: user.status || 'active',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingUser(null)
    setForm(defaultForm)
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
      if (user.status === 'inactive') {
        await unlockUser(user.id)
      } else {
        await lockUser(user.id)
      }

      await loadData()
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể cập nhật trạng thái người dùng.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = { ...form }

      if (editingUser && !payload.password) {
        delete payload.password
      }

      if (editingUser) {
        await updateUser(editingUser.id, payload)
      } else {
        await createUser(payload)
      }

      closeForm()
      await loadData()
    } catch (err) {
      const validationErrors = err?.response?.data?.errors
      const firstMessage = validationErrors ? Object.values(validationErrors).flat()[0] : null

      setError(firstMessage || err?.response?.data?.message || 'Không thể lưu người dùng.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <section className="user-page">
        <div className="user-header">
          <div>
            <span className="user-eyebrow">VivuGo</span>
            <h1>Quản Lý Người Dùng</h1>
            <p>Quản lý tài khoản người dùng theo dữ liệu backend.</p>
          </div>

          <button className="user-add-button" type="button" onClick={openCreateForm}>
            <span>＋</span>
            Thêm Người Dùng
          </button>
        </div>

        {error && <div className="user-alert">{error}</div>}

        <div className="user-stat-grid">
          <article className="user-stat-card">
            <span className="user-stat-icon role-all">👥</span>
            <div>
              <strong>{totalUsers}</strong>
              <p>Tổng người dùng</p>
            </div>
          </article>

          <article className="user-stat-card">
            <span className="user-stat-icon role-customer">📋</span>
            <div>
              <strong>{filteredUsers.length}</strong>
              <p>Đang hiển thị</p>
            </div>
          </article>
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

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt Động</option>
            <option value="inactive">Bị Khóa</option>
          </select>
        </div>

        <div className="user-table-card">
          <table className="user-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Họ Tên</th>
                <th>Email</th>
                <th>Số Điện Thoại</th>
                <th>Ngày Đăng Ký</th>
                <th>Booking</th>
                <th>Trạng Thái</th>
                <th>Hành Động</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="user-empty">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="user-empty">
                    Không có người dùng phù hợp
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="user-avatar">
                        {getInitials(user.full_name || user.name)}
                      </span>
                    </td>

                    <td>
                      <strong>{user.full_name || user.name}</strong>
                      <small>ID: U{String(user.id).padStart(3, '0')}</small>
                    </td>

                    <td>{user.email}</td>

                    <td>{user.phone || '---'}</td>

                    <td>{formatDate(user.created_at)}</td>

                    <td>
                      <b className="booking-count">{user.bookings_count || 0}</b>
                    </td>

                    <td>
                      <span className={`status-badge ${user.status || 'active'}`}>
                        {statusLabels[user.status] || 'Hoạt Động'}
                      </span>
                    </td>

                    <td>
                      <div className="user-actions">
                        <button type="button" title="Xem" onClick={() => handleView(user.id)}>
                          👁
                        </button>

                        <button type="button" title="Sửa" onClick={() => openEditForm(user)}>
                          ✏️
                        </button>

                        <button
                          type="button"
                          title={user.status === 'inactive' ? 'Mở khóa' : 'Khóa'}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === 'inactive' ? '🔓' : '🔒'}
                        </button>
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
                <b>Số booking:</b>
                <span>{selectedUser.bookings_count || 0}</span>
              </p>
              <p>
                <b>Trạng thái:</b>
                <span>{statusLabels[selectedUser.status] || 'Hoạt Động'}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="user-modal-backdrop" onClick={closeForm}>
          <form
            className="user-modal create-user-modal"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={closeForm}>
              ×
            </button>

            <div className="create-form-header">
              <span className="create-form-icon">👤</span>
              <div>
                <h2>{editingUser ? 'Cập Nhật Người Dùng' : 'Thêm Người Dùng'}</h2>
                <p>Nhập thông tin tài khoản người dùng.</p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                <span>Họ tên</span>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => updateForm('full_name', e.target.value)}
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                />
              </label>

              <label>
                <span>Số điện thoại</span>
                <input
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                />
              </label>

              <label>
                <span>Mật khẩu</span>
                <input
                  required={!editingUser}
                  type="password"
                  placeholder={editingUser ? 'Để trống nếu không đổi' : 'Tối thiểu 6 ký tự'}
                  value={form.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                />
              </label>

              <label>
                <span>Trạng thái</span>
                <select value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                  <option value="active">Hoạt Động</option>
                  <option value="inactive">Bị Khóa</option>
                </select>
              </label>
            </div>

            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={closeForm}>
                Hủy
              </button>

              <button className="user-submit-button" type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  )
}

export default UserManagementPage