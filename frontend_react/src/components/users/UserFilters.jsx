import { roleLabel } from "../../../utils/accountRoles";

function UserFilters({
  search,
  roleId,
  status,
  roles,
  onSearchChange,
  onRoleChange,
  onStatusChange,
}) {
  return (
    <div className="user-filter-bar">
      <label className="user-search">
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo tên, email..."
        />
      </label>
      <select value={roleId} onChange={(e) => onRoleChange(e.target.value)}>
        <option value="">Tất cả vai trò</option>
        {roles.map((role) => (
          <option value={role.id} key={role.id}>
            {roleLabel(role)}
          </option>
        ))}
      </select>
      <select value={status} onChange={(e) => onStatusChange(e.target.value)}>
        <option value="">Tất cả trạng thái</option>
        <option value="active">Hoạt động</option>
        <option value="inactive">Bị khóa</option>
      </select>
    </div>
  );
}

export default UserFilters;
