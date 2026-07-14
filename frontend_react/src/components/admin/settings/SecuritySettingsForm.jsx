import SettingField from "./SettingField";
import SettingSwitch from "./SettingSwitch";

function SecuritySettingsForm({ settings, updateField }) {
  return (
    <div className="setting-form-grid">
      <SettingField label="Độ dài mật khẩu tối thiểu" required>
        <input
          type="number"
          min="6"
          max="32"
          value={settings.password_min_length}
          onChange={(e) => updateField("password_min_length", e.target.value)}
        />
      </SettingField>
      <SettingField label="Thời gian phiên đăng nhập (phút)" required>
        <input
          type="number"
          min="15"
          value={settings.session_timeout_minutes}
          onChange={(e) =>
            updateField("session_timeout_minutes", e.target.value)
          }
        />
      </SettingField>
      <SettingSwitch
        title="Bật xác thực 2 lớp"
        description="Yêu cầu mã xác minh khi đăng nhập admin."
        checked={settings.require_2fa}
        onChange={(value) => updateField("require_2fa", value)}
      />
      <SettingSwitch
        title="Cho phép ghi nhớ đăng nhập"
        description="Lưu phiên đăng nhập trên trình duyệt tin cậy."
        checked={settings.allow_remember_login}
        onChange={(value) => updateField("allow_remember_login", value)}
      />
    </div>
  );
}

export default SecuritySettingsForm;
