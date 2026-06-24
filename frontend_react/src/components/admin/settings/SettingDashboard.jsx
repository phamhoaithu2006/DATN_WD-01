function SettingDashboard({ sections, onSelect }) {
  return (
    <div className="setting-card-grid">
      {sections.map((section) => (
        <button
          className="setting-card"
          key={section.id}
          type="button"
          onClick={() => onSelect(section.id)}
        >
          <span className="setting-card-icon">{section.icon}</span>
          <strong>{section.title}</strong>
          <small>{section.description}</small>
          <em>Đi tới cài đặt →</em>
        </button>
      ))}
    </div>
  );
}

export default SettingDashboard;
