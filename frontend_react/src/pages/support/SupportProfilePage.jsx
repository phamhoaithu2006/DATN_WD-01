import { useEffect, useMemo, useState } from 'react'
import {
  changeSupportPassword,
  getSupportProfile,
  updateSupportProfile,
} from '../../services/supportProfileApi'

const emptyProfileForm = {
  full_name: '',
  email: '',
  phone: '',
  status: 'active',
}

const emptyPasswordForm = {
  old_password: '',
  new_password: '',
  new_password_confirmation: '',
}

const SUPPORT_SPECIALIZATION_LABELS = {
  noi_dia: 'Nội địa',
  quoc_te: 'Quốc tế',
}

function getInitials(name) {
  return String(name || 'NV')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback
}

function formatSupportSpecialization(value) {
  const key = String(value || '').trim().toLowerCase()
  return SUPPORT_SPECIALIZATION_LABELS[key] || value || 'Chưa cập nhật'
}

function SupportProfilePage() {
  const [supportProfile, setSupportProfile] = useState(null)
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const user = supportProfile?.support_staff?.user || supportProfile || {}
  const supportStaff = supportProfile?.support_staff || null
  const displayName = user.full_name || supportStaff?.name || 'Nhân viên hỗ trợ'
  const avatarUrl = user.avatar_url || supportStaff?.avatar_url || ''
  const code = supportStaff?.id ? `NV${String(supportStaff.id).padStart(3, '0')}` : '—'
  const specializationLabel = formatSupportSpecialization(supportStaff?.specialization)
  const experienceYearsLabel =
    supportStaff?.experience_years === null || supportStaff?.experience_years === undefined
      ? 'Chưa cập nhật'
      : `${supportStaff.experience_years} năm`

  const statusLabel = useMemo(() => {
    switch (supportStaff?.status) {
      case 'active':
        return 'Đang hoạt động'
      case 'inactive':
        return 'Ngừng hoạt động'
      case 'hidden':
        return 'Tạm khóa'
      default:
        return supportStaff?.status || 'Chưa rõ'
    }
  }, [supportStaff])

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')

      try {
        const data = await getSupportProfile()
        if (!active) return

        setSupportProfile(data)
        const account = data?.support_staff?.user || data || {}

        setProfileForm({
          full_name: account.full_name || '',
          email: account.email || '',
          phone: account.phone || '',
          status: data?.support_staff?.status || 'active',
        })
      } catch (loadError) {
        if (!active) return
        setError(getErrorMessage(loadError, 'Không thể tải hồ sơ nhân viên hỗ trợ.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [])

  function handleProfileChange(event) {
    const { name, value } = event.target
    setProfileForm((current) => ({ ...current, [name]: value }))
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target
    setPasswordForm((current) => ({ ...current, [name]: value }))
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setSavingProfile(true)
    setMessage('')
    setError('')

    try {
      await updateSupportProfile(profileForm)
      const refreshed = await getSupportProfile()
      setSupportProfile(refreshed)
      setMessage('Đã cập nhật thông tin nhân viên hỗ trợ.')
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Cập nhật thông tin thất bại.'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setSavingPassword(true)
    setMessage('')
    setError('')

    try {
      await changeSupportPassword(passwordForm)
      setPasswordForm(emptyPasswordForm)
      setMessage('Đã đổi mật khẩu thành công.')
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Đổi mật khẩu thất bại.'))
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="guide-profile-page">
        <div className="guide-profile-loading">Đang tải hồ sơ nhân viên hỗ trợ...</div>
      </div>
    )
  }

  return (
    <div className="guide-profile-page">
      <section className="guide-profile-hero">
        <div className="guide-profile-identity">
          <div className="guide-profile-avatar">
            {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : <span>{getInitials(displayName)}</span>}
          </div>
          <div>
            <span className="guide-profile-kicker">Hồ sơ cá nhân</span>
            <h1>{displayName}</h1>
            <p>{code}</p>
          </div>
        </div>

        <div className="guide-profile-rating-box">
          <span>Trạng thái</span>
          <strong>{statusLabel}</strong>
        </div>
      </section>

      {(message || error) && (
        <div className={error ? 'guide-profile-alert is-error' : 'guide-profile-alert'}>
          {error || message}
        </div>
      )}

      <section className="guide-profile-grid">
        <form className="guide-profile-panel" onSubmit={handleProfileSubmit}>
          <div className="guide-profile-panel-header">
            <div>
              <h2>Thông tin liên hệ</h2>
              <p>Cập nhật thông tin cá nhân đang hiển thị trong hệ thống.</p>
            </div>
            <span className={`guide-profile-status status-${profileForm.status}`}>
              {profileForm.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
            </span>
          </div>

          <div className="guide-profile-form-grid">
            <label className="guide-field">
              <span>Họ và tên</span>
              <input
                name="full_name"
                value={profileForm.full_name}
                onChange={handleProfileChange}
                placeholder="Nhập họ và tên"
              />
            </label>

            <label className="guide-field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                placeholder="email@example.com"
              />
            </label>

            <label className="guide-field">
              <span>Số điện thoại</span>
              <input
                name="phone"
                value={profileForm.phone}
                onChange={handleProfileChange}
                placeholder="Nhập số điện thoại"
              />
            </label>

            <label className="guide-field">
              <span>Trạng thái</span>
              <select name="status" value={profileForm.status} onChange={handleProfileChange}>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
            </label>
          </div>

          <button className="guide-primary-button" type="submit" disabled={savingProfile}>
            {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>

        <aside className="guide-profile-side">
          <div className="guide-profile-panel compact">
            <h2>Chuyên môn</h2>
            <div className="guide-chip-list">
              <span className="guide-chip">{specializationLabel}</span>
            </div>
          </div>

          <div className="guide-profile-panel compact">
            <h2>Số năm kinh nghiệm</h2>
            <div className="guide-detail-stack">
              <div className="guide-detail-item is-tight">
                <strong>{experienceYearsLabel}</strong>
              </div>
            </div>
          </div>

          <form className="guide-profile-panel compact" onSubmit={handlePasswordSubmit}>
            <h2>Đổi mật khẩu</h2>
            <label className="guide-field">
              <span>Mật khẩu cũ</span>
              <input
                name="old_password"
                type="password"
                value={passwordForm.old_password}
                onChange={handlePasswordChange}
              />
            </label>
            <label className="guide-field">
              <span>Mật khẩu mới</span>
              <input
                name="new_password"
                type="password"
                minLength="6"
                value={passwordForm.new_password}
                onChange={handlePasswordChange}
              />
            </label>
            <label className="guide-field">
              <span>Xác nhận mật khẩu mới</span>
              <input
                name="new_password_confirmation"
                type="password"
                minLength="6"
                value={passwordForm.new_password_confirmation}
                onChange={handlePasswordChange}
              />
            </label>
            <button className="guide-secondary-button" type="submit" disabled={savingPassword}>
              {savingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </aside>
      </section>
    </div>
  )
}

export default SupportProfilePage
