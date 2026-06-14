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

function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleId, setRoleId] = useState('')
  const [status, setStatus] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', role_id: '' })

  const queryParams = useMemo(() => ({
    search: search || undefined,
    role_id: roleId || undefined,
    status: status || undefined,
  }), [search, roleId, status])

  async function loadData() {
    setLoading(true)
    try {
      const [userList, roleList, statList] = await Promise.all([
        getUsers(queryParams),
        getRoles(),
        getUserStats(),
      ])
      setUsers(userList)
      setRoles(roleList)
      setStats(statList)
      setForm((current) => ({ ...current, role_id: current.role_id || roleList[0]?.id || '' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [queryParams])

  async function handleView(userId) {
    const detail = await getUserDetail(userId)
    setSelectedUser(detail)
  }

  async function handleToggleStatus(user) {
    if (user.status === 'locked') {
      await unlockUser(user.id)
    } else {
      await lockUser(user.id)
    }
    await loadData()
  }

  async function handleRoleChange(userId, nextRoleId) {
    await changeUserRole(userId, nextRoleId)
    await loadData()
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    await createUser(form)
    setForm({ full_name: '', email: '', phone: '', password: '', role_id: roles[0]?.id || '' })
    setShowCreateForm(false)
    await loadData()
  }

  return (
    <AdminLayout>
      <section className="user-page">
        <div className="user-header">
          <div>
            <h1>Quản Lý Người Dùng</h1>
            <p>Quản lý tài khoản và phân quyền người dùng</p>
          </div>
          <button className="user-add-button" type="button" onClick={() => setShowCreateForm(true)}>
            <span>♙</span> Thêm Người Dùng
          </button>
        </div>

        <div className="user-stat-grid">
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, email..." />
          </label>
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Tất cả vai trò</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{getRoleLabel(role)}</option>)}
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
                <th>Avatar</th><th>Họ Tên</th><th>Email</th><th>Số Điện Thoại</th><th>Ngày Đăng Ký</th><th>Vai Trò</th><th>Booking</th><th>Trạng Thái</th><th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="user-empty">Đang tải dữ liệu...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="9" className="user-empty">Không có người dùng phù hợp</td></tr>
              ) : users.map((user) => (
                <tr key={user.id}>
                  <td><span className="user-avatar">{getInitials(user.full_name || user.name)}</span></td>
                  <td><strong>{user.full_name || user.name}</strong><small>ID: U{String(user.id).padStart(3, '0')}</small></td>
                  <td>{user.email}</td>
                  <td>{user.phone || '---'}</td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '---'}</td>
                  <td><span className="user-role-badge">{getRoleLabel(user.role)}</span></td>
                  <td><b className="booking-count">{user.bookings_count || 0}</b></td>
                  <td><span className={user.status === 'locked' ? 'status-badge locked' : 'status-badge active'}>{user.status === 'locked' ? 'Bị Khóa' : 'Hoạt Động'}</span></td>
                  <td>
                    <div className="user-actions">
                      <button title="Xem chi tiết" onClick={() => handleView(user.id)}>👁</button>
                      <button title={user.status === 'locked' ? 'Mở khóa' : 'Khóa'} onClick={() => handleToggleStatus(user)}>{user.status === 'locked' ? '🔓' : '🔒'}</button>
                      <select title="Phân quyền" value={user.role_id || ''} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                        {roles.map((role) => <option key={role.id} value={role.id}>{getRoleLabel(role)}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser && (
        <div className="user-modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="user-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
            <h2>Chi tiết người dùng</h2>
            <p><b>Họ tên:</b> {selectedUser.full_name || selectedUser.name}</p>
            <p><b>Email:</b> {selectedUser.email}</p>
            <p><b>Số điện thoại:</b> {selectedUser.phone || '---'}</p>
            <p><b>Vai trò:</b> {getRoleLabel(selectedUser.role)}</p>
            <p><b>Trạng thái:</b> {selectedUser.status === 'locked' ? 'Bị khóa' : 'Hoạt động'}</p>
            <p><b>Số booking:</b> {selectedUser.bookings_count || 0}</p>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="user-modal-backdrop" onClick={() => setShowCreateForm(false)}>
          <form className="user-modal" onSubmit={handleCreateSubmit} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setShowCreateForm(false)}>×</button>
            <h2>Thêm người dùng</h2>
            <input required placeholder="Họ tên" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input required type="password" placeholder="Mật khẩu" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
              {roles.map((role) => <option key={role.id} value={role.id}>{getRoleLabel(role)}</option>)}
            </select>
            <button className="user-submit-button" type="submit">Lưu người dùng</button>
          </form>
        </div>
      )}
    </AdminLayout>
  )
}

export default UserManagementPage
