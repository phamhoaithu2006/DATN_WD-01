function LoginForm({ values, errors, isSubmitting, onChange, onSubmit }) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label>
        Email
        <input
          type="email"
          value={values.email}
          placeholder="admin@vivugo.vn"
          onChange={(event) =>
            onChange({ ...values, email: event.target.value })
          }
        />
        {errors.email ? <span>{errors.email}</span> : null}
      </label>

      <label>
        Mật khẩu
        <input
          type="password"
          value={values.password}
          placeholder="password"
          onChange={(event) =>
            onChange({ ...values, password: event.target.value })
          }
        />
        {errors.password ? <span>{errors.password}</span> : null}
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={values.remember}
          onChange={(event) =>
            onChange({ ...values, remember: event.target.checked })
          }
        />
        Ghi nhớ đăng nhập trên trình duyệt này
      </label>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <p className="helper-text">Tài khoản admin: admin@vivugo.vn / password</p>
    </form>
  );
}

export default LoginForm;
