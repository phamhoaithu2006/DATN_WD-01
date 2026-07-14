import { useEffect, useMemo, useState } from 'react'
import {
  changeGuidePassword,
  getGuideProfile,
  updateGuideProfile,
} from '../../services/guideProfileApi'

const emptyProfileForm = {
  full_name: '',
  email: '',
  phone: '',
  experience_years: 0,
  status: 'active',
}

const emptyPasswordForm = {
  old_password: '',
  new_password: '',
  new_password_confirmation: '',
}

function getInitials(name) {
  return String(name || 'HDV')
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

function normalizeGuidePayload(payload) {
  if (!payload) return null

  return {
    ...payload,
    guideLanguages: payload.guideLanguages || payload.guide_languages || [],
    certificates: payload.certificates || [],
  }
}

function GuideProfilePage() {
  const [guide, setGuide] = useState(null)
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const user = guide?.user || {}
  const displayName = user.full_name || profileForm.full_name || 'Hướng dẫn viên'
  const avatarUrl = user.avatar_url || guide?.avatar_url || ''

  const certificateList = useMemo(
    () => (guide?.certificates || []).filter((item) => item?.name),
    [guide],
  )

  const languageList = useMemo(
    () => (guide?.guideLanguages || []).filter((item) => item?.name),
    [guide],
  )

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')

      try {
        const data = normalizeGuidePayload(await getGuideProfile())

        if (!active) return

        setGuide(data)
        setProfileForm({
          full_name: data?.user?.full_name || '',
          email: data?.user?.email || '',
          phone: data?.user?.phone || '',
          experience_years: data?.experience_years ?? 0,
          status: data?.status || 'active',
        })
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Không thể tải hồ sơ hướng dẫn viên.'))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [])

  function handleProfileChange(event) {
    const { name, value } = event.target
    setProfileForm((current) => ({
      ...current,
      [name]: name === 'experience_years' ? Number(value) : value,
    }))
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
      const response = await updateGuideProfile(profileForm)
      const refreshed = normalizeGuidePayload(await getGuideProfile())

      setGuide(refreshed)
      setMessage(response.message || 'Đã cập nhật hồ sơ hướng dẫn viên.')
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Cập nhật hồ sơ thất bại.'))
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
      const response = await changeGuidePassword(passwordForm)
      setPasswordForm(emptyPasswordForm)
      setMessage(response.message || 'Đã đổi mật khẩu thành công.')
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Đổi mật khẩu thất bại.'))
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="guide-profile-page">
        <div className="guide-profile-loading">Đang tải hồ sơ hướng dẫn viên...</div>
      </div>
    )
  }

  return (
    <div className="guide-profile-page">
      <section className="guide-profile-hero">
        <div className="guide-profile-identity">
          <div className="guide-profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              <span>{getInitials(displayName)}</span>
            )}
          </div>
          <div>
            <span className="guide-profile-kicker">Hồ sơ cá nhân</span>
            <h1>{displayName}</h1>
            <p>{guide?.guide_code || 'Chưa có mã HDV'}</p>
          </div>
        </div>

        <div className="guide-profile-rating-box">
          <span>Điểm đánh giá</span>
          <strong>{Number(guide?.average_rating || 0).toFixed(1)}</strong>
          <small>{guide?.review_count || 0} lượt đánh giá</small>
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
              <span>Số năm kinh nghiệm</span>
              <input
                name="experience_years"
                type="number"
                min="0"
                value={profileForm.experience_years}
                onChange={handleProfileChange}
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
            <h2>Ngôn ngữ</h2>
            <div className="guide-chip-list">
              {languageList.length > 0 ? (
                languageList.map((language) => (
                  <span className="guide-chip" key={language.id}>
                    {language.name}
                  </span>
                ))
              ) : (
                <p className="guide-empty-text">Chưa có ngôn ngữ nào.</p>
              )}
            </div>
          </div>

          <div className="guide-profile-panel compact">
            <h2>Chứng chỉ</h2>
            <div className="guide-certificate-list">
              {certificateList.length > 0 ? (
                certificateList.map((certificate) => (
                  <div className="guide-certificate-item" key={`${certificate.id}-${certificate.issued_year}`}>
                    <strong>{certificate.name}</strong>
                    <span>{certificate.issued_by || 'Đơn vị cấp chưa cập nhật'}</span>
                    {certificate.issued_year && <small>Năm cấp: {certificate.issued_year}</small>}
                  </div>
                ))
              ) : (
                <p className="guide-empty-text">Chưa có chứng chỉ nào.</p>
              )}
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

export default GuideProfilePage
