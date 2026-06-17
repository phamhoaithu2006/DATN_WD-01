import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../../components/auth/AuthCard'
import UserDashboard from '../../components/auth/UserDashboard'
import AuthLayout from '../../layouts/AuthLayout'
import { login as loginApi, logout as logoutApi } from '../../services/authApi'
import {
  clearSession,
  readSession,
  readUsers,
  saveSession,
  saveToken,
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
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [users, setUsers] = useState(readUsers)
  const [currentUser, setCurrentUser] = useState(readSession)
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  async function handleLogin(event) {
    event.preventDefault()
    const errors = validateLogin(loginData)
    setLoginErrors(errors)
    setNotice('')

    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)

    try {
      const data = await loginApi(loginData.email.trim(), loginData.password)
      const roleName = data.user?.role?.name

      if (roleName !== 'admin') {
        clearSession()
        setNotice('Tai khoan nay khong co quyen vao trang admin.')
        return
      }

      const sessionUser = {
        id: data.user.id,
        name: data.user.full_name || data.user.name || data.user.email,
        email: data.user.email,
        phone: data.user.phone,
        role: roleName,
      }

      saveToken(data.token)
      saveSession(sessionUser)
      setCurrentUser(sessionUser)
      setNotice('Dang nhap thanh cong.')
      navigate('/admin', { replace: true })
    } catch (error) {
      setNotice(
        error.response?.data?.message ||
          'Khong dang nhap duoc. Vui long kiem tra API Laravel.',
      )
    } finally {
      setIsSubmitting(false)
    }
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
    setNotice('Tao tai khoan thanh cong. Hay dang nhap de bat dau.')
  }

  async function handleLogout() {
    try {
      await logoutApi()
    } catch {
      // Token may already be expired; local logout still needs to happen.
    }

    setCurrentUser(null)
    clearSession()
    setNotice('Ban da dang xuat.')
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
          isSubmitting={isSubmitting}
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
