import SettingField from "./SettingField";
import SettingSwitch from "./SettingSwitch";

function NotificationSettingsForm({ settings, updateField }) {
  return (
    <div className="setting-form-grid">
      <SettingField label="Email nhận thông báo admin" required>
        <input
          type="email"
          value={settings.admin_notification_email}
          onChange={(e) =>
            updateField("admin_notification_email", e.target.value)
          }
        />
      </SettingField>
      <SettingSwitch
        title="Thông báo Email"
        description="Gửi email khi có booking hoặc thanh toán mới."
        checked={settings.notify_email_enabled}
        onChange={(value) => updateField("notify_email_enabled", value)}
      />
      <SettingSwitch
        title="Thông báo SMS"
        description="Gửi SMS cho các sự kiện quan trọng."
        checked={settings.notify_sms_enabled}
        onChange={(value) => updateField("notify_sms_enabled", value)}
      />
      <SettingSwitch
        title="Thông báo trình duyệt"
        description="Hiển thị thông báo trực tiếp trong trình duyệt."
        checked={settings.notify_push_enabled}
        onChange={(value) => updateField("notify_push_enabled", value)}
      />
    </div>
  );
}

export default NotificationSettingsForm;
