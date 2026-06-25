import BannerManager from "./BannerManager";
import SettingField from "./SettingField";

function SystemSettingsForm({ settings, updateField }) {
  return (
    <div className="setting-section-body">
      <div className="setting-form-grid">
        <SettingField label="Tên hệ thống">
          <input
            value={settings.site_name}
            onChange={(e) => updateField("site_name", e.target.value)}
          />
        </SettingField>
        <SettingField label="Logo URL">
          <input
            value={settings.logo_url}
            onChange={(e) => updateField("logo_url", e.target.value)}
            placeholder="https://.../logo.png"
          />
        </SettingField>
        <SettingField label="Email liên hệ">
          <input
            type="email"
            value={settings.contact_email}
            onChange={(e) => updateField("contact_email", e.target.value)}
          />
        </SettingField>
        <SettingField label="Hotline">
          <input
            value={settings.hotline}
            onChange={(e) => updateField("hotline", e.target.value)}
          />
        </SettingField>
        <SettingField label="Địa chỉ">
          <textarea
            value={settings.address}
            onChange={(e) => updateField("address", e.target.value)}
          />
        </SettingField>
        <SettingField label="Nội dung chân trang">
          <textarea
            value={settings.footer_text}
            onChange={(e) => updateField("footer_text", e.target.value)}
          />
        </SettingField>
      </div>
      <BannerManager
        banners={settings.banners}
        onChange={(banners) => updateField("banners", banners)}
      />
    </div>
  );
}

export default SystemSettingsForm;
