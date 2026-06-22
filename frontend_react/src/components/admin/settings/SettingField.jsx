function SettingField({ label, hint, children }) {
  return (
    <label className="setting-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export default SettingField;
