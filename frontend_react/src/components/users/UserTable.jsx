import { roleClass, roleLabel } from "../../../utils/accountRoles";

const colors = ["blue", "purple", "green", "amber", "red"];

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "ND"
  );
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat("vi-VN").format(new Date(value)) : "-";
}

function Icon({ name }) {
  const paths = {
    view: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      </>
    ),
    edit: (
      <>
        <path d="m4 20 4-.9L19 6.2 16.8 4 4.9 15.9 4 20Z" />
        <path d="m14.8 6 2.2 2.2" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    unlock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M16 10V7a4 4 0 0 0-7.7-1.5" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function UserTable({
  customers,
  loading,
  showBookings = false,
  onView,
  onEdit,
  onToggleLock,
}) {
  const emptyColSpan = showBookings ? 9 : 8;

  return (
    <div className="user-table-wrap">
      <table className="user-table">
        <thead>
          <tr>
            <th>Avatar</th>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Số điện thoại</th>
            <th>Ngày đăng ký</th>
            <th>Vai trò</th>
            {showBookings ? <th>Booking</th> : null}
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer, index) => (
            <tr key={customer.id}>
              <td>
                <span
                  className={`user-avatar ${customer.avatar_url ? "is-image" : colors[index % colors.length]}`}
                >
                  {customer.avatar_url ? (
                    <img src={customer.avatar_url} alt={customer.full_name} />
                  ) : (
                    initials(customer.full_name)
                  )}
                </span>
              </td>
              <td>
                <strong>{customer.full_name}</strong>
                <small>ID: U{String(customer.id).padStart(3, "0")}</small>
              </td>
              <td>{customer.email}</td>
              <td>{customer.phone || "-"}</td>
              <td>{formatDate(customer.created_at)}</td>
              <td>
                <span className={`user-role ${roleClass(customer.role)}`}>
                  {roleLabel(customer.role)}
                </span>
              </td>
              {showBookings ? (
                <td>
                  <strong className="booking-count">
                    {customer.bookings_count ?? 0}
                  </strong>
                </td>
              ) : null}
              <td>
                <span className={`user-status ${customer.status}`}>
                  {customer.status === "active" ? "Hoạt động" : "Bị khóa"}
                </span>
              </td>
              <td>
                <div className="user-actions">
                  <button title="Xem chi tiết" onClick={() => onView(customer)}>
                    <Icon name="view" />
                  </button>
                  <button title="Chỉnh sửa" onClick={() => onEdit(customer)}>
                    <Icon name="edit" />
                  </button>
                  <button
                    className={
                      customer.status === "active" ? "danger" : "success"
                    }
                    title={
                      customer.status === "active"
                        ? "Khóa tài khoản"
                        : "Mở khóa"
                    }
                    onClick={() => onToggleLock(customer)}
                  >
                    <Icon
                      name={customer.status === "active" ? "lock" : "unlock"}
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!loading && customers.length === 0 ? (
            <tr>
              <td className="user-empty" colSpan={emptyColSpan}>
                Không tìm thấy tài khoản người dùng phù hợp.
              </td>
            </tr>
          ) : null}
          {loading ? (
            <tr>
              <td className="user-empty" colSpan={emptyColSpan}>
                Đang tải dữ liệu...
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;
