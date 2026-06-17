function UserDashboard({ user, welcomeName, onLogout }) {
  return (
    <div className="dashboard-card">
      <span className="status-pill">Đang đăng nhập</span>
      <h2>Xin chào, {welcomeName}</h2>
      <p>
        Tài khoản <strong>{user.email}</strong> đã sẵn sàng để lưu các chuyến đi
        tiếp theo.
      </p>
      <div className="profile-grid">
        <div>
          <span>Họ tên</span>
          <strong>{user.full_name}</strong>
        </div>
        <div>
          <span>Số điện thoại</span>
          <strong>{user.phone}</strong>
        </div>
      </div>
      <button className="primary-button" type="button" onClick={onLogout}>
        Đăng xuất
      </button>
    </div>
  )
}

export default UserDashboard
