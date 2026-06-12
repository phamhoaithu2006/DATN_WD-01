import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

function AuthCard({
  mode,
  notice,
  loginData,
  loginErrors,
  registerData,
  registerErrors,
  onModeChange,
  onLoginChange,
  onRegisterChange,
  onLoginSubmit,
  onRegisterSubmit,
}) {
  return (
    <div className="form-card">
      <div className="tabs" role="tablist" aria-label="Chọn chức năng">
        <button
          className={mode === 'login' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => onModeChange('login')}
        >
          Đăng nhập
        </button>
        <button
          className={mode === 'register' ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => onModeChange('register')}
        >
          Đăng ký
        </button>
      </div>

      {notice ? <p className="notice">{notice}</p> : null}

      {mode === 'login' ? (
        <LoginForm
          values={loginData}
          errors={loginErrors}
          onChange={onLoginChange}
          onSubmit={onLoginSubmit}
        />
      ) : (
        <RegisterForm
          values={registerData}
          errors={registerErrors}
          onChange={onRegisterChange}
          onSubmit={onRegisterSubmit}
        />
      )}
    </div>
  )
}

export default AuthCard
