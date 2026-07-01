const cards = [
  ["total_users", "👥", "Tổng người dùng", "blue"],
  ["active_users", "✓", "Đang hoạt động", "green"],
  ["locked_users", "🔒", "Tài khoản đã khóa", "red"],
  ["total_bookings", "▣", "Tổng lượt đặt tour", "amber"],
];

function UserStats({ statistics, activeFilter, onFilter }) {
  return (
    <div className="user-stat-grid">
      {cards.map(([key, icon, label, color]) => (
        <button
          className={`user-stat-card ${color} ${activeFilter === key ? "is-active" : ""}`}
          key={key}
          type="button"
          onClick={() => onFilter(key)}
        >
          <span className="user-stat-icon" aria-hidden="true">
            {icon}
          </span>
          <div>
            <strong>{statistics[key] ?? 0}</strong>
            <span>{label}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export default UserStats;
