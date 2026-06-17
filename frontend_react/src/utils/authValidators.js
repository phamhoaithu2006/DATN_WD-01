const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^(0|\+84)[0-9]{9,10}$/

export function validateLogin(values) {
  const errors = {}

  if (!values.email.trim()) {
    errors.email = 'Vui lòng nhập email.'
  } else if (!emailPattern.test(values.email)) {
    errors.email = 'Email chưa đúng định dạng.'
  }

  if (!values.password) {
    errors.password = 'Vui lòng nhập mật khẩu.'
  }

  return errors
}

export function validateRegister(values, users) {
  const errors = {}
  const normalizedEmail = values.email.trim().toLowerCase()

  if (values.full_name.trim().length < 2) {
    errors.full_name = 'Họ tên cần ít nhất 2 ký tự.'
  }

  if (!normalizedEmail) {
    errors.email = 'Vui lòng nhập email.'
  } else if (!emailPattern.test(normalizedEmail)) {
    errors.email = 'Email chưa đúng định dạng.'
  } else if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    errors.email = 'Email này đã được đăng ký.'
  }

  if (!phonePattern.test(values.phone.trim())) {
    errors.phone = 'Số điện thoại chưa hợp lệ.'
  }

  if (values.password.length < 8) {
    errors.password = 'Mật khẩu cần ít nhất 8 ký tự.'
  } else if (!/(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
    errors.password = 'Mật khẩu cần có chữ hoa và số.'
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
  }

  if (!values.terms) {
    errors.terms = 'Bạn cần đồng ý điều khoản để tiếp tục.'
  }

  return errors
}
