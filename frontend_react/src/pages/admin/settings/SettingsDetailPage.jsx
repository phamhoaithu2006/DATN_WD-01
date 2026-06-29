import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import SettingPanel from "../../../components/admin/settings/SettingPanel";
import {
  defaultSettings,
  settingSections,
} from "../../../config/adminSettings";
import AdminLayout from "../../../layouts/AdminLayout";
import {
  getAdminSettings,
  updateAdminSettings,
} from "../../../services/adminSettingService";
import "../../../styles/system-setting.css";
import { normalizeSettings } from "../../../utils/adminSettings";

function errorMessage(error, fallback) {
  const errors = error?.response?.data?.errors;
  return errors
    ? Object.values(errors).flat()[0]
    : error?.response?.data?.message || fallback;
}

function SettingsDetailPage({ sectionId }) {
  const navigate = useNavigate();
  const section = settingSections.find((item) => item.id === sectionId);
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSettings(normalizeSettings(await getAdminSettings()));
    } catch (requestError) {
      setError(errorMessage(requestError, "Không thể tải cấu hình hệ thống."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSettings]);

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      setSettings(normalizeSettings(await updateAdminSettings(settings)));
      setMessage("Lưu cài đặt thành công.");
    } catch (requestError) {
      setError(errorMessage(requestError, "Không thể lưu cài đặt."));
    } finally {
      setSaving(false);
    }
  }

  const updateField = (field, value) =>
    setSettings((current) => ({ ...current, [field]: value }));

  return (
    <AdminLayout>
      <section className="setting-page">
        <AdminPageHeader
          breadcrumb={[
            "ViVuGo",
            { label: "Cài Đặt", href: "/admin/settings" },
            section?.title || "Cài Đặt",
          ]}
          title={section?.title || "Cài Đặt"}
          description={section?.description || ""}
          actions={
            <button
              className="setting-refresh-button"
              type="button"
              onClick={loadSettings}
              disabled={loading}
            >
              {loading ? "Đang tải..." : "Tải lại"}
            </button>
          }
        />
        {error ? <div className="setting-alert error">{error}</div> : null}
        {message ? (
          <div className="setting-alert success">{message}</div>
        ) : null}
        <SettingPanel
          section={section}
          settings={settings}
          saving={saving}
          loading={loading}
          onBack={() => navigate("/admin/settings")}
          onSave={saveSettings}
          updateField={updateField}
        />
      </section>
    </AdminLayout>
  );
}

export default SettingsDetailPage;