function SettingSwitch({
  title,
  description,
  checked,
  onChange,
  compact = false,
}) {
  return (
    <label className={`setting-switch-row${compact ? " mini" : ""}`}>
      <span>
        <b>{title}</b>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export default SettingSwitch;
