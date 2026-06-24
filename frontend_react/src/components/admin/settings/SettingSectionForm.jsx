import BackupSettingsForm from "./BackupSettingsForm";
import LocaleSettingsForm from "./LocaleSettingsForm";
import NotificationSettingsForm from "./NotificationSettingsForm";
import PaymentSettingsForm from "./PaymentSettingsForm";
import SecuritySettingsForm from "./SecuritySettingsForm";
import SystemSettingsForm from "./SystemSettingsForm";

const forms = {
  system: SystemSettingsForm,
  security: SecuritySettingsForm,
  notification: NotificationSettingsForm,
  locale: LocaleSettingsForm,
  payment: PaymentSettingsForm,
  backup: BackupSettingsForm,
};

function SettingSectionForm({ sectionId, settings, updateField }) {
  const Form = forms[sectionId];
  return Form ? <Form settings={settings} updateField={updateField} /> : null;
}

export default SettingSectionForm;
