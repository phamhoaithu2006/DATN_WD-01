import { useCallback, useEffect, useState } from "react";
import UserDetailModal from "../../components/admin/users/UserDetailModal";
import UserFilters from "../../components/admin/users/UserFilters";
import UserFormModal from "../../components/admin/users/UserFormModal";
import UserStats from "../../components/admin/users/UserStats";
import UserTable from "../../components/admin/users/UserTable";
import {
  createAccount,
  getAccount,
  getAccounts,
  getAccountStatistics,
  setAccountStatus,
  updateAccount,
} from "../../services/adminAccountApi";
import "../../styles/user-management.css";

const messageFrom = (error) =>
  Object.values(error.response?.data?.errors || {}).flat()[0] ||
  error.response?.data?.message ||
  "Không thể xử lý yêu cầu.";

function UserManagementPage() {
  const [accounts, setAccounts] = useState([]),
    [roles, setRoles] = useState([]);
  const [search, setSearch] = useState(""),
    [roleId, setRoleId] = useState(""),
    [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(undefined),
    [detail, setDetail] = useState(null),
    [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statistics] = await Promise.all([
        getAccounts({
          search: search.trim() || undefined,
          role_id: roleId || undefined,
          status: status || undefined,
        }),
        getAccountStatistics(),
      ]);
      setAccounts(list);
      setRoles(statistics.roles || []);
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
    } finally {
      setLoading(false);
    }
  }, [search, roleId, status]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function save(form) {
    setSaving(true);
    try {
      const response = editing
        ? await updateAccount(editing.id, form)
        : await createAccount(form);
      setNotice({ type: "success", text: response.message });
      setEditing(undefined);
      await load();
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
    } finally {
      setSaving(false);
    }
  }

  async function view(account) {
    try {
      setDetail(await getAccount(account.id));
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
    }
  }
  async function toggleLock(account) {
    const nextStatus = account.status === "active" ? "inactive" : "active";
    if (
      !window.confirm(
        `${nextStatus === "inactive" ? "Khóa" : "Mở khóa"} tài khoản của ${account.full_name}?`,
      )
    )
      return;
    try {
      const response = await setAccountStatus(account.id, nextStatus);
      setNotice({ type: "success", text: response.message });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
    }
  }

  return (
    <section className="user-management-page">
      <header className="user-page-heading">
        <div>
          <h1>Quản Lý Người Dùng</h1>
          <p>Quản lý tài khoản và phân quyền người dùng</p>
        </div>
        <button onClick={() => setEditing(null)}>
          <span>＋</span> Thêm Người Dùng
        </button>
      </header>
      {notice ? (
        <div className={`user-notice ${notice.type}`}>
          {notice.text}
          <button onClick={() => setNotice(null)}>×</button>
        </div>
      ) : null}
      <UserStats roles={roles} />
      <UserFilters
        search={search}
        roleId={roleId}
        status={status}
        roles={roles}
        onSearchChange={setSearch}
        onRoleChange={setRoleId}
        onStatusChange={setStatus}
      />
      <UserTable
        accounts={accounts}
        loading={loading}
        onView={view}
        onEdit={setEditing}
        onToggleLock={toggleLock}
      />
      {editing !== undefined ? (
        <UserFormModal
          account={editing}
          roles={roles}
          saving={saving}
          onClose={() => setEditing(undefined)}
          onSave={save}
        />
      ) : null}
      {detail ? (
        <UserDetailModal account={detail} onClose={() => setDetail(null)} />
      ) : null}
    </section>
  );
}

export default UserManagementPage;
