import { useMemo, useState } from "react";

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
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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

function RegisterForm({ values, errors, isSubmitting, onChange, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const livePhoneError = useMemo(() => {
    if (!values.phone) return "";
    if (!/^\d+$/.test(values.phone)) return "Số điện thoại chỉ được nhập số.";
    if (values.phone.length < 10) return "Số điện thoại phải đủ 10 số.";
    if (values.phone.length > 10) return "Số điện thoại chỉ được nhập 10 số.";
    return "";
  }, [values.phone]);

  function handlePhoneChange(event) {
    const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
    onChange({ ...values, phone: digitsOnly }, "phone");
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label>
        Họ và tên
        <input
          type="text"
          value={values.full_name}
          autoComplete="name"
          onChange={(event) =>
            onChange({ ...values, full_name: event.target.value }, "full_name")
          }
        />
        {errors.full_name ? <span>{errors.full_name}</span> : null}
      </label>

      <label>
        Email
        <input
          type="email"
          value={values.email}
          autoComplete="email"
          onChange={(event) => onChange({ ...values, email: event.target.value }, "email")}
        />
        {errors.email ? <span>{errors.email}</span> : null}
      </label>

      <label>
        Số điện thoại
        <input
          type="tel"
          value={values.phone}
          inputMode="numeric"
          maxLength={10}
          pattern="[0-9]*"
          autoComplete="tel"
          onChange={handlePhoneChange}
        />
        {errors.phone ? <span>{errors.phone}</span> : null}
        {!errors.phone && livePhoneError ? <span>{livePhoneError}</span> : null}
      </label>

      <label>
        Mật khẩu
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            value={values.password}
            autoComplete="new-password"
            onChange={(event) =>
              onChange({ ...values, password: event.target.value }, "password")
            }
          />
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? (
              <EyeOffIcon className="password-toggle-icon" />
            ) : (
              <EyeIcon className="password-toggle-icon" />
            )}
          </button>
        </div>
        {errors.password ? <span>{errors.password}</span> : null}
      </label>

      <label>
        Xác nhận mật khẩu
        <div className="password-field">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={values.confirmPassword}
            autoComplete="new-password"
            onChange={(event) =>
              onChange(
                { ...values, confirmPassword: event.target.value },
                "confirmPassword",
              )
            }
          />
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowConfirmPassword((current) => !current)}
            aria-label={
              showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"
            }
          >
            {showConfirmPassword ? (
              <EyeOffIcon className="password-toggle-icon" />
            ) : (
              <EyeIcon className="password-toggle-icon" />
            )}
          </button>
        </div>
        {errors.confirmPassword ? <span>{errors.confirmPassword}</span> : null}
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={values.terms}
          onChange={(event) => onChange({ ...values, terms: event.target.checked }, "terms")}
        />
        Tôi đồng ý với điều khoản dịch vụ du lịch.
      </label>
      {errors.terms ? <span className="field-error">{errors.terms}</span> : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
      </button>
    </form>
  );
}

export default RegisterForm;
