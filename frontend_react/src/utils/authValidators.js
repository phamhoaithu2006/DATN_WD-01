const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^(0|\+84)?[0-9]{9,10}$/

export function validateLogin(values) {
  const errors = {}
  const rawValue = values.identifier.trim()
  const normalizedPhone = rawValue.replace(/\s+/g, '')

  if (!rawValue) {
    errors.identifier = "Vui lòng nhập email hoặc SĐT."
  } else if (!emailPattern.test(rawValue) && !phonePattern.test(normalizedPhone)) {
    errors.identifier = "Email hoặc SĐT chưa đúng định dạng."
  }

  if (!values.password) {
    errors.password = "Vui lòng nhập mật khẩu."
  } else if (values.password.length < 8) {
    errors.password = "Mật khẩu cần ít nhất 8 ký tự."
  }

  return errors
}

export function validateRegister(values) {
  const errors = {}
  const normalizedEmail = values.email.trim().toLowerCase()
  const normalizedPhone = values.phone.trim()
  const normalizedName = values.full_name.trim()

  if (!normalizedName) {
    errors.full_name = "Vui lòng nhập họ và tên."
  } else if (!/^[\p{L}\s.'-]+$/u.test(normalizedName)) {
    errors.full_name = "Họ tên chỉ nên gồm chữ cái và khoảng trắng."
  }

  if (!normalizedEmail) {
    errors.email = "Vui lòng nhập email."
  } else if (!emailPattern.test(normalizedEmail)) {
    errors.email = "Email chưa đúng định dạng."
  }

  if (!normalizedPhone) {
    errors.phone = "Vui lòng nhập số điện thoại."
  } else if (!/^\d{10}$/.test(normalizedPhone)) {
    errors.phone = "Số điện thoại phải đủ đúng 10 số."
  } else if (!phonePattern.test(normalizedPhone)) {
    errors.phone = "Số điện thoại chưa hợp lệ."
  }

  if (!values.password) {
    errors.password = "Vui lòng nhập mật khẩu."
  } else if (values.password.length < 8) {
    errors.password = "Mật khẩu cần ít nhất 8 ký tự."
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu."
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Mật khẩu xác nhận không khớp."
  }

  if (!values.terms) {
    errors.terms = "Bạn cần đồng ý điều khoản để tiếp tục."
  }

  return errors
}
