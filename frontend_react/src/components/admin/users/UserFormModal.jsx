import { useEffect, useState } from "react";
import { roleLabel } from "../../../utils/accountRoles";

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role_id: "",
};

function defaultRoleId(roles) {
  const customerRole = roles.find((role) => role.name === "customer");
  return String(customerRole?.id || roles[0]?.id || "");
}

function UserFormModal({ customer, roles = [], saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(
      customer
        ? {
            full_name: customer.full_name || "",
            email: customer.email || "",
            phone: customer.phone || "",
            password: "",
            role_id: customer.role_id ? String(customer.role_id) : defaultRoleId(roles),
          }
        : {
            ...emptyForm,
            role_id: defaultRoleId(roles),
          },
    );
  }, [customer, roles]);

  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div
      className="user-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="user-modal"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...form,
            role_id: form.role_id ? Number(form.role_id) : "",
          });
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="user-modal-heading">
          <div>
            <h2>{customer ? "Cập nhật người dùng" : "Thêm người dùng"}</h2>
            <p>Thông tin tài khoản người dùng ViVuGo</p>
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
              placeholder="Nguyễn Văn An"
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={change("email")}
              placeholder="email@example.com"
            />
          </label>
          <label>
            Số điện thoại
            <input
              value={form.phone}
              onChange={change("phone")}
              placeholder="09xx xxx xxx"
            />
          </label>
          <label>
            Vai trò
            <select
              required
              value={form.role_id}
              onChange={change("role_id")}
            >
              <option value="">Chọn vai trò</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {customer ? "Mật khẩu mới (không bắt buộc)" : "Mật khẩu"}
            <input
              required={!customer}
              minLength="6"
              type="password"
              value={form.password}
              onChange={change("password")}
              placeholder="Tối thiểu 6 ký tự"
            />
          </label>
        </div>
        <div className="user-modal-actions">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary" disabled={saving} type="submit">
            {saving
              ? "Đang lưu..."
              : customer
                ? "Lưu thay đổi"
                : "Thêm người dùng"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserFormModal;
