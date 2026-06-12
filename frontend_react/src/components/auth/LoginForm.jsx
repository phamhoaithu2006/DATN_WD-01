function LoginForm({ values, errors, onChange, onSubmit }) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label>
        Email
        <input
          type="email"
          value={values.email}
          placeholder="demo@skytrail.vn"
          onChange={(event) => onChange({ ...values, email: event.target.value })}
        />
        {errors.email ? <span>{errors.email}</span> : null}
      </label>

      <label>
        Mật khẩu
        <input
          type="password"
          value={values.password}
          placeholder="Demo@123"
          onChange={(event) => onChange({ ...values, password: event.target.value })}
        />
        {errors.password ? <span>{errors.password}</span> : null}
      </label>

      <button className="primary-button" type="submit">
        Đăng nhập
      </button>
      <p className="helper-text">Tài khoản demo: demo@skytrail.vn / Demo@123</p>
    </form>
  )
}

export default LoginForm
