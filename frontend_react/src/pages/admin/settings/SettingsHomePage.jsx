import { useNavigate } from "react-router-dom";
import SettingDashboard from "../../../components/admin/settings/SettingDashboard";
import { settingSections } from "../../../config/adminSettings";
import AdminLayout from "../../../layouts/AdminLayout";
import "../../../styles/system-setting.css";

function SettingsHomePage() {
  const navigate = useNavigate();
  return (
    <AdminLayout>
      <section className="setting-page">
        <div className="setting-breadcrumb">
          ViVuGo <span>/</span> <b>Cài Đặt Hệ Thống</b>
        </div>
        <div className="setting-header">
          <div>
            <h1>Cài Đặt Hệ Thống</h1>
            <p>Chọn một chức năng để cấu hình hệ thống ViVuGo</p>
          </div>
        </div>
        <SettingDashboard
          sections={settingSections}
          onSelect={(id) => navigate(`/admin/settings/${id}`)}
        />
      </section>
    </AdminLayout>
  );
}

export default SettingsHomePage;
