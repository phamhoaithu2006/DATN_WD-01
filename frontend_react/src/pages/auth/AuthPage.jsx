import { useMemo, useState } from 'react'
import AuthCard from '../../components/auth/AuthCard'
import UserDashboard from '../../components/auth/UserDashboard'
import AuthLayout from '../../layouts/AuthLayout'
import {
  clearSession,
  readSession,
  readUsers,
  saveSession,
  saveUsers,
} from '../../services/authStorage'
import { validateLogin, validateRegister } from '../../utils/authValidators'
import '../../styles/auth.css'

const emptyRegisterForm = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  terms: false,
}

function AuthPage() {
  const [mode, setMode] = useState('login')
  const [users, setUsers] = useState(readUsers)
  const [currentUser, setCurrentUser] = useState(readSession)
  const [notice, setNotice] = useState('')
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [registerData, setRegisterData] = useState(emptyRegisterForm)
  const [loginErrors, setLoginErrors] = useState({})
  const [registerErrors, setRegisterErrors] = useState({})

  const welcomeName = useMemo(() => {
    if (!currentUser?.full_name) return ''
    return currentUser.full_name.split(' ')[0]
  }, [currentUser])

  function persistUsers(nextUsers) {
    setUsers(nextUsers)
    saveUsers(nextUsers)
  }

  function handleModeChange(nextMode) {
    setMode(nextMode)
    setNotice('')
  }

  function handleLogin(event) {
    event.preventDefault()
    const errors = validateLogin(loginData)
    setLoginErrors(errors)
    setNotice('')

    if (Object.keys(errors).length > 0) return

    const foundUser = users.find(
      (user) =>
        user.email.toLowerCase() === loginData.email.trim().toLowerCase() &&
        user.password === loginData.password,
    )

    if (!foundUser) {
      setNotice('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.')
      return
    }

    const sessionUser = {
      full_name: foundUser.full_name,
      email: foundUser.email,
      phone: foundUser.phone,
    }
    setCurrentUser(sessionUser)
    saveSession(sessionUser)
    setNotice('Đăng nhập thành công.')
  }

  function handleRegister(event) {
    event.preventDefault()
    const errors = validateRegister(registerData, users)
    setRegisterErrors(errors)
    setNotice('')

    if (Object.keys(errors).length > 0) return

    const nextUser = {
      full_name: registerData.full_name.trim(),
      email: registerData.email.trim().toLowerCase(),
      phone: registerData.phone.trim(),
      password: registerData.password,
    }

    persistUsers([...users, nextUser])
    setLoginData({ email: nextUser.email, password: '' })
    setRegisterData(emptyRegisterForm)
    setMode('login')
    setNotice('Tạo tài khoản thành công. Hãy đăng nhập để bắt đầu.')
  }

  function handleLogout() {
    setCurrentUser(null)
    clearSession()
    setNotice('Bạn đã đăng xuất.')
    setMode('login')
  }

  return (
    <AuthLayout currentUser={currentUser} onLogout={handleLogout}>
      {currentUser ? (
        <UserDashboard
          user={currentUser}
          welcomeName={welcomeName}
          onLogout={handleLogout}
        />
      ) : (
        <AuthCard
          mode={mode}
          notice={notice}
          loginData={loginData}
          loginErrors={loginErrors}
          registerData={registerData}
          registerErrors={registerErrors}
          onModeChange={handleModeChange}
          onLoginChange={setLoginData}
          onRegisterChange={setRegisterData}
          onLoginSubmit={handleLogin}
          onRegisterSubmit={handleRegister}
        />
      )}
    </AuthLayout>
  )
}

export default AuthPage
