import { useCallback, useEffect, useState } from "react";
import UserDetailModal from "../../components/admin/users/UserDetailModal";
import UserFilters from "../../components/admin/users/UserFilters";
import UserFormModal from "../../components/admin/users/UserFormModal";
import UserStats from "../../components/admin/users/UserStats";
import UserTable from "../../components/admin/users/UserTable";
import {
  createCustomer,
  getCustomer,
  getCustomers,
  getCustomerStatistics,
  setCustomerLocked,
  updateCustomer,
} from "../../services/adminCustomerApi";
import "../../styles/user-management.css";

function messageFrom(error) {
  const errors = error.response?.data?.errors;
  return errors
    ? Object.values(errors).flat()[0]
    : error.response?.data?.message ||
        "Không thể xử lý yêu cầu. Vui lòng thử lại.";
}

function UserManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(undefined);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([
        getCustomers({
          search: search.trim() || undefined,
          status: status || undefined,
        }),
        getCustomerStatistics(),
      ]);
      setCustomers(list);
      setStatistics(stats);
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function save(form) {
    setSaving(true);
    try {
      const response = editing
        ? await updateCustomer(editing.id, form)
        : await createCustomer(form);
      setNotice({ type: "success", text: response.message });
      setEditing(undefined);
      await load();
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
    } finally {
      setSaving(false);
    }
  }

  async function view(customer) {
    try {
      setDetail(await getCustomer(customer.id));
    } catch (error) {
      setNotice({ type: "error", text: messageFrom(error) });
    }
  }

  async function toggleLock(customer) {
    const locking = customer.status === "active";
    if (
      !window.confirm(
        `${locking ? "Khóa" : "Mở khóa"} tài khoản của ${customer.full_name}?`,
      )
    )
      return;
    try {
      const response = await setCustomerLocked(customer.id, locking);
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
          <p>Quản lý tài khoản khách hàng trên hệ thống ViVuGo</p>
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
      <UserStats statistics={statistics} />
      <UserFilters
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
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
