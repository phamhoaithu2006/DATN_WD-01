import { useState } from "react";
import { roleLabel } from "../../../utils/accountRoles";
import { mediaUrl } from "../../../utils/mediaUrl";

function EyeIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M10.6 5.4A9.5 9.5 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17.6 17.6 0 0 1-2.9 4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.1 6.8C3.7 8.7 2.5 12 2.5 12S6 18.5 12 18.5c1 0 2-.2 2.9-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role_id: "",
  avatar: null,
};

function defaultRoleId(roles) {
  const customerRole = roles.find((role) => role.name === "customer");
  return String(customerRole?.id || roles[0]?.id || "");
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "ND"
  );
}

function formFromCustomer(customer, roles) {
  return customer
    ? {
        full_name: customer.full_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        password: "",
        role_id: customer.role_id ? String(customer.role_id) : defaultRoleId(roles),
        avatar: null,
      }
    : {
        ...emptyForm,
        role_id: "",
      };
}

function UserFormModal({ customer, roles = [], saving, onClose, onSave }) {
  const [form, setForm] = useState(() => formFromCustomer(customer, roles));
  const [avatarPreview, setAvatarPreview] = useState(() => mediaUrl(customer?.avatar_url));
  const [avatarName, setAvatarName] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const changeAvatar = (event) => {
    const file = event.target.files?.[0] || null;

    setForm((current) => ({ ...current, avatar: file }));
    setAvatarPreview(file ? URL.createObjectURL(file) : mediaUrl(customer?.avatar_url));
    setAvatarFailed(false);
    setAvatarName(file?.name || "");
  };

  const canShowAvatar = avatarPreview && !avatarFailed;

  return (
    <div className="user-modal-backdrop" role="presentation" onMouseDown={onClose}>
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

        <div className="user-avatar-field">
          <span>Ảnh đại diện</span>
          <div className="user-avatar-picker">
            <span className={`user-avatar user-avatar-preview ${canShowAvatar ? "is-image" : "blue"}`}>
              {canShowAvatar ? (
                <img
                  src={avatarPreview}
                  alt={form.full_name || "Ảnh đại diện"}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                initials(form.full_name)
              )}
            </span>
            <div className="user-avatar-upload">
              <label className="user-avatar-upload-button">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  type="file"
                  onChange={changeAvatar}
                />
                <span>{customer ? "Đổi ảnh" : "Chọn ảnh"}</span>
              </label>
              <small>
                {avatarName ||
                  (customer?.avatar_url ? "Đang dùng ảnh hiện tại" : "JPG, PNG hoặc WebP")}
              </small>
            </div>
          </div>
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
            <select required value={form.role_id} onChange={change("role_id")}>
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
            <div className="user-password-field">
              <input
                required={!customer}
                minLength="6"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={change("password")}
                placeholder="Tối thiểu 6 ký tự"
              />
              <button
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="user-password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? (
                  <EyeOffIcon className="user-password-toggle-icon" />
                ) : (
                  <EyeIcon className="user-password-toggle-icon" />
                )}
              </button>
            </div>
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
