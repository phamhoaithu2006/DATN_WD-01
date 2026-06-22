import { useEffect, useState } from "react";
import { roleLabel } from "../../../utils/accountRoles";

function UserFormModal({ account, roles, saving, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role_id: "",
  });
  useEffect(() => {
    setForm(
      account
        ? {
            full_name: account.full_name,
            email: account.email,
            phone: account.phone || "",
            password: "",
            role_id: account.role_id,
          }
        : {
            full_name: "",
            email: "",
            phone: "",
            password: "",
            role_id: roles[0]?.id || "",
          },
    );
  }, [account, roles]);
  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  return (
    <div className="user-modal-backdrop" onMouseDown={onClose}>
      <form
        className="user-modal"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="user-modal-heading">
          <div>
            <h2>{account ? "Cập nhật tài khoản" : "Thêm người dùng"}</h2>
            <p>Nhập thông tin và phân quyền tài khoản</p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="user-form-grid">
          <label>
            Họ và tên
            <input
              required
              value={form.full_name}
              onChange={change("full_name")}
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={change("email")}
            />
          </label>
          <label>
            Số điện thoại
            <input value={form.phone} onChange={change("phone")} />
          </label>
          <label>
            Vai trò
            <select required value={form.role_id} onChange={change("role_id")}>
              {roles.map((role) => (
                <option value={role.id} key={role.id}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {account ? "Mật khẩu mới (không bắt buộc)" : "Mật khẩu"}
            <input
              required={!account}
              minLength="6"
              type="password"
              value={form.password}
              onChange={change("password")}
            />
          </label>
        </div>
        <div className="user-modal-actions">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu tài khoản"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserFormModal;
