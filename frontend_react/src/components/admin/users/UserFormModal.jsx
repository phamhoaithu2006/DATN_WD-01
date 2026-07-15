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

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(0|\+84)[0-9]{9,10}$/;

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
        role_id: defaultRoleId(roles),
      };
}

function validateUserForm(form, isEditing) {
  const errors = {};
  const fullName = form.full_name.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const password = form.password.trim();

  if (!fullName) {
    errors.full_name = "Vui lòng nhập họ và tên.";
  } else if (fullName.length < 2) {
    errors.full_name = "Họ và tên phải có ít nhất 2 ký tự.";
  } else if (fullName.length > 255) {
    errors.full_name = "Họ và tên không được vượt quá 255 ký tự.";
  }

  if (!email) {
    errors.email = "Vui lòng nhập email.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Email không đúng định dạng.";
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.phone = "Số điện thoại phải bắt đầu bằng 0 hoặc +84 và có 10-11 số.";
  }

  if (!form.role_id) {
    errors.role_id = "Vui lòng chọn vai trò.";
  }

  if (!isEditing && !password) {
    errors.password = "Vui lòng nhập mật khẩu.";
  } else if (password && password.length < 6) {
    errors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
  }

  if (form.avatar) {
    if (!AVATAR_TYPES.includes(form.avatar.type)) {
      errors.avatar = "Ảnh đại diện chỉ nhận JPG, PNG hoặc WebP.";
    } else if (form.avatar.size > MAX_AVATAR_SIZE) {
      errors.avatar = "Ảnh đại diện không được vượt quá 5MB.";
    }
  }

  return errors;
}

function UserFormModal({
  customer,
  roles = [],
  selectedRoleId = "",
  entityLabel = "người dùng",
  entityDescription = "Thông tin tài khoản người dùng ViVuGo",
  saving,
  onClose,
  onSave,
  showAvatar = true,
}) {
  const [form, setForm] = useState(() =>
    customer
      ? formFromCustomer(customer, roles)
      : {
          ...emptyForm,
          role_id: selectedRoleId || defaultRoleId(roles),
        },
  );
  const [avatarPreview, setAvatarPreview] = useState(() => mediaUrl(customer?.avatar_url));
  const [avatarName, setAvatarName] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const change = (key) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const changeAvatar = (event) => {
    const file = event.target.files?.[0] || null;

    setForm((current) => ({ ...current, avatar: file }));
    setAvatarPreview(file ? URL.createObjectURL(file) : mediaUrl(customer?.avatar_url));
    setAvatarFailed(false);
    setAvatarName(file?.name || "");
    setErrors((current) => ({ ...current, avatar: undefined }));
  };

  const canShowAvatar = avatarPreview && !avatarFailed;
  const fieldClass = (key) => (errors[key] ? "is-invalid" : undefined);
  const errorFor = (key) =>
    errors[key] ? <small className="user-field-error">{errors[key]}</small> : null;
  const modalTitle = customer ? `Cập nhật ${entityLabel}` : `Thêm ${entityLabel}`;
  const submitLabel = customer ? "Lưu thay đổi" : `Thêm ${entityLabel}`;

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = validateUserForm(form, Boolean(customer));

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      ...form,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password.trim(),
      role_id: form.role_id ? Number(form.role_id) : "",
    });
  };

  return (
    <div className="user-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="user-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} noValidate>
        <div className="user-modal-heading">
          <div>
            <h2>{modalTitle}</h2>
            <p>{entityDescription}</p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {showAvatar ? (
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
                {errorFor("avatar")}
              </div>
            </div>
          </div>
        ) : null}

        <div className="user-form-grid">
          <label>
            Họ và tên <span className="text-rose-500">*</span>
            <input
              className={fieldClass("full_name")}
              value={form.full_name}
              onChange={change("full_name")}
            />
            {errorFor("full_name")}
          </label>
          <label>
            Email <span className="text-rose-500">*</span>
            <input
              className={fieldClass("email")}
              type="email"
              value={form.email}
              onChange={change("email")}
            />
            {errorFor("email")}
          </label>
          <label>
            Số điện thoại
            <input
              className={fieldClass("phone")}
              value={form.phone}
              onChange={change("phone")}
            />
            {errorFor("phone")}
          </label>
          <label>
            Vai trò <span className="text-rose-500">*</span>
            <select className={fieldClass("role_id")} value={form.role_id} onChange={change("role_id")}>
              <option value="">Chọn vai trò</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            {errorFor("role_id")}
          </label>
          <label>
            {customer ? (
              "Mật khẩu mới (không bắt buộc)"
            ) : (
              <>
                Mật khẩu <span className="text-rose-500">*</span>
              </>
            )}
            <div className="user-password-field">
              <input
                className={fieldClass("password")}
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
            {errorFor("password")}
          </label>
        </div>

        <div className="user-modal-actions">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary" disabled={saving} type="submit">
            {saving ? "Đang lưu..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserFormModal;
