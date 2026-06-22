import { roleLabel } from "../../../utils/accountRoles";

const icons = {
  customer: "👥",
  admin: "🛡️",
  "support staff": "🎧",
  "tour guide": "🧭",
};
const colors = {
  customer: "blue",
  admin: "purple",
  "support staff": "green",
  "tour guide": "amber",
};

function UserStats({ roles = [] }) {
  return (
    <div className="user-stat-grid">
      {roles.map((role) => (
        <article
          className={`user-stat-card ${colors[role.name] || "blue"}`}
          key={role.id}
        >
          <span className="user-stat-icon">{icons[role.name] || "👤"}</span>
          <div>
            <strong>{role.total}</strong>
            <span>{roleLabel(role)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default UserStats;
