import SettingField from "./SettingField";
import SettingSwitch from "./SettingSwitch";

function PaymentSettingsForm({ settings, updateField }) {
  return (
    <div className="setting-form-grid">
      <SettingField label="Cổng thanh toán">
        <select
          value={settings.payment_gateway}
          onChange={(e) => updateField("payment_gateway", e.target.value)}
        >
          <option value="vnpay">VNPay</option>
          <option value="momo">MoMo</option>
          <option value="zalopay">ZaloPay</option>
          <option value="cash">Tiền mặt</option>
        </select>
      </SettingField>
      <SettingField label="Thuế VAT (%)">
        <input
          type="number"
          min="0"
          max="100"
          value={settings.vat_percent}
          onChange={(e) => updateField("vat_percent", e.target.value)}
        />
      </SettingField>
      <SettingField label="Tiền tố hóa đơn">
        <input
          value={settings.invoice_prefix}
          onChange={(e) => updateField("invoice_prefix", e.target.value)}
        />
      </SettingField>
      <SettingSwitch
        title="Bật thanh toán online"
        description="Cho phép khách hàng thanh toán trực tuyến."
        checked={settings.payment_enabled}
        onChange={(value) => updateField("payment_enabled", value)}
      />
    </div>
  );
}

export default PaymentSettingsForm;
