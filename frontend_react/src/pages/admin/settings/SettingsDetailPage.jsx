import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      setSettings(normalizeSettings(await getAdminSettings()));
    } catch (requestError) {
      setError(errorMessage(requestError, "Không thể tải cấu hình hệ thống."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

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
        <div className="setting-breadcrumb">
          VivuGo <span>/</span> <b>Cài Đặt</b>
          <span>/</span>
          <b>{section.title}</b>
        </div>
        <div className="setting-header">
          <div>
            <h1>{section.title}</h1>
            <p>{section.description}</p>
          </div>
          <button
            className="setting-refresh-button"
            type="button"
            onClick={loadSettings}
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>
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
