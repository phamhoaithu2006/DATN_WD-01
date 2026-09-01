import { useState } from "react";
import { roleClass, roleLabel } from "../../../utils/accountRoles";
import { mediaUrl } from "../../../utils/mediaUrl";

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

function formatPresence(presence) {
  const formatDuration = (secondsValue) => {
    const seconds = Math.max(0, Number(secondsValue || 0));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ngày`;
    if (hours > 0) return `${hours} giờ ${minutes % 60} phút`;
    return `${minutes} phút`;
  };

  if (presence?.is_online) {
    return {
      label: "Trực tuyến",
      detail: `Đã online ${formatDuration(presence.online_seconds)}`,
    };
  }

  if (!presence?.last_seen_at) {
    return { label: "Chưa truy cập", detail: "Chưa có dữ liệu online" };
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(presence.last_seen_at).getTime()) / 1000),
  );
  const minutes = Math.floor(elapsedSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  let detail = `Rời hệ thống ${minutes} phút trước`;

  if (hours > 0) detail = `Rời hệ thống ${hours} giờ ${minutes % 60} phút trước`;
  if (days > 0) detail = `Rời hệ thống ${days} ngày trước`;

  return { label: "Ngoại tuyến", detail };
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
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
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
  onHistory,
  presenceMap = null,
  startIndex = 0,
}) {
  const showPresence = presenceMap !== null;
  const emptyColSpan = (showBookings ? 9 : 8) + (showPresence ? 1 : 0);

  return (
    <div className="user-table-wrap">
      <table className={`user-table ${showBookings ? "with-bookings" : "without-bookings"} ${showPresence ? "with-presence" : "without-presence"}`}>
        <thead>
          <tr>
            <th>STT</th>
            <th>Avatar</th>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Số điện thoại</th>
            <th>Vai trò</th>
            {showBookings ? <th>Booking</th> : null}
            <th>Trạng thái</th>
            {showPresence ? <th>Trực tuyến</th> : null}
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer, index) => (
            <tr key={customer.id}>
              <td>{startIndex + index + 1}</td>
              <td>
                <UserAvatar customer={customer} color={colors[index % colors.length]} />
              </td>
              <td>
                <strong>{customer.full_name}</strong>
                <small>ID: U{String(customer.id).padStart(3, "0")}</small>
              </td>
              <td>{customer.email}</td>
              <td>{customer.phone || "-"}</td>
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
              {showPresence ? (
                <td>
                  {(() => {
                    const presence = presenceMap[String(customer.id)] || {};
                    const state = formatPresence(presence);

                    return (
                      <div className={`user-presence ${presence.is_online ? "online" : "offline"}`}>
                        <span />
                        <div>
                          <strong>{state.label}</strong>
                          <small>{state.detail}</small>
                        </div>
                      </div>
                    );
                  })()}
                </td>
              ) : null}
              <td>
                <div className="user-actions">
                  <button title="Xem chi tiết" onClick={() => onView(customer)}>
                    <Icon name="view" />
                  </button>
                  <button title="Chỉnh sửa" onClick={() => onEdit(customer)}>
                    <Icon name="edit" />
                  </button>
                  {onHistory ? (
                    <button
                      title="Lịch sử thao tác"
                      aria-label={`Lịch sử thao tác ${customer.full_name}`}
                      onClick={() => onHistory(customer)}
                    >
                      <Icon name="history" />
                    </button>
                  ) : null}
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

function UserAvatar({ customer, color }) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? mediaUrl(customer.avatar_url) : "";

  return (
    <span className={`user-avatar ${src ? "is-image" : color}`}>
      {src ? (
        <img
          src={src}
          alt={customer.full_name}
          onError={() => setFailed(true)}
        />
      ) : (
        initials(customer.full_name)
      )}
    </span>
  );
}

export default UserTable;
