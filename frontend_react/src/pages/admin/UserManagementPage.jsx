import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import UserDetailModal from "../../components/admin/users/UserDetailModal";
import UserFilters from "../../components/admin/users/UserFilters";
import UserFormModal from "../../components/admin/users/UserFormModal";
import UserTable from "../../components/admin/users/UserTable";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import {
  createAccount,
  getAccount,
  getAccounts,
  getAccountRoles,
  setAccountStatus,
  updateAccount,
} from "../../services/adminAccountApi";
import "../../styles/user-management.css";

export const USER_ROLE_PAGES = [
  {
    name: "customer",
    fallbackId: 2,
    path: "/admin/users/customers",
    title: "Tài khoản khách hàng",
    breadcrumb: "Khách hàng",
    description: "Quản lý tài khoản khách hàng và trạng thái hoạt động",
    showBookings: true,
  },
  {
    name: "admin",
    fallbackId: 4,
    path: "/admin/users/admins",
    title: "Tài khoản quản trị viên",
    breadcrumb: "Quản trị viên",
    description: "Quản lý tài khoản quản trị trong hệ thống",
  },
  {
    name: "support staff",
    fallbackId: 1,
    path: "/admin/users/support-staff",
    title: "Tài khoản nhân viên hỗ trợ",
    breadcrumb: "Nhân viên hỗ trợ",
    description: "Quản lý tài khoản nhân viên hỗ trợ khách hàng",
  },
  {
    name: "tour guide",
    fallbackId: 3,
    path: "/admin/users/tour-guides",
    title: "Tài khoản hướng dẫn viên",
    breadcrumb: "Hướng dẫn viên",
    description: "Quản lý tài khoản hướng dẫn viên du lịch",
  },
];

const ROLE_ENTITY_LABELS = {
  customer: "khách hàng",
  admin: "quản trị viên",
  "support staff": "nhân viên hỗ trợ",
  "tour guide": "hướng dẫn viên",
};

const ROLE_ENTITY_LABEL_CAPS = {
  customer: "Khách hàng",
  admin: "Quản trị viên",
  "support staff": "Nhân viên hỗ trợ",
  "tour guide": "Hướng dẫn viên",
};

const getRoleEntityLabel = (roleName) => ROLE_ENTITY_LABELS[roleName] || "người dùng";
const getRoleEntityLabelCaps = (roleName) => ROLE_ENTITY_LABEL_CAPS[roleName] || "Người dùng";

const messageFrom = (error) =>
  Object.values(error.response?.data?.errors || {}).flat()[0] ||
  error.response?.data?.message ||
  "Không thể xử lý yêu cầu.";

const cleanPayload = (form, isEditing, allowAvatar = true) => {
  const payload = {
    ...form,
    role_id: form.role_id ? Number(form.role_id) : "",
  };

  if (!allowAvatar) {
    delete payload.avatar;
  }

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

function UserManagementPage({ roleName = "customer" }) {
  const rolePage = useMemo(
    () =>
      USER_ROLE_PAGES.find((page) => page.name === roleName) ||
      USER_ROLE_PAGES[0],
    [roleName],
  );
  const entityLabel = getRoleEntityLabel(rolePage.name);
  const entityLabelCaps = getRoleEntityLabelCaps(rolePage.name);
  const showAvatar = !["support staff", "tour guide"].includes(rolePage.name);
  const [customers, setCustomers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(undefined);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState(null);
  const [currentRoleId, setCurrentRoleId] = useState(rolePage.fallbackId);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const roleList = await getAccountRoles().catch(() => []);
      const selectedRole =
        roleList.find((role) => role.name === rolePage.name) || {
          id: rolePage.fallbackId,
          name: rolePage.name,
          description: rolePage.breadcrumb,
        };

      const list = await getAccounts({
        search: search.trim() || undefined,
        status: status || undefined,
        role_id: selectedRole.id,
      });

      const resolvedRoles = roleList?.length
        ? roleList
        : rolesFromAccounts(list);
      const rolesWithCurrent = resolvedRoles.some(
        (role) => Number(role.id) === Number(selectedRole.id),
      )
        ? resolvedRoles
        : [...resolvedRoles, selectedRole];

      setCurrentRoleId(selectedRole.id);
      setCustomers(withResolvedRoles(list, rolesWithCurrent));
      setRoles(rolesWithCurrent);
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
    } finally {
      setLoading(false);
    }
  }, [rolePage, search, status]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;

    const timer = setTimeout(() => {
      setNotice(null);
    }, 10000);

    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch("");
      setStatus("");
      setEditing(undefined);
      setDetail(null);
      setNotice(null);
    }, 0);

    return () => clearTimeout(timer);
  }, [rolePage.name]);

  async function save(form) {
    setSaving(true);
    try {
      const response = editing
        ? await updateAccount(
            editing.id,
            cleanPayload(form, true, showAvatar),
          )
        : await createAccount(cleanPayload(form, false, showAvatar));

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
      <AdminPageHeader
        breadcrumb={["ViVuGo", "Quản Lý Người Dùng", rolePage.breadcrumb]}
        title={rolePage.title}
        description={rolePage.description}
        actions={
          <button
            className="user-add-button"
            type="button"
            onClick={() => setEditing(null)}
          >
            <span aria-hidden="true">＋</span>
            Thêm {entityLabelCaps}
          </button>
        }
      />

      {notice ? (
        <div className={`user-notice ${notice.type}`}>
          {notice.text}
          <button onClick={() => setNotice(null)}>×</button>
        </div>
      ) : null}

      <nav className="user-role-tabs" aria-label="Nhóm tài khoản người dùng">
        {USER_ROLE_PAGES.map((page) => (
          <NavLink
            className={({ isActive }) =>
              isActive || page.name === rolePage.name
                ? "user-role-tab active"
                : "user-role-tab"
            }
            key={page.name}
            to={page.path}
          >
            {page.breadcrumb}
          </NavLink>
        ))}
      </nav>

      <UserFilters
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
      />
      <UserTable
        customers={customers}
        loading={loading}
        showBookings={rolePage.showBookings}
        onView={view}
        onEdit={setEditing}
        onToggleLock={toggleLock}
      />

      {editing !== undefined ? (
        <UserFormModal
          customer={editing}
          roles={roles}
          selectedRoleId={String(currentRoleId || rolePage.fallbackId || "")}
          entityLabel={entityLabel}
          entityDescription={`Thông tin tài khoản ${entityLabel} ViVuGo`}
          saving={saving}
          onClose={() => setEditing(undefined)}
          onSave={save}
          showAvatar={showAvatar}
        />
      ) : null}

      {detail ? (
        <UserDetailModal
          customer={detail}
          showBookings={rolePage.showBookings}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </section>
  );
}

export default UserManagementPage;
