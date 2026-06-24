import SettingField from "./SettingField";

function LocaleSettingsForm({ settings, updateField }) {
  return (
    <div className="setting-form-grid">
      <SettingField label="Ngôn ngữ mặc định">
        <select
          value={settings.default_language}
          onChange={(e) => updateField("default_language", e.target.value)}
        >
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>
      </SettingField>
      <SettingField label="Múi giờ">
        <select
          value={settings.timezone}
          onChange={(e) => updateField("timezone", e.target.value)}
        >
          <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
          <option value="UTC">UTC</option>
          <option value="Asia/Bangkok">Asia/Bangkok</option>
        </select>
      </SettingField>
      <SettingField label="Định dạng ngày">
        <select
          value={settings.date_format}
          onChange={(e) => updateField("date_format", e.target.value)}
        >
          <option value="dd/mm/yyyy">dd/mm/yyyy</option>
          <option value="yyyy-mm-dd">yyyy-mm-dd</option>
          <option value="mm/dd/yyyy">mm/dd/yyyy</option>
        </select>
      </SettingField>
      <SettingField label="Tiền tệ">
        <select
          value={settings.currency}
          onChange={(e) => updateField("currency", e.target.value)}
        >
          <option value="VND">VND</option>
          <option value="USD">USD</option>
        </select>
      </SettingField>
    </div>
  );
}

export default LocaleSettingsForm;
