import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { getAdminSettings, updateAdminSettings } from '../../services/adminSettingService'
import { useLocale } from '../../contexts/LocaleContext'
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
  { id: 'system', icon: '⚙️', title: 'Thông Tin Hệ Thống', description: 'Tên, logo, liên hệ, footer' },
  { id: 'security', icon: '🔐', title: 'Bảo Mật & Đăng Nhập', description: 'Mật khẩu, 2FA, phiên làm việc' },
  { id: 'notification', icon: '🔔', title: 'Thông Báo', description: 'Email, SMS, push notifications' },
  { id: 'locale', icon: '🌐', title: 'Ngôn Ngữ & Vùng', description: 'Tiếng Việt, múi giờ, định dạng' },
  { id: 'payment', icon: '💳', title: 'Thanh Toán & Hóa Đơn', description: 'Cổng thanh toán, thuế VAT' },
  { id: 'backup', icon: '💾', title: 'Sao Lưu Dữ Liệu', description: 'Tự động sao lưu, phục hồi' },
]

const booleanFields = [
  'require_2fa',
  'allow_remember_login',
  'notify_email_enabled',
  'notify_sms_enabled',
  'notify_push_enabled',
  'payment_enabled',
  'auto_backup_enabled',
]

const numberFields = [
  'password_min_length',
  'session_timeout_minutes',
  'vat_percent',
  'backup_retention_days',
]

function normalizeSettings(data) {
  return Object.entries({ ...defaultSettings, ...data }).reduce((result, [key, value]) => {
    if (booleanFields.includes(key)) {
      result[key] = value === true || value === 'true' || value === 1 || value === '1'
      return result
    }

    if (numberFields.includes(key)) {
      result[key] = value === null || value === '' ? defaultSettings[key] : Number(value)
      return result
    }

    // Ép về chuỗi — tránh gửi object/array lên server
    result[key] = value == null ? '' : String(value)
    return result
  }, {})
}

/**
 * Tạo payload an toàn để gửi lên API.
 * Chỉ giữ các key thuộc ALLOWED_KEYS và ép mỗi giá trị về kiểu primitive.
 */
function sanitizePayload(settings) {
  const payload = {}

  for (const [key, value] of Object.entries(settings)) {
    if (booleanFields.includes(key)) {
      payload[key] = Boolean(value)
    } else if (numberFields.includes(key)) {
      payload[key] = Number(value)
    } else {
      payload[key] = value == null ? '' : String(value)
    }
  }

  return payload
}

function SettingField({ label, children, hint }) {
  return (
    <label className="setting-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

function SettingSwitch({ title, description, checked, onChange }) {
  return (
    <label className="setting-switch-row">
      <span>
        <b>{title}</b>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

function SystemSettingPage() {
  const [activeSection, setActiveSection] = useState('security')
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { changeLanguage } = useLocale()

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
    const timer = window.setTimeout(() => {
      loadSettings()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  function updateField(field, value) {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const data = await updateAdminSettings(sanitizePayload(settings))
      const normalized = normalizeSettings(data)
      setSettings(normalized)
      setMessage('Lưu cài đặt thành công.')

      // Cập nhật locale settings trên toàn app khi admin thay đổi
      if (normalized.default_language) {
        changeLanguage(normalized.default_language, { manual: false })
      }
      localStorage.setItem('vivugo_locale_settings', JSON.stringify({
        default_language: String(normalized.default_language || 'vi'),
        timezone: String(normalized.timezone || 'Asia/Ho_Chi_Minh'),
        date_format: String(normalized.date_format || 'dd/mm/yyyy'),
        currency: String(normalized.currency || 'VND'),
      }))
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
            <input value={settings.site_name} onChange={(event) => updateField('site_name', event.target.value)} placeholder="VivuGo" />
          </SettingField>
          <SettingField label="Logo URL">
            <input value={settings.logo_url} onChange={(event) => updateField('logo_url', event.target.value)} placeholder="https://.../logo.png" />
          </SettingField>
          <SettingField label="Email liên hệ">
            <input type="email" value={settings.contact_email} onChange={(event) => updateField('contact_email', event.target.value)} placeholder="admin@vivugo.vn" />
          </SettingField>
          <SettingField label="Hotline">
            <input value={settings.hotline} onChange={(event) => updateField('hotline', event.target.value)} placeholder="1900 0000" />
          </SettingField>
          <SettingField label="Địa chỉ">
            <textarea value={settings.address} onChange={(event) => updateField('address', event.target.value)} placeholder="Địa chỉ công ty" />
          </SettingField>
          <SettingField label="Nội dung footer">
            <textarea value={settings.footer_text} onChange={(event) => updateField('footer_text', event.target.value)} placeholder="Thông tin hiển thị ở footer" />
          </SettingField>
        </div>
      )
    }

    if (activeSection === 'security') {
      return (
        <div className="setting-form-grid">
          <SettingField label="Độ dài mật khẩu tối thiểu">
            <input
              type="number"
              min="6"
              max="32"
              value={settings.password_min_length}
              onChange={(event) => updateField('password_min_length', event.target.value)}
            />
          </SettingField>
          <SettingField label="Thời gian phiên đăng nhập (phút)">
            <input
              type="number"
              min="15"
              max="10080"
              value={settings.session_timeout_minutes}
              onChange={(event) => updateField('session_timeout_minutes', event.target.value)}
            />
          </SettingField>
          <SettingSwitch
            title="Bật xác thực 2 lớp"
            description="Yêu cầu mã xác minh khi đăng nhập admin."
            checked={settings.require_2fa}
            onChange={(value) => updateField('require_2fa', value)}
          />
          <SettingSwitch
            title="Cho phép ghi nhớ đăng nhập"
            description="Lưu phiên đăng nhập trên trình duyệt tin cậy."
            checked={settings.allow_remember_login}
            onChange={(value) => updateField('allow_remember_login', value)}
          />
        </div>
      )
    }

    if (activeSection === 'notification') {
      return (
        <div className="setting-form-grid">
          <SettingField label="Email nhận thông báo admin">
            <input type="email" value={settings.admin_notification_email} onChange={(event) => updateField('admin_notification_email', event.target.value)} placeholder="notify@vivugo.vn" />
          </SettingField>
          <SettingSwitch title="Thông báo Email" description="Gửi email khi có booking/thanh toán mới." checked={settings.notify_email_enabled} onChange={(value) => updateField('notify_email_enabled', value)} />
          <SettingSwitch title="Thông báo SMS" description="Gửi SMS cho sự kiện quan trọng." checked={settings.notify_sms_enabled} onChange={(value) => updateField('notify_sms_enabled', value)} />
          <SettingSwitch title="Push notifications" description="Hiển thị thông báo trong trình duyệt." checked={settings.notify_push_enabled} onChange={(value) => updateField('notify_push_enabled', value)} />
        </div>
      )
    }

    if (activeSection === 'locale') {
      return (
        <div className="setting-form-grid">
          <SettingField label="Ngôn ngữ mặc định">
            <select value={settings.default_language} onChange={(event) => updateField('default_language', event.target.value)}>
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </SettingField>
          <SettingField label="Múi giờ">
            <select value={settings.timezone} onChange={(event) => updateField('timezone', event.target.value)}>
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
              <option value="Asia/Bangkok">Asia/Bangkok</option>
              <option value="UTC">UTC</option>
            </select>
          </SettingField>
          <SettingField label="Định dạng ngày">
            <select value={settings.date_format} onChange={(event) => updateField('date_format', event.target.value)}>
              <option value="dd/mm/yyyy">dd/mm/yyyy</option>
              <option value="yyyy-mm-dd">yyyy-mm-dd</option>
              <option value="mm/dd/yyyy">mm/dd/yyyy</option>
            </select>
          </SettingField>
          <SettingField label="Tiền tệ">
            <select value={settings.currency} onChange={(event) => updateField('currency', event.target.value)}>
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
            <select value={settings.payment_gateway} onChange={(event) => updateField('payment_gateway', event.target.value)}>
              <option value="vnpay">VNPay</option>
              <option value="momo">MoMo</option>
              <option value="zalopay">ZaloPay</option>
              <option value="cash">Tiền mặt</option>
            </select>
          </SettingField>
          <SettingField label="Thuế VAT (%)">
            <input type="number" min="0" max="100" value={settings.vat_percent} onChange={(event) => updateField('vat_percent', event.target.value)} />
          </SettingField>
          <SettingField label="Tiền tố hóa đơn">
            <input value={settings.invoice_prefix} onChange={(event) => updateField('invoice_prefix', event.target.value)} placeholder="VVG" />
          </SettingField>
          <SettingSwitch title="Bật thanh toán online" description="Cho phép khách hàng thanh toán trực tuyến." checked={settings.payment_enabled} onChange={(value) => updateField('payment_enabled', value)} />
        </div>
      )
    }

    return (
      <div className="setting-form-grid">
        <SettingField label="Tần suất sao lưu">
          <select value={settings.backup_frequency} onChange={(event) => updateField('backup_frequency', event.target.value)}>
            <option value="daily">Hằng ngày</option>
            <option value="weekly">Hằng tuần</option>
            <option value="monthly">Hằng tháng</option>
          </select>
        </SettingField>
        <SettingField label="Giờ sao lưu">
          <input type="time" value={settings.backup_time} onChange={(event) => updateField('backup_time', event.target.value)} />
        </SettingField>
        <SettingField label="Số ngày lưu bản sao">
          <input type="number" min="1" value={settings.backup_retention_days} onChange={(event) => updateField('backup_retention_days', event.target.value)} />
        </SettingField>
        <SettingSwitch title="Tự động sao lưu" description="Hệ thống tự động tạo bản sao theo lịch." checked={settings.auto_backup_enabled} onChange={(value) => updateField('auto_backup_enabled', value)} />
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

        {error ? <div className="setting-alert error">{error}</div> : null}
        {message ? <div className="setting-alert success">{message}</div> : null}

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
