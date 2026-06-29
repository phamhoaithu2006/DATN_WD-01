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
  getAccountRoles,
  getAccountStatistics,
  setAccountStatus,
  updateAccount,
} from "../../services/adminAccountApi";
import "../../styles/user-management.css";

const messageFrom = (error) =>
  Object.values(error.response?.data?.errors || {}).flat()[0] ||
  error.response?.data?.message ||
  "Không thể xử lý yêu cầu.";

const cleanPayload = (form, isEditing) => {
  const payload = {
    ...form,
    role_id: form.role_id ? Number(form.role_id) : "",
  };

  if (isEditing && !payload.password) {
    delete payload.password;
  }

  return payload;
};

const rolesFromAccounts = (accounts) => {
  const roles = new Map();

  accounts.forEach((account) => {
    if (account.role?.id) {
      roles.set(account.role.id, account.role);
      return;
    }

    if (account.role_id) {
      roles.set(account.role_id, {
        id: account.role_id,
        name: `role-${account.role_id}`,
        description: `Vai trò ${account.role_id}`,
      });
    }
  });

  return Array.from(roles.values()).sort((a, b) => a.id - b.id);
};

const roleForAccount = (account, roles) =>
  account.role ||
  roles.find((role) => Number(role.id) === Number(account.role_id)) ||
  null;

const withResolvedRoles = (accounts, roles) =>
  accounts.map((account) => ({
    ...account,
    role: roleForAccount(account, roles),
  }));

function UserManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [roleId, setRoleId] = useState("");
  const [statFilter, setStatFilter] = useState("total_users");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(undefined);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statisticsData, roleList] = await Promise.all([
        getAccounts({
          search: search.trim() || undefined,
          status: status || undefined,
          role_id: roleId || undefined,
        }),
        getAccountStatistics(),
        getAccountRoles().catch(() => []),
      ]);

      const resolvedRoles =
        roleList?.length
          ? roleList
          : statisticsData?.roles?.length
            ? statisticsData.roles
            : rolesFromAccounts(list);

      const resolvedCustomers = withResolvedRoles(list, resolvedRoles);
      const nextCustomers =
        statFilter === "active_users"
          ? resolvedCustomers.filter((customer) => customer.status === "active")
          : statFilter === "locked_users"
            ? resolvedCustomers.filter((customer) => customer.status === "inactive")
            : statFilter === "total_bookings"
              ? resolvedCustomers.filter((customer) => Number(customer.bookings_count || 0) > 0)
              : resolvedCustomers;

      setCustomers(nextCustomers);
      setStatistics(statisticsData || {});
      setRoles(resolvedRoles);
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
    } finally {
      setLoading(false);
    }
  }, [roleId, search, statFilter, status]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function save(form) {
    setSaving(true);
    try {
      const response = editing
        ? await updateAccount(editing.id, cleanPayload(form, true))
        : await createAccount(cleanPayload(form, false));

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
      const accountDetail = await getAccount(account.id);
      setDetail({
        ...accountDetail,
        role: roleForAccount(accountDetail, roles),
      });
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
    }
  }

  async function toggleLock(account) {
    const nextStatus = account.status === "active" ? "inactive" : "active";
    const actionLabel = nextStatus === "inactive" ? "Khóa" : "Mở khóa";

    if (!window.confirm(`${actionLabel} tài khoản của ${account.full_name}?`)) {
      return;
    }

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
      <div className="user-page-top">
        <div className="user-page-breadcrumb">
          ViVuGo <span>/</span> <b>Quản Lý Người Dùng</b>
        </div>

        <header className="user-page-heading">
          <div>
            <h1>Quản Lý Người Dùng</h1>
            <p>Quản lý tài khoản, vai trò và trạng thái hoạt động</p>
          </div>
          <button onClick={() => setEditing(null)}>
            <span>＋</span> Thêm Người Dùng
          </button>
        </header>
      </div>

      {notice ? (
        <div className={`user-notice ${notice.type}`}>
          {notice.text}
          <button onClick={() => setNotice(null)}>×</button>
        </div>
      ) : null}

      <UserStats
        statistics={statistics}
        activeFilter={statFilter}
        onFilter={(key) => setStatFilter((current) => (current === key ? "total_users" : key))}
      />
      <UserFilters
        search={search}
        status={status}
        roleId={roleId}
        roles={roles}
        onSearchChange={setSearch}
          onStatusChange={setStatus}
          onRoleChange={setRoleId}
        />
      <UserTable
        customers={customers}
        loading={loading}
        onView={view}
        onEdit={setEditing}
        onToggleLock={toggleLock}
      />

      {editing !== undefined ? (
        <UserFormModal
          customer={editing}
          roles={roles}
          saving={saving}
          onClose={() => setEditing(undefined)}
          onSave={save}
        />
      ) : null}

      {detail ? (
        <UserDetailModal customer={detail} onClose={() => setDetail(null)} />
      ) : null}
    </section>
  );
}

export default UserManagementPage;
