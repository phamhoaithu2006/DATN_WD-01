import { useNavigate } from "react-router-dom";
import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import SettingDashboard from "../../../components/admin/settings/SettingDashboard";
import { settingSections } from "../../../config/adminSettings";
import AdminLayout from "../../../layouts/AdminLayout";
import "../../../styles/system-setting.css";

function SettingsHomePage() {
  const navigate = useNavigate();
  return (
    <AdminLayout>
      <section className="setting-page">
        <AdminPageHeader
          breadcrumb={["ViVuGo", "Cài Đặt Hệ Thống"]}
          title="Cài Đặt Hệ Thống"
          description="Chọn một chức năng để cấu hình hệ thống ViVuGo"
        />
        <SettingDashboard
          sections={settingSections}
          onSelect={(id) => navigate(`/admin/settings/${id}`)}
        />
      </section>
    </AdminLayout>
  );
}

export default SettingsHomePage;