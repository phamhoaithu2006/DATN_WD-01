import { useState } from "react";
import { mediaUrl } from "../../../utils/mediaUrl";

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
  : "—";

const initials = (name = "") => name.split(" ").filter(Boolean).slice(-2)
  .map((word) => word[0]).join("").toUpperCase() || "KH";

function CustomerActivityModal({ customer, data, loading, onClose }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const profile = data?.customer || customer || {};
  const activities = Array.isArray(data?.activities) ? data.activities : [];
  const avatarSrc = !avatarFailed ? mediaUrl(profile.avatar_url) : "";

  return (
    <div className="user-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="user-modal user-activity-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="user-modal-heading">
          <div>
            <h2>Lịch sử thao tác khách hàng</h2>
            <p>KH{String(profile.id || "").padStart(3, "0")} · {profile.name || profile.full_name}</p>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>

        {loading ? <div className="user-empty">Đang tải lịch sử thao tác...</div> : (
          <>
            <div className="user-activity-profile">
              <span className={avatarSrc ? "is-image" : ""}>
                {avatarSrc
                  ? <img src={avatarSrc} alt={profile.name} onError={() => setAvatarFailed(true)} />
                  : initials(profile.name || profile.full_name)}
              </span>
              <div>
                <h3>{profile.name || profile.full_name || "—"}</h3>
                <p>{profile.email || "—"}</p>
                <em className={`user-status ${profile.status}`}>
                  {profile.status === "active" ? "Hoạt động" : "Bị khóa"}
                </em>
              </div>
              <strong className="user-activity-total">
                {data?.activity_summary?.total_actions || 0}
                <small>Tổng thao tác</small>
              </strong>
            </div>

            <div className="user-activity-scroll">
              {activities.length === 0 ? <div className="user-empty">Chưa ghi nhận thao tác nào của khách hàng.</div> : (
                <div className="user-activity-timeline">
                  {activities.map((item) => (
                    <article className="user-activity-item" key={item.id}>
                      <span />
                      <div>
                        <div>
                          <strong>{item.description}</strong>
                          {item.status ? <em>{item.status}</em> : null}
                        </div>
                        <p>{item.detail || "Thao tác của khách hàng"}</p>
                        <time>{formatDateTime(item.created_at)}</time>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="user-modal-actions">
          <button className="primary" type="button" onClick={onClose}>Đóng</button>
        </div>
      </section>
    </div>
  );
}

export default CustomerActivityModal;
