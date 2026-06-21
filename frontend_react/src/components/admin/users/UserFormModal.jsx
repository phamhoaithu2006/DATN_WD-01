import { useEffect, useState } from "react";

const emptyForm = { full_name: "", email: "", phone: "", password: "" };

function UserFormModal({ customer, saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(
      customer
        ? {
            full_name: customer.full_name,
            email: customer.email,
            phone: customer.phone || "",
            password: "",
          }
        : emptyForm,
    );
  }, [customer]);

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
          onSave(form);
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="user-modal-heading">
          <div>
            <h2>{customer ? "Cập nhật khách hàng" : "Thêm người dùng"}</h2>
            <p>Thông tin tài khoản khách hàng ViVuGo</p>
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
