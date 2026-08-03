import { useState } from "react";
import Icon from "./Icon";

function normalizePhone(value) {
  return String(value || "").trim().replace(/\D/g, "");
}

function BookingInformationModal({ booking, onClose, onSave }) {
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
  })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateParticipant = (index, field, value) => {
    setParticipants((current) => current.map((participant, participantIndex) => (
      participantIndex === index ? { ...participant, [field]: value } : participant
    )));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">Chỉnh sửa thông tin hành khách</h2>
            <p className="mt-1 text-sm text-slate-500">Số lượng khách, ngày sinh và tổng tiền không thể thay đổi.</p>
          </div>
          <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </header>

        {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

        <section className="space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800">Người liên hệ</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input required value={contact.contact_name} onChange={(event) => setContact((current) => ({ ...current, contact_name: event.target.value }))} placeholder="Họ và tên" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <input required value={contact.contact_phone} onChange={(event) => setContact((current) => ({ ...current, contact_phone: event.target.value }))} placeholder="Số điện thoại" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <input type="email" value={contact.contact_email} onChange={(event) => setContact((current) => ({ ...current, contact_email: event.target.value }))} placeholder="Email" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <input value={contact.address} onChange={(event) => setContact((current) => ({ ...current, address: event.target.value }))} placeholder="Địa chỉ" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <textarea value={contact.special_request} onChange={(event) => setContact((current) => ({ ...current, special_request: event.target.value }))} placeholder="Yêu cầu đặc biệt" rows="3" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </section>

        <section className="mt-7 space-y-3">
          <h3 className="text-sm font-extrabold text-slate-800">Hành khách</h3>
          {participants.map((participant, index) => (
            <div key={participant.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-bold text-slate-700">Hành khách {index + 1}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input required value={participant.full_name} onChange={(event) => updateParticipant(index, "full_name", event.target.value)} placeholder="Họ và tên" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                <input value={participant.phone} onChange={(event) => updateParticipant(index, "phone", event.target.value)} placeholder="Số điện thoại" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                <select value={participant.gender} onChange={(event) => updateParticipant(index, "gender", event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
                <input value={participant.identity_number} onChange={(event) => updateParticipant(index, "identity_number", event.target.value)} placeholder="CCCD/Hộ chiếu" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </div>
            </div>
          ))}
        </section>

        <footer className="mt-7 flex justify-end gap-3">
          <button type="button" className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100" onClick={onClose}>Hủy</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Đang lưu..." : "Lưu thông tin"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default BookingInformationModal;
