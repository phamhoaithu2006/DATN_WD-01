import { roleClass, roleLabel } from "../../../utils/accountRoles";

const colors = ["blue", "purple", "green", "amber", "red"];
const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "TK";
const date = (value) =>
  value ? new Intl.DateTimeFormat("vi-VN").format(new Date(value)) : "—";

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
  return <svg viewBox="0 0 24 24">{paths[name]}</svg>;
}

function UserTable({ accounts, loading, onView, onEdit, onToggleLock }) {
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
            <th>Booking</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account, index) => (
            <tr key={account.id}>
              <td>
                <span
                  className={`user-avatar ${colors[index % colors.length]}`}
                >
                  {initials(account.full_name)}
                </span>
              </td>
              <td>
                <strong>{account.full_name}</strong>
                <small>ID: U{String(account.id).padStart(3, "0")}</small>
              </td>
              <td>{account.email}</td>
              <td>{account.phone || "—"}</td>
              <td>{date(account.created_at)}</td>
              <td>
                <span className={`user-role ${roleClass(account.role)}`}>
                  {roleLabel(account.role)}
                </span>
              </td>
              <td>
                <strong className="booking-count">
                  {account.role?.name === "customer"
                    ? (account.bookings_count ?? 0)
                    : "—"}
                </strong>
              </td>
              <td>
                <span className={`user-status ${account.status}`}>
                  {account.status === "active" ? "Hoạt động" : "Bị khóa"}
                </span>
              </td>
              <td>
                <div className="user-actions">
                  <button title="Xem" onClick={() => onView(account)}>
                    <Icon name="view" />
                  </button>
                  <button title="Sửa" onClick={() => onEdit(account)}>
                    <Icon name="edit" />
                  </button>
                  <button
                    className={
                      account.status === "active" ? "danger" : "success"
                    }
                    title={account.status === "active" ? "Khóa" : "Mở khóa"}
                    onClick={() => onToggleLock(account)}
                  >
                    <Icon
                      name={account.status === "active" ? "lock" : "unlock"}
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!loading && accounts.length === 0 ? (
            <tr>
              <td className="user-empty" colSpan="9">
                Không tìm thấy tài khoản phù hợp.
              </td>
            </tr>
          ) : null}
          {loading ? (
            <tr>
              <td className="user-empty" colSpan="9">
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
