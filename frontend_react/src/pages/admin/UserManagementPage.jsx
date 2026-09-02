import { useCallback, useEffect, useMemo, useState } from "react";
import UserDetailModal from "../../components/admin/users/UserDetailModal";
import UserFilters from "../../components/admin/users/UserFilters";
import UserFormModal from "../../components/admin/users/UserFormModal";
import UserTable from "../../components/admin/users/UserTable";
import CustomerActivityModal from "../../components/admin/users/CustomerActivityModal";
import UserTimelineModal from "../../components/admin/users/UserTimelineModal";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { confirmAction } from "../../components/common/AppConfirmDialog.jsx";
import {
  createAccount,
  getAccount,
  getAccounts,
  getAccountRoles,
  getAdminUserTimeline,
  getCustomerActivityHistory,
  setAccountStatus,
  updateAccount,
} from "../../services/adminAccountApi";
import "../../styles/user-management.css";
import { getCustomerPresence } from "../../services/customerPresenceApi";
import { getSupportStaffPresence } from "../../services/supportStaffApi";
import { getGuidePresence } from "../../services/adminGuideMonitoringApi";
import { readSession } from "../../services/authStorage";

const USER_ROLE_PAGES = [
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

function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);

  if (currentPage <= 3) [2, 3, 4].forEach((page) => pages.add(page));
  if (currentPage >= totalPages - 2) {
    [totalPages - 1, totalPages - 2, totalPages - 3].forEach((page) => pages.add(page));
  }

  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

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
  const [activityCustomer, setActivityCustomer] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineActivities, setTimelineActivities] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const totalRows = customers.length;
  const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1);
  const safePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safePage - 1) * pageSize;
  const sortedCustomers = useMemo(
    () => [...customers].sort((left, right) => {
      const leftOnline = presenceMap[String(left.id)]?.is_online ? 1 : 0;
      const rightOnline = presenceMap[String(right.id)]?.is_online ? 1 : 0;
      return rightOnline - leftOnline;
    }),
    [customers, presenceMap],
  );
  const paginatedCustomers = sortedCustomers.slice(pageStartIndex, pageStartIndex + pageSize);
  const visibleStart = totalRows > 0 ? pageStartIndex + 1 : 0;
  const visibleEnd = Math.min(pageStartIndex + pageSize, totalRows);
  const pageNumbers = buildPageNumbers(safePage, totalPages);

  const load = useCallback(async () => {
    setLoading(true);
    setCustomers([]);
    setPresenceMap({});
    setCurrentPage(1);
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
      let accountPresence = {};

      if (rolePage.name === "customer") {
        accountPresence = await getCustomerPresence().catch(() => ({}));
      } else if (rolePage.name === "support staff") {
        const response = await getSupportStaffPresence({ key_by: "user_id" }).catch(() => ({}));
        accountPresence = response?.data || {};
      } else if (rolePage.name === "tour guide") {
        const response = await getGuidePresence({ key_by: "user_id" }).catch(() => ({}));
        accountPresence = response?.data || {};
      } else if (rolePage.name === "admin") {
        const currentAdmin = readSession();

        if (currentAdmin?.id) {
          accountPresence = {
            [String(currentAdmin.id)]: {
              is_online: true,
              last_seen_at: new Date().toISOString(),
              online_since: new Date().toISOString(),
            },
          };
        }
      }

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
      setPresenceMap(accountPresence);
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
    setCurrentPage(1);
  }, [rolePage.name, search, status, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!notice) return undefined;

    const timer = setTimeout(() => {
      setNotice(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setCustomers([]);
    setPresenceMap({});
    setCurrentPage(1);
    setLoading(true);

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

    if (!await confirmAction(`${actionLabel} tài khoản của ${account.full_name}?`, { title: 'Xác nhận tài khoản', confirmLabel: actionLabel, tone: nextStatus === 'inactive' ? 'danger' : 'primary' })) {
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

  async function openActivityHistory(account) {
    setActivityCustomer(account);
    setActivityData(null);
    setActivityLoading(true);

    try {
      const result = await getCustomerActivityHistory(account.id, {
        activity_limit: 100,
      });
      setActivityData(result);
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
      setActivityCustomer(null);
    } finally {
      setActivityLoading(false);
    }
  }

  async function openTimeline() {
    setTimelineOpen(true);
    setTimelineLoading(true);
    try {
      const activities = await getAdminUserTimeline({ role_id: currentRoleId });
      setTimelineActivities(activities);
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
      setTimelineOpen(false);
    } finally {
      setTimelineLoading(false);
    }
  }

  return (
    <section className="user-management-page">
      <AdminPageHeader
        breadcrumb={["ViVuGo", "Người Dùng", rolePage.breadcrumb]}
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

      <UserFilters
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onTimeline={openTimeline}
      />
      <UserTable
        customers={paginatedCustomers}
        loading={loading}
        showBookings={rolePage.showBookings}
        onView={view}
        onEdit={setEditing}
        onToggleLock={toggleLock}
        onHistory={rolePage.name === "customer" ? openActivityHistory : undefined}
        presenceMap={presenceMap}
        startIndex={pageStartIndex}
      />

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span>Hiển thị <strong className="text-slate-900">{visibleStart}-{visibleEnd}</strong> trên <strong className="text-slate-900">{totalRows}</strong> người dùng</span>
          <label className="flex items-center gap-2">
            <span>Số dòng:</span>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" disabled={safePage <= 1} onClick={() => setCurrentPage(1)} className="rounded-lg border border-slate-200 px-3 py-2 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Đầu</button>
          <button type="button" disabled={safePage <= 1} onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} className="rounded-lg border border-slate-200 px-3 py-2 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Trước</button>
          {pageNumbers.map((page, index) => (
            <span key={page} className="inline-flex items-center gap-1">
              {pageNumbers[index - 1] && page - pageNumbers[index - 1] > 1 ? <span className="px-2 text-slate-400">...</span> : null}
              <button type="button" onClick={() => setCurrentPage(page)} className={`rounded-lg border px-3 py-2 font-bold transition ${safePage === page ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{page}</button>
            </span>
          ))}
          <button type="button" disabled={safePage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} className="rounded-lg border border-slate-200 px-3 py-2 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Sau</button>
          <button type="button" disabled={safePage >= totalPages} onClick={() => setCurrentPage(totalPages)} className="rounded-lg border border-slate-200 px-3 py-2 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Cuối</button>
        </div>
      </div>

      {activityCustomer ? (
        <CustomerActivityModal
          customer={activityCustomer}
          data={activityData}
          loading={activityLoading}
          onClose={() => {
            setActivityCustomer(null);
            setActivityData(null);
          }}
        />
      ) : null}

      {timelineOpen ? (
        <UserTimelineModal
          activities={timelineActivities}
          loading={timelineLoading}
          onClose={() => setTimelineOpen(false)}
        />
      ) : null}

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
