import { defaultSettings } from "../config/adminSettings";

const booleanKeys = [
  "require_2fa",
  "allow_remember_login",
  "notify_email_enabled",
  "notify_sms_enabled",
  "notify_push_enabled",
  "payment_enabled",
  "auto_backup_enabled",
];
const numberKeys = [
  "password_min_length",
  "session_timeout_minutes",
  "vat_percent",
  "backup_retention_days",
];

export function normalizeBanners(value) {
  let banners = value;
  if (typeof value === "string") {
    try {
      banners = JSON.parse(value);
    } catch {
      banners = [];
    }
  }
  if (!Array.isArray(banners)) return [];
  return banners
    .map((banner, index) => ({
      id: banner.id || `banner-${index}`,
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      image_url: banner.image_url || "",
      button_text: banner.button_text || "",
      link_url: banner.link_url || "",
      sort_order: Number(banner.sort_order ?? index),
      is_active: [true, 1, "1", "true"].includes(banner.is_active),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function normalizeSettings(data = {}) {
  return Object.entries({ ...defaultSettings, ...data }).reduce(
    (result, [key, value]) => {
      if (key === "banners") result[key] = normalizeBanners(value);
      else if (booleanKeys.includes(key))
        result[key] = [true, 1, "1", "true"].includes(value);
      else if (numberKeys.includes(key))
        result[key] =
          value === null || value === "" ? defaultSettings[key] : Number(value);
      else result[key] = value ?? "";
      return result;
    },
    {},
  );
}
