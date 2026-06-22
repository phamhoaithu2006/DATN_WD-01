import { roleLabel } from "../../../utils/accountRoles";

function UserDetailModal({ account, onClose }) {
  return (
    <div className="user-modal-backdrop" onMouseDown={onClose}>
      <section
        className="user-modal user-detail-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="user-modal-heading">
          <div>
            <h2>Chi tiết tài khoản</h2>
            <p>Mã người dùng U{String(account.id).padStart(3, "0")}</p>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="user-detail-profile">
          <span>
            {account.full_name
              ?.split(" ")
              .slice(-2)
              .map((word) => word[0])
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <h3>{account.full_name}</h3>
            <em className={`user-status ${account.status}`}>
              {account.status === "active" ? "Hoạt động" : "Bị khóa"}
            </em>
          </div>
        </div>
        <dl className="user-detail-grid">
          <div>
            <dt>Email</dt>
            <dd>{account.email}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>{account.phone || "Chưa cập nhật"}</dd>
          </div>
          <div>
            <dt>Vai trò</dt>
            <dd>{roleLabel(account.role)}</dd>
          </div>
          <div>
            <dt>Ngày đăng ký</dt>
            <dd>
              {new Intl.DateTimeFormat("vi-VN").format(
                new Date(account.created_at),
              )}
            </dd>
          </div>
          <div>
            <dt>Số lượt đặt tour</dt>
            <dd>{account.bookings_count ?? 0}</dd>
          </div>
        </dl>
        <div className="user-modal-actions">
          <button className="primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </section>
    </div>
  );
}

export default UserDetailModal;
