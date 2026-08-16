const FIELD_LABELS = { full_name: "Họ tên", email: "Email", phone: "Số điện thoại", status: "Trạng thái", role: "Vai trò", avatar_url: "Ảnh đại diện" };
const STATUS_LABELS = { active: "Hoạt động", inactive: "Đã khóa", locked: "Đã khóa" };

const formatTime = (value) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "--";
const displayValue = (field, value) => {
  if (field === "avatar_url") return value ? "Có ảnh" : "Không có ảnh";
  if (field === "status") return STATUS_LABELS[value] || value || "Trống";
  return value === null || value === undefined || value === "" ? "Trống" : String(value);
};
const changesOf = (item) => {
  const before = item.metadata?.before || {};
  const after = item.metadata?.after || {};
  const changes = Object.keys(FIELD_LABELS).filter((field) => before[field] !== after[field]).map((field) => ({ field, before: before[field], after: after[field] }));
  if (item.metadata?.password_changed) changes.push({ field: "password" });
  return changes;
};

function UserTimelineModal({ activities, loading, onClose }) {
  return (
    <div className="user-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="user-modal user-timeline-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-heading"><div><small>TIMELINE</small><h2>Thao tác quản lý người dùng</h2></div><button type="button" onClick={onClose}>&times;</button></div>
        {loading ? <div className="user-empty">Đang tải timeline...</div> : activities.length ? <div className="user-activity-scroll"><div className="user-activity-timeline">
          {activities.map((item) => {
            const changes = changesOf(item);
            return <article className="user-activity-item" key={item.id}><span /><div>
              <strong>{item.description}</strong>
              <p><b>{item.actor?.name || "Quản trị viên"}</b> · {item.target_name}</p>
              {changes.length ? <div className="user-timeline-changes">{changes.map((change) => change.field === "password"
                ? <div key="password"><b>Mật khẩu:</b> Đã thay đổi</div>
                : <div key={change.field}><b>{FIELD_LABELS[change.field]}:</b> {displayValue(change.field, change.before)} → {displayValue(change.field, change.after)}</div>)}</div> : null}
              <time>{formatTime(item.created_at)}</time>
            </div></article>;
          })}
        </div></div> : <div className="user-empty">Chưa có thao tác quản trị nào.</div>}
        <div className="user-modal-actions"><button className="primary" type="button" onClick={onClose}>Đóng</button></div>
      </section>
    </div>
  );
}

export default UserTimelineModal;
