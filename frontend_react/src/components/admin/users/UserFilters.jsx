function UserFilters({ search, status, onSearchChange, onStatusChange, onTimeline }) {
  return (
    <div className="user-filter-bar">
      <label className="user-search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên, email hoặc số điện thoại..."
        />
      </label>
      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        <option value="">Tất cả trạng thái</option>
        <option value="active">Hoạt động</option>
        <option value="inactive">Bị khóa</option>
      </select>
      {onTimeline ? <button className="user-timeline-button" type="button" onClick={onTimeline}>Timeline</button> : null}
    </div>
  );
}

export default UserFilters;
