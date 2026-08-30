import { useState } from "react";
import Icon from "./Icon";

function normalizePhone(value) {
  return String(value || "").trim().replace(/\D/g, "");
}

// booking.participants[].birth_date từ API có thể là "1990-05-01" hoặc
// "1990-05-01T00:00:00.000000Z" — input type="date" chỉ nhận đúng "YYYY-MM-DD".
function toDateInputValue(value) {
  return String(value || "").slice(0, 10);
}

const CONTACT_FIELD_LABELS = {
  contact_name: "Tên liên hệ",
  contact_email: "Email liên hệ",
  contact_phone: "SĐT liên hệ",
  address: "Địa chỉ",
  special_request: "Yêu cầu đặc biệt",
};

const PARTICIPANT_FIELD_LABELS = {
  full_name: "Họ tên",
  phone: "SĐT",
  gender: "Giới tính",
  identity_number: "CCCD/Hộ chiếu",
  birth_date: "Ngày sinh",
};

function formatDiffValue(key, value) {
  if (!value) return "trống";
  if (key === "birth_date") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("vi-VN");
    }
  }
  return String(value);
}

// So sánh snapshot trước/sau của 1 lần sửa, chỉ liệt kê đúng những trường
// thực sự thay đổi để khách dễ theo dõi thay vì phải đọc lại toàn bộ dữ liệu.
function summarizeInformationChange(history) {
  const before = history.before || {};
  const after = history.after || {};
  const lines = [];

  const beforeContact = before.contact || {};
  const afterContact = after.contact || {};
  Object.entries(CONTACT_FIELD_LABELS).forEach(([key, label]) => {
    const oldValue = beforeContact[key] ?? "";
    const newValue = afterContact[key] ?? "";
    if (String(oldValue) !== String(newValue)) {
      lines.push(`${label}: "${formatDiffValue(key, oldValue)}" → "${formatDiffValue(key, newValue)}"`);
    }
  });

  const beforeParticipants = Array.isArray(before.participants) ? before.participants : [];
  const afterParticipants = Array.isArray(after.participants) ? after.participants : [];
  afterParticipants.forEach((afterP, index) => {
    const beforeP = beforeParticipants.find((p) => p.id === afterP.id) || beforeParticipants[index] || {};
    Object.entries(PARTICIPANT_FIELD_LABELS).forEach(([key, label]) => {
      const oldValue = beforeP[key] ?? "";
      const newValue = afterP[key] ?? "";
      if (String(oldValue) !== String(newValue)) {
        lines.push(`Hành khách ${index + 1} - ${label}: "${formatDiffValue(key, oldValue)}" → "${formatDiffValue(key, newValue)}"`);
      }
    });
  });

  return lines;
}

function formatHistoryDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function BookingInformationModal({
  booking,
  onClose,
  onSave,
  readOnly = false,
  lockReason = null,
  editCount = 0,
  editLimit = 3,
}) {
  const [contact, setContact] = useState(() => ({
    contact_name: booking.contact?.contact_name || "",
    contact_email: booking.contact?.contact_email || "",
    contact_phone: booking.contact?.contact_phone || "",
    address: booking.contact?.address || "",
    special_request: booking.contact?.special_request || "",
  }));
  const [participants, setParticipants] = useState(() => (booking.participants || []).map((participant) => ({
    id: participant.id,
    full_name: participant.full_name || "",
    phone: participant.phone || "",
    gender: participant.gender || "male",
    identity_number: participant.identity_number || "",
    birth_date: toDateInputValue(participant.birth_date),
    pricing_rule_label: participant.pricing_rule_label || "Người lớn mặc định",
  })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const histories = Array.isArray(booking.information_change_histories)
    ? booking.information_change_histories
    : [];

  const updateParticipant = (index, field, value) => {
    setParticipants((current) => current.map((participant, participantIndex) => (
      participantIndex === index ? { ...participant, [field]: value } : participant
    )));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (readOnly) return;

    setSaving(true);
    setError("");

    try {
      await onSave({
        contact: {
          ...contact,
          contact_name: contact.contact_name.trim(),
          contact_email: contact.contact_email.trim() || null,
          contact_phone: normalizePhone(contact.contact_phone),
          address: contact.address.trim() || null,
          special_request: contact.special_request.trim() || null,
        },
        participants: participants.map((participant) => ({
          ...participant,
          full_name: participant.full_name.trim(),
          phone: normalizePhone(participant.phone) || null,
          identity_number: participant.identity_number.trim() || null,
          birth_date: participant.birth_date,
        })),
      });
      onClose();
    } catch (requestError) {
      const errors = requestError.response?.data?.errors;
      setError(Object.values(errors || {}).flat()[0]
        || requestError.response?.data?.message
        || "Không thể cập nhật thông tin booking.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 px-4 py-8" role="presentation" onMouseDown={onClose}>
      <form className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Booking {booking.booking_code}</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              {readOnly ? "Thông tin hành khách" : "Chỉnh sửa thông tin hành khách"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {readOnly
                ? null
                : "Số lượng khách và tổng tiền không thể thay đổi. Ngày sinh chỉ được đổi trong độ tuổi vẫn thuộc đúng loại vé đã mua."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {histories.length ? (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                onClick={() => setIsHistoryOpen(true)}
              >
                <Icon name="clock" size={14} />
                Timeline
                <span className="rounded-full bg-slate-200 px-1.5 text-[11px] text-slate-700">{histories.length}</span>
              </button>
            ) : null}
            <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Đóng">
              <Icon name="close" size={20} />
            </button>
          </div>
        </header>

        {readOnly ? (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-red-700">
            <Icon name="alertCircle" size={22} />
            <div>
              <p className="text-sm font-extrabold">
                {lockReason === 'limit'
                  ? `Bạn đã sửa thông tin đủ ${editLimit}/${editLimit} lần cho phép.`
                  : "Đã quá thời hạn chỉnh sửa."}
              </p>
              <p className="text-xs font-semibold">
                {lockReason === 'limit'
                  ? "Bạn chỉ có thể xem lại thông tin bên dưới, vui lòng liên hệ hỗ trợ nếu cần thay đổi thêm."
                  : "Chỉ được sửa thông tin trong vòng 3 ngày trước khởi hành. Bạn chỉ có thể xem lại thông tin bên dưới, vui lòng liên hệ hỗ trợ nếu cần thay đổi."}
              </p>
            </div>
          </div>
        ) : (() => {
          const remaining = Math.max(0, editLimit - editCount);
          const isLastEdit = remaining <= 1;
          return (
            <div
              className={`mb-5 flex items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
                isLastEdit
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              <Icon name="alertCircle" size={22} />
              <div>
                <p className="text-sm font-extrabold">
                  Bạn đã sửa thông tin {editCount}/{editLimit} lần được phép.
                </p>
                <p className="text-xs font-semibold">
                  {remaining > 0
                    ? `Còn lại ${remaining} lần sửa. ${isLastEdit ? "Đây là lần sửa cuối cùng, hãy kiểm tra kỹ trước khi lưu!" : ""}`
                    : "Đây là lần lưu cuối cùng bạn được phép — sau khi lưu sẽ không thể sửa thêm."}
                </p>
              </div>
            </div>
          );
        })()}

        {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

        <section className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800">Người liên hệ</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input disabled={readOnly} required value={contact.contact_name} onChange={(event) => setContact((current) => ({ ...current, contact_name: event.target.value }))} placeholder="Họ và tên" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
            <input disabled={readOnly} required value={contact.contact_phone} onChange={(event) => setContact((current) => ({ ...current, contact_phone: event.target.value }))} placeholder="Số điện thoại" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
            <input disabled={readOnly} type="email" value={contact.contact_email} onChange={(event) => setContact((current) => ({ ...current, contact_email: event.target.value }))} placeholder="Email" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
            <input disabled={readOnly} value={contact.address} onChange={(event) => setContact((current) => ({ ...current, address: event.target.value }))} placeholder="Địa chỉ" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
          </div>
          <textarea disabled={readOnly} value={contact.special_request} onChange={(event) => setContact((current) => ({ ...current, special_request: event.target.value }))} placeholder="Yêu cầu đặc biệt" rows="3" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
        </section>

        <section className="mt-7 space-y-3">
          <h3 className="text-sm font-extrabold text-slate-800">Hành khách</h3>
          {participants.map((participant, index) => (
            <div key={participant.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-bold text-slate-700">
                Hành khách {index + 1}
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                  Loại vé: {participant.pricing_rule_label}
                </span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input disabled={readOnly} required value={participant.full_name} onChange={(event) => updateParticipant(index, "full_name", event.target.value)} placeholder="Họ và tên" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
                <input disabled={readOnly} value={participant.phone} onChange={(event) => updateParticipant(index, "phone", event.target.value)} placeholder="Số điện thoại" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
                <select disabled={readOnly} value={participant.gender} onChange={(event) => updateParticipant(index, "gender", event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500">
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
                <input disabled={readOnly} value={participant.identity_number} onChange={(event) => updateParticipant(index, "identity_number", event.target.value)} placeholder="CCCD/Hộ chiếu" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
                <label className="sm:col-span-2 flex flex-col gap-1 text-xs font-semibold text-slate-500">
                  Ngày sinh (chỉ đổi được trong độ tuổi vẫn thuộc "{participant.pricing_rule_label}")
                  <input
                    type="date"
                    disabled={readOnly}
                    required
                    value={participant.birth_date}
                    onChange={(event) => updateParticipant(index, "birth_date", event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </label>
              </div>
            </div>
          ))}
        </section>

        {isHistoryOpen ? (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-8"
            role="presentation"
            onMouseDown={() => setIsHistoryOpen(false)}
          >
            <div
              className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Lịch sử thao tác</p>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900">Lịch sử bạn đã sửa thông tin</h3>
                </div>
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                  onClick={() => setIsHistoryOpen(false)}
                  aria-label="Đóng"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>

              <ol className="space-y-3">
                {histories.map((history) => {
                  const changes = summarizeInformationChange(history);

                  return (
                    <li key={history.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs font-bold text-slate-600">{formatHistoryDate(history.created_at)}</p>
                      {changes.length ? (
                        <ul className="mt-1.5 space-y-1 text-xs text-slate-500">
                          {changes.map((line, index) => (
                            <li key={index}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-xs text-slate-400">Không phát hiện thay đổi nội dung cụ thể.</p>
                      )}
                    </li>
                  );
                })}
              </ol>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  onClick={() => setIsHistoryOpen(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <footer className="mt-7 flex justify-end gap-3">
          <button type="button" className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100" onClick={onClose}>
            {readOnly ? "Đóng" : "Hủy"}
          </button>
          {readOnly ? null : (
            <button type="submit" disabled={saving} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Đang lưu..." : "Lưu thông tin"}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}

export default BookingInformationModal;