import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { getAdminSettings, updateAdminSettings } from '../../services/adminSettingService'
import '../../styles/system-setting.css'

const defaultSettings = {
  site_name: 'VivuGo',
  logo_url: '',
  contact_email: '',
  hotline: '',
  address: '',
  footer_text: '',
  footer_hotline: '',
  footer_email: '',
  footer_address: '',
  password_min_length: 8,
  require_2fa: false,
  session_timeout_minutes: 120,
  allow_remember_login: true,
  notify_email_enabled: true,
  notify_sms_enabled: false,
  notify_push_enabled: true,
  admin_notification_email: '',
  default_language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  date_format: 'dd/mm/yyyy',
  currency: 'VND',
  payment_enabled: true,
  payment_gateway: 'vnpay',
  vat_percent: 10,
  invoice_prefix: 'VVG',
  auto_backup_enabled: false,
  backup_frequency: 'daily',
  backup_time: '02:00',
  backup_retention_days: 7,
}

const settingSections = [
  {
    id: 'system',
    icon: '⚙️',
    title: 'Thông Tin Hệ Thống',
    description: 'Tên, logo, thông tin liên hệ',
  },
  {
    id: 'security',
    icon: '🔐',
    title: 'Bảo Mật & Đăng Nhập',
    description: 'Mật khẩu, 2FA, phiên làm việc',
  },
  {
    id: 'notification',
    icon: '🔔',
    title: 'Thông Báo',
    description: 'Email, SMS, push notifications',
  },
  {
    id: 'locale',
    icon: '🌐',
    title: 'Ngôn Ngữ & Vùng',
    description: 'Tiếng Việt, múi giờ, định dạng',
  },
  {
    id: 'payment',
    icon: '💳',
    title: 'Thanh Toán & Hóa Đơn',
    description: 'Cổng thanh toán, thuế VAT',
  },
  {
    id: 'backup',
    icon: '💾',
    title: 'Sao Lưu Dữ Liệu',
    description: 'Tự động sao lưu, phục hồi',
  },
]

function normalizeSettings(data) {
  return Object.entries({ ...defaultSettings, ...data }).reduce((result, [key, value]) => {
    if (['require_2fa', 'allow_remember_login', 'notify_email_enabled', 'notify_sms_enabled', 'notify_push_enabled', 'payment_enabled', 'auto_backup_enabled'].includes(key)) {
      result[key] = value === true || value === 'true' || value === 1 || value === '1'
      return result
    }

    if (['password_min_length', 'session_timeout_minutes', 'vat_percent', 'backup_retention_days'].includes(key)) {
      result[key] = value === null || value === '' ? defaultSettings[key] : Number(value)
      return result
    }

    result[key] = value ?? ''
    return result
  }, {})
}

function SettingField({ label, children, hint }) {
  return (
    <label className="setting-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

function SystemSettingPage() {
  const [activeSection, setActiveSection] = useState('system')
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const activeInfo = useMemo(
    () => settingSections.find((section) => section.id === activeSection),
    [activeSection],
  )

  async function loadSettings() {
    setLoading(true)
    setError('')

    try {
      const data = await getAdminSettings()
      setSettings(normalizeSettings(data))
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tải cấu hình hệ thống.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  function updateField(field, value) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const data = await updateAdminSettings(settings)
      setSettings(normalizeSettings(data))
      setMessage('Lưu cài đặt thành công.')
    } catch (err) {
      const validationErrors = err?.response?.data?.errors
      const firstMessage = validationErrors ? Object.values(validationErrors).flat()[0] : null
      setError(firstMessage || err?.response?.data?.message || 'Không thể lưu cài đặt.')
    } finally {
      setSaving(false)
    }
  }

  function renderSectionForm() {
    if (activeSection === 'system') {
      return (
        <div className="setting-form-grid">
          <SettingField label="Tên hệ thống">
            <input value={settings.site_name} onChange={(e) => updateField('site_name', e.target.value)} placeholder="VivuGo" />
          </SettingField>

          <SettingField label="Logo URL">
            <input value={settings.logo_url} onChange={(e) => updateField('logo_url', e.target.value)} placeholder="https://.../logo.png" />
          </SettingField>

          <SettingField label="Email liên hệ">
            <input type="email" value={settings.contact_email} onChange={(e) => updateField('contact_email', e.target.value)} placeholder="admin@vivugo.vn" />
          </SettingField>

          <SettingField label="Hotline">
            <input value={settings.hotline} onChange={(e) => updateField('hotline', e.target.value)} placeholder="1900 0000" />
          </SettingField>

          <SettingField label="Địa chỉ">
            <textarea value={settings.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Địa chỉ công ty" />
          </SettingField>

          <SettingField label="Nội dung footer">
            <textarea value={settings.footer_text} onChange={(e) => updateField('footer_text', e.target.value)} placeholder="Thông tin hiển thị ở footer" />
          </SettingField>
        </div>
      )
    }

    if (activeSection === 'security') {
      return (
        <div className="setting-form-grid">
          <SettingField label="Độ dài mật khẩu tối thiểu">
            <input type="number" min="6" max="32" value={settings.password_min_length} onChange={(e) => updateField('password_min_length', e.target.value)} />
          </SettingField>

          <SettingField label="Thời gian phiên đăng nhập (phút)">
            <input type="number" min="15" value={settings.session_timeout_minutes} onChange={(e) => updateField('session_timeout_minutes', e.target.value)} />
          </SettingField>

          <label className="setting-switch-row">
            <span>
              <b>Bật xác thực 2 lớp</b>
              <small>Yêu cầu mã xác minh khi đăng nhập admin.</small>
            </span>
            <input type="checkbox" checked={settings.require_2fa} onChange={(e) => updateField('require_2fa', e.target.checked)} />
          </label>

          <label className="setting-switch-row">
            <span>
              <b>Cho phép ghi nhớ đăng nhập</b>
              <small>Lưu phiên đăng nhập trên trình duyệt tin cậy.</small>
            </span>
            <input type="checkbox" checked={settings.allow_remember_login} onChange={(e) => updateField('allow_remember_login', e.target.checked)} />
          </label>
        </div>
      )
    }

    if (activeSection === 'notification') {
      return (
        <div className="setting-form-grid">
          <SettingField label="Email nhận thông báo admin">
            <input type="email" value={settings.admin_notification_email} onChange={(e) => updateField('admin_notification_email', e.target.value)} placeholder="notify@vivugo.vn" />
          </SettingField>

          <label className="setting-switch-row">
            <span><b>Thông báo Email</b><small>Gửi email khi có booking/thanh toán mới.</small></span>
            <input type="checkbox" checked={settings.notify_email_enabled} onChange={(e) => updateField('notify_email_enabled', e.target.checked)} />
          </label>

          <label className="setting-switch-row">
            <span><b>Thông báo SMS</b><small>Gửi SMS cho sự kiện quan trọng.</small></span>
            <input type="checkbox" checked={settings.notify_sms_enabled} onChange={(e) => updateField('notify_sms_enabled', e.target.checked)} />
          </label>

          <label className="setting-switch-row">
            <span><b>Push notifications</b><small>Hiển thị thông báo trong trình duyệt.</small></span>
            <input type="checkbox" checked={settings.notify_push_enabled} onChange={(e) => updateField('notify_push_enabled', e.target.checked)} />
          </label>
        </div>
      )
    }

    if (activeSection === 'locale') {
      return (
        <div className="setting-form-grid">
          <SettingField label="Ngôn ngữ mặc định">
            <select value={settings.default_language} onChange={(e) => updateField('default_language', e.target.value)}>
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </SettingField>

          <SettingField label="Múi giờ">
            <select value={settings.timezone} onChange={(e) => updateField('timezone', e.target.value)}>
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
              <option value="UTC">UTC</option>
              <option value="Asia/Bangkok">Asia/Bangkok</option>
            </select>
          </SettingField>

          <SettingField label="Định dạng ngày">
            <select value={settings.date_format} onChange={(e) => updateField('date_format', e.target.value)}>
              <option value="dd/mm/yyyy">dd/mm/yyyy</option>
              <option value="yyyy-mm-dd">yyyy-mm-dd</option>
              <option value="mm/dd/yyyy">mm/dd/yyyy</option>
            </select>
          </SettingField>

          <SettingField label="Tiền tệ">
            <select value={settings.currency} onChange={(e) => updateField('currency', e.target.value)}>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </SettingField>
        </div>
      )
    }

    if (activeSection === 'payment') {
      return (
        <div className="setting-form-grid">
          <SettingField label="Cổng thanh toán">
            <select value={settings.payment_gateway} onChange={(e) => updateField('payment_gateway', e.target.value)}>
              <option value="vnpay">VNPay</option>
              <option value="momo">MoMo</option>
              <option value="zalopay">ZaloPay</option>
              <option value="cash">Thanh toán trực tiếp</option>
            </select>
          </SettingField>

          <SettingField label="Thuế VAT (%)">
            <input type="number" min="0" max="100" value={settings.vat_percent} onChange={(e) => updateField('vat_percent', e.target.value)} />
          </SettingField>

          <SettingField label="Tiền tố hóa đơn">
            <input value={settings.invoice_prefix} onChange={(e) => updateField('invoice_prefix', e.target.value)} placeholder="VVG" />
          </SettingField>

          <label className="setting-switch-row">
            <span><b>Bật thanh toán online</b><small>Cho phép khách thanh toán qua cổng thanh toán.</small></span>
            <input type="checkbox" checked={settings.payment_enabled} onChange={(e) => updateField('payment_enabled', e.target.checked)} />
          </label>
        </div>
      )
    }

    return (
      <div className="setting-form-grid">
        <SettingField label="Tần suất sao lưu">
          <select value={settings.backup_frequency} onChange={(e) => updateField('backup_frequency', e.target.value)}>
            <option value="daily">Hằng ngày</option>
            <option value="weekly">Hằng tuần</option>
            <option value="monthly">Hằng tháng</option>
          </select>
        </SettingField>

        <SettingField label="Giờ sao lưu">
          <input type="time" value={settings.backup_time} onChange={(e) => updateField('backup_time', e.target.value)} />
        </SettingField>

        <SettingField label="Số ngày lưu bản sao">
          <input type="number" min="1" value={settings.backup_retention_days} onChange={(e) => updateField('backup_retention_days', e.target.value)} />
        </SettingField>

        <label className="setting-switch-row">
          <span><b>Tự động sao lưu</b><small>Hệ thống tự động tạo bản sao theo lịch.</small></span>
          <input type="checkbox" checked={settings.auto_backup_enabled} onChange={(e) => updateField('auto_backup_enabled', e.target.checked)} />
        </label>
      </div>
    )
  }

  return (
    <AdminLayout>
      <section className="setting-page">
        <div className="setting-breadcrumb">VivuGo <span>/</span> <b>Cài Đặt</b></div>

        <div className="setting-header">
          <div>
            <h1>Cài Đặt Hệ Thống</h1>
            <p>Quản lý cấu hình và tùy chỉnh VivuGo Admin</p>
          </div>
          <button className="setting-refresh-button" type="button" onClick={loadSettings} disabled={loading}>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>

        {error && <div className="setting-alert error">{error}</div>}
        {message && <div className="setting-alert success">{message}</div>}

        <div className="setting-card-grid">
          {settingSections.map((section) => (
            <button
              className={activeSection === section.id ? 'setting-card active' : 'setting-card'}
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
            >
              <span className="setting-card-icon">{section.icon}</span>
              <strong>{section.title}</strong>
              <small>{section.description}</small>
            </button>
          ))}
        </div>

        <form className="setting-panel" onSubmit={handleSubmit}>
          <div className="setting-panel-head">
            <div>
              <span>{activeInfo?.icon}</span>
              <h2>{activeInfo?.title}</h2>
              <p>{activeInfo?.description}</p>
            </div>
            <button className="setting-save-button" type="submit" disabled={saving || loading}>
              {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>

          {renderSectionForm()}
        </form>
      </section>
    </AdminLayout>
  )
}

export default SystemSettingPage
