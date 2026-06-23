import { roleLabel } from "../../../utils/accountRoles";

function UserDetailModal({ customer, onClose }) {
  const date = customer.created_at
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(
        new Date(customer.created_at),
      )
    : "—";

  return (
    <div
      className="user-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="user-modal user-detail-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="user-modal-heading">
          <div>
            <h2>Chi tiết người dùng</h2>
            <p>Mã tài khoản U{String(customer.id).padStart(3, "0")}</p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="user-detail-profile">
          <span>
            {customer.full_name
              ?.split(" ")
              .slice(-2)
              .map((word) => word[0])
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <h3>{customer.full_name}</h3>
            <em className={`user-status ${customer.status}`}>
              {customer.status === "active" ? "Hoạt động" : "Bị khóa"}
            </em>
          </div>
        </div>
        <dl className="user-detail-grid">
          <div>
            <dt>Email</dt>
            <dd>{customer.email}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>{customer.phone || "Chưa cập nhật"}</dd>
          </div>
          <div>
            <dt>Vai trò</dt>
            <dd>{roleLabel(customer.role)}</dd>
          </div>
          <div>
            <dt>Ngày đăng ký</dt>
            <dd>{date}</dd>
          </div>
          <div>
            <dt>Số lượt đặt tour</dt>
            <dd>{customer.bookings_count ?? 0} booking</dd>
          </div>
        </dl>
        <div className="user-modal-actions">
          <button className="primary" type="button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </section>
    </div>
  );
}

export default UserDetailModal;
