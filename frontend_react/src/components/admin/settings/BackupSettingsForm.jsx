import SettingField from "./SettingField";
import SettingSwitch from "./SettingSwitch";

function BackupSettingsForm({ settings, updateField }) {
  return (
    <div className="setting-form-grid">
      <SettingField label="Tần suất sao lưu" required>
        <select
          value={settings.backup_frequency}
          onChange={(e) => updateField("backup_frequency", e.target.value)}
        >
          <option value="daily">Hằng ngày</option>
          <option value="weekly">Hằng tuần</option>
          <option value="monthly">Hằng tháng</option>
        </select>
      </SettingField>
      <SettingField label="Giờ sao lưu" required>
        <input
          type="time"
          value={settings.backup_time}
          onChange={(e) => updateField("backup_time", e.target.value)}
        />
      </SettingField>
      <SettingField label="Số ngày lưu bản sao" required>
        <input
          type="number"
          min="1"
          value={settings.backup_retention_days}
          onChange={(e) => updateField("backup_retention_days", e.target.value)}
        />
      </SettingField>
      <SettingSwitch
        title="Tự động sao lưu"
        description="Hệ thống tự tạo bản sao theo lịch đã chọn."
        checked={settings.auto_backup_enabled}
        onChange={(value) => updateField("auto_backup_enabled", value)}
      />
    </div>
  );
}

export default BackupSettingsForm;
