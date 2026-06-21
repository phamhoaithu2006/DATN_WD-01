const cards = [
  ["total", "👥", "Tổng khách hàng", "blue"],
  ["active", "✓", "Đang hoạt động", "green"],
  ["locked", "🔒", "Tài khoản đã khóa", "red"],
  ["total_bookings", "▣", "Tổng lượt đặt tour", "amber"],
];

function UserStats({ statistics }) {
  return (
    <div className="user-stat-grid">
      {cards.map(([key, icon, label, color]) => (
        <article className={`user-stat-card ${color}`} key={key}>
          <span className="user-stat-icon" aria-hidden="true">
            {icon}
          </span>
          <div>
            <strong>{statistics[key] ?? 0}</strong>
            <span>{label}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default UserStats;
