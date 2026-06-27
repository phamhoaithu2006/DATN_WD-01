import { useState } from "react";
import { Link } from "react-router-dom";

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

function LoginForm({ values, errors, isSubmitting, onChange, onBlur, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label>
        Email hoặc SĐT
        <input
          type="text"
          value={values.identifier}
          autoComplete="username"
          inputMode="text"
          onChange={(event) =>
            onChange({ ...values, identifier: event.target.value }, "identifier")
          }
          onBlur={() => onBlur?.("identifier")}
        />
        {errors.identifier ? <span>{errors.identifier}</span> : null}
      </label>

      <label>
        Mật khẩu
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            value={values.password}
            autoComplete="current-password"
            onChange={(event) =>
              onChange({ ...values, password: event.target.value }, "password")
            }
            onBlur={() => onBlur?.("password")}
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

      <div className="auth-links-row">
        <label className="check-row">
          <input
            type="checkbox"
            checked={values.remember}
            onChange={(event) =>
              onChange({ ...values, remember: event.target.checked }, "remember")
            }
          />
          <span className="remember-text">Ghi nhớ đăng nhập trên trình duyệt</span>
        </label>
        <Link className="forgot-link" to="/auth/forgot-password">
          Quên mật khẩu?
        </Link>
      </div>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <p className="helper-text">
        Chưa có tài khoản? <Link to="/auth/register">Đăng ký ngay</Link>
      </p>
    </form>
  );
}

export default LoginForm;
