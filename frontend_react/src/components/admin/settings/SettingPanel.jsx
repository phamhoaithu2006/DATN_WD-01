import SettingSectionForm from "./SettingSectionForm";

function SettingPanel({
  section,
  settings,
  saving,
  loading,
  onBack,
  onSave,
  updateField,
}) {
  return (
    <form className="setting-panel" onSubmit={onSave}>
      <div className="setting-panel-head">
        <div>
          <button
            className="setting-back-button"
            type="button"
            onClick={onBack}
          >
            ←
          </button>
          <h2>{section.title}</h2>
          <p>{section.description}</p>
        </div>
        <button
          className="setting-save-button"
          type="submit"
          disabled={saving || loading}
        >
          {saving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      </div>
      <SettingSectionForm
        sectionId={section.id}
        settings={settings}
        updateField={updateField}
      />
    </form>
  );
}

export default SettingPanel;
