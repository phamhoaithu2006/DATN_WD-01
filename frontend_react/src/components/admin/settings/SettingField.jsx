function SettingField({ label, hint, children, required = false }) {
  return (
    <label className="setting-field">
      <span>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export default SettingField;
