function RegisterForm({ values, errors, onChange, onSubmit }) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label>
        Họ và tên
        <input
          type="text"
          value={values.full_name}
          placeholder="Nguyễn Minh Anh"
          onChange={(event) => onChange({ ...values, full_name: event.target.value })}
        />
        {errors.full_name ? <span>{errors.full_name}</span> : null}
      </label>

      <label>
        Email
        <input
          type="email"
          value={values.email}
          placeholder="ban@skytrail.vn"
          onChange={(event) => onChange({ ...values, email: event.target.value })}
        />
        {errors.email ? <span>{errors.email}</span> : null}
      </label>

      <label>
        Số điện thoại
        <input
          type="tel"
          value={values.phone}
          placeholder="0901234567"
          onChange={(event) => onChange({ ...values, phone: event.target.value })}
        />
        {errors.phone ? <span>{errors.phone}</span> : null}
      </label>

      <label>
        Mật khẩu
        <input
          type="password"
          value={values.password}
          placeholder="Ít nhất 8 ký tự"
          onChange={(event) => onChange({ ...values, password: event.target.value })}
        />
        {errors.password ? <span>{errors.password}</span> : null}
      </label>

      <label>
        Xác nhận mật khẩu
        <input
          type="password"
          value={values.confirmPassword}
          placeholder="Nhập lại mật khẩu"
          onChange={(event) =>
            onChange({ ...values, confirmPassword: event.target.value })
          }
        />
        {errors.confirmPassword ? <span>{errors.confirmPassword}</span> : null}
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={values.terms}
          onChange={(event) => onChange({ ...values, terms: event.target.checked })}
        />
        Tôi đồng ý với điều khoản dịch vụ du lịch.
      </label>
      {errors.terms ? <span className="field-error">{errors.terms}</span> : null}

      <button className="primary-button" type="submit">
        Tạo tài khoản
      </button>
    </form>
  )
}

export default RegisterForm
