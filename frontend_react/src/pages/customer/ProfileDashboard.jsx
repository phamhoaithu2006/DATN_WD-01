import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import Icon from "../../components/customer/Icon";
import LoadingState from "../../components/common/LoadingState";
import TourCard from "../../components/customer/TourCard";
import BookingCountdown from "../../components/customer/BookingCountdown";
import BookingInformationModal from "../../components/customer/BookingInformationModal";
import GuideReviewModal from "../../components/customer/GuideReviewModal";
import TourReviewModal from "../../components/customer/TourReviewModal";
import { useLocale } from "../../contexts/LocaleContext";
import {
  cancelCustomerBooking,
  continueCustomerBookingPayment,
  createDisruptionRequest,
  fetchGuideReviewableBookings,
  updateBookingContact,
  updateBookingParticipants,
  updateCustomerBookingInformation,
} from "../../services/customerApi";
import { mediaUrl } from "../../utils/mediaUrl";

function EmptyState({ icon, title, action }) {
  return (
    <div className="vg-empty">
      <Icon name={icon} size={36} />
      <h2>{title}</h2>
      <Link to="/tours">{action}</Link>
    </div>
  );
}

function CustomerAvatar({ profile }) {
  const [failed, setFailed] = useState(false);
  const avatarSrc = !failed ? mediaUrl(profile.avatar_url) : "";

  return (
    <div className={`vg-avatar ${avatarSrc ? "has-image" : ""}`}>
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={profile.full_name || "Ảnh đại diện"}
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{profile.full_name?.charAt(0)?.toUpperCase() || "V"}</span>
      )}
      <Link to="/customer/profile/edit" title="Chỉnh sửa hồ sơ">
        <Icon name="camera" size={17} />
      </Link>
    </div>
  );
}

function getVehicleIconName(title = "") {
  const t = title.toLowerCase();
  if (t.includes("thuyền") || t.includes("cruise") || t.includes("biển")) return "ship";
  if (t.includes("phú quốc") || t.includes("bay") || t.includes("quốc tế") || t.includes("thái lan") || t.includes("nhật") || t.includes("hàn")) return "plane";
  return "bus";
}

function BookingTicketModal({ booking, onClose, formatCurrency, formatDate }) {
  if (!booking) return null;

  const tourImage = booking.tour?.thumbnail_url || booking.tour?.image || booking.tour?.thumbnail?.image_url || "";
  const tourTitle = booking.tour?.title || "Tour ViVuGo";
  const departureDate = booking.tour_departure?.departure_date ? formatDate(booking.tour_departure.departure_date) : "Đang cập nhật";
  const returnDate = booking.tour_departure?.return_date ? formatDate(booking.tour_departure.return_date) : null;
  const meetingPoint = booking.tour_departure?.meeting_point || "Sẽ được thông báo trước ngày đi 24h";
  const categoryName = booking.tour?.category?.name || booking.tour?.category_name || "Tour du lịch";
  const destinationName = booking.tour?.destination?.name || booking.tour?.destination_name || "Việt Nam";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="vg-ticket-modal-overlay" onClick={onClose}>
      <div className="vg-ticket-modal" onClick={(e) => e.stopPropagation()}>
        <header className="vg-ticket-modal-header">
          <div className="vg-ticket-badge-title">
            <Icon name="sparkle" size={18} />
            <span>VÉ ĐIỆN TỬ VIVUGO • VIVUGO E-TICKET</span>
          </div>
          <button type="button" className="vg-ticket-modal-close" onClick={onClose} title="Đóng vé">
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="vg-ticket-card-stub">
          <div className="vg-ticket-main-section">
            <div className="vg-ticket-top-row">
              <div className="vg-ticket-tour-info">
                {tourImage && (
                  <img src={mediaUrl(tourImage)} alt={tourTitle} className="vg-ticket-tour-img" />
                )}
                <div>
                  <span className="vg-ticket-category">{categoryName} • {destinationName}</span>
                  <h2 className="vg-ticket-tour-title">{tourTitle}</h2>
                  <span className="vg-ticket-code-tag">Mã đơn hàng: <strong>{booking.booking_code}</strong></span>
                </div>
              </div>
            </div>

            <div className="vg-ticket-grid">
              <div className="vg-ticket-cell">
                <span className="vg-ticket-label">Ngày khởi hành</span>
                <strong className="vg-ticket-val">{departureDate}</strong>
              </div>
              {returnDate && (
                <div className="vg-ticket-cell">
                  <span className="vg-ticket-label">Ngày kết thúc dự kiến</span>
                  <strong className="vg-ticket-val">{returnDate}</strong>
                </div>
              )}
              <div className="vg-ticket-cell">
                <span className="vg-ticket-label">Hành khách</span>
                <strong className="vg-ticket-val">{booking.number_of_people} khách</strong>
              </div>
              <div className="vg-ticket-cell">
                <span className="vg-ticket-label">Tổng thanh toán</span>
                <strong className="vg-ticket-val is-price">{formatCurrency(Number(booking.total_amount))}</strong>
              </div>
            </div>

            <div className="vg-ticket-location-box">
              <Icon name="mapPin" size={18} />
              <div>
                <span>Điểm tập trung & Đón khách:</span>
                <strong>{meetingPoint}</strong>
              </div>
            </div>

            <div className="vg-ticket-passenger-box">
              <Icon name="user" size={16} />
              <div>
                <span>Người đặt vé: <strong>{booking.user?.full_name || booking.contact?.full_name || "Khách hàng ViVuGo"}</strong></span>
                <small>Email: {booking.user?.email || booking.contact?.email || "Chưa cập nhật"} | SĐT: {booking.user?.phone || booking.contact?.phone || "Chưa cập nhật"}</small>
              </div>
            </div>
          </div>

          <div className="vg-ticket-divider">
            <div className="vg-ticket-notch top"></div>
            <div className="vg-ticket-dashed-line"></div>
            <div className="vg-ticket-notch bottom"></div>
          </div>

          <div className="vg-ticket-side-stub">
            <div className="vg-ticket-qr-wrap">
              <svg className="vg-qr-svg" viewBox="0 0 100 100" width="120" height="120">
                <rect width="100" height="100" fill="#ffffff" />
                <rect x="5" y="5" width="28" height="28" fill="#0f172a" />
                <rect x="9" y="9" width="20" height="20" fill="#ffffff" />
                <rect x="13" y="13" width="12" height="12" fill="#0f172a" />

                <rect x="67" y="5" width="28" height="28" fill="#0f172a" />
                <rect x="71" y="9" width="20" height="20" fill="#ffffff" />
                <rect x="75" y="13" width="12" height="12" fill="#0f172a" />

                <rect x="5" y="67" width="28" height="28" fill="#0f172a" />
                <rect x="9" y="71" width="20" height="20" fill="#ffffff" />
                <rect x="13" y="75" width="12" height="12" fill="#0f172a" />

                <rect x="40" y="8" width="6" height="6" fill="#0f172a" />
                <rect x="50" y="14" width="10" height="6" fill="#0f172a" />
                <rect x="38" y="24" width="8" height="8" fill="#0f172a" />
                <rect x="52" y="32" width="6" height="12" fill="#0f172a" />
                <rect x="8" y="40" width="12" height="6" fill="#0f172a" />
                <rect x="25" y="44" width="12" height="12" fill="#0f172a" />
                <rect x="42" y="48" width="14" height="6" fill="#0f172a" />
                <rect x="65" y="42" width="12" height="8" fill="#0f172a" />
                <rect x="80" y="40" width="12" height="12" fill="#0f172a" />
                <rect x="42" y="65" width="10" height="10" fill="#0f172a" />
                <rect x="60" y="62" width="12" height="12" fill="#0f172a" />
                <rect x="76" y="65" width="16" height="6" fill="#0f172a" />
                <rect x="40" y="80" width="14" height="12" fill="#0f172a" />
                <rect x="62" y="80" width="12" height="12" fill="#0f172a" />
                <rect x="78" y="78" width="14" height="14" fill="#0f172a" />
              </svg>
              <span className="vg-ticket-qr-code">{booking.booking_code}</span>
              <span className="vg-ticket-qr-hint">Xác nhận trực tiếp với HDV</span>
            </div>

            <div className="vg-ticket-actions">
              <button type="button" className="vg-btn-print" onClick={handlePrint}>
                <Icon name="sparkle" size={15} /> In / Lưu vé
              </button>
              <button type="button" className="vg-btn-close-modal" onClick={onClose}>
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DISRUPTION_TYPE_OPTIONS = [
  {
    value: "refund",
    label: "Hoàn tiền",
    description: "Hủy tour và hoàn lại tiền đã thanh toán.",
  },
  {
    value: "retain",
    label: "Bảo lưu",
    description: "Giữ lại giá trị đơn để đặt tour khác trong tương lai.",
  },
  {
    value: "transfer",
    label: "Đổi lịch khởi hành",
    description: "Chuyển sang một lịch khởi hành khác của cùng tour.",
  },
];

function CancelBookingModal({ booking, onClose, onCancelled }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!booking) return null;

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedReason = reason.trim();

    if (trimmedReason.length < 5) {
      setError("Vui lòng nhập lý do hủy tour (tối thiểu 5 ký tự).");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const updatedBooking = await cancelCustomerBooking(booking.id, trimmedReason);
      onCancelled?.(updatedBooking);
    } catch (submitError) {
      setError(
        submitError.response?.data?.message
        || submitError.response?.data?.errors?.reason?.[0]
        || "Không thể hủy đơn hàng. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="vg-ticket-modal-overlay" onClick={() => !submitting && onClose?.()}>
      <div className="vg-simple-modal" onClick={(e) => e.stopPropagation()}>
        <header className="vg-simple-modal-header">
          <h2>Hủy đơn {booking.booking_code}</h2>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng">
            <Icon name="close" size={18} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="vg-simple-modal-body">
          <p className="vg-simple-modal-hint">
            Vui lòng cho ViVuGo biết lý do hủy tour. Thông tin này sẽ được lưu lại trong lịch sử đơn hàng.
          </p>
          <label>
            Lý do hủy tour
            <textarea
              rows={4}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError("");
              }}
              placeholder="Ví dụ: Thay đổi kế hoạch cá nhân, trùng lịch công việc..."
            />
          </label>
          {error ? <p className="vg-booking-action-error">{error}</p> : null}
          <div className="vg-simple-modal-actions">
            <button type="button" onClick={onClose} disabled={submitting} className="is-ghost">
              Đóng
            </button>
            <button type="submit" disabled={submitting} className="is-danger">
              {submitting ? "Đang hủy..." : "Xác nhận hủy tour"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookingContactEditModal({ booking, onClose, onUpdated, readOnly = false }) {
  const contact = booking?.contact || {};
  const [form, setForm] = useState({
    contact_name: contact.contact_name || "",
    contact_email: contact.contact_email || "",
    contact_phone: contact.contact_phone || "",
    address: contact.address || "",
    special_request: contact.special_request || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!booking) return null;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (readOnly) return;

    if (!form.contact_name.trim() || !form.contact_phone.trim()) {
      setError("Vui lòng nhập đầy đủ họ tên và số điện thoại liên hệ.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const updatedBooking = await updateBookingContact(booking.id, form);
      onUpdated?.(updatedBooking);
    } catch (submitError) {
      const errors = submitError.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat().find(Boolean) : null;
      setError(firstError || submitError.response?.data?.message || "Không thể cập nhật thông tin liên hệ.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="vg-ticket-modal-overlay" onClick={() => !submitting && onClose?.()}>
      <div className="vg-simple-modal" onClick={(e) => e.stopPropagation()}>
        <header className="vg-simple-modal-header">
          <h2>{readOnly ? "Thông tin liên hệ" : "Sửa thông tin liên hệ"}</h2>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng">
            <Icon name="close" size={18} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="vg-simple-modal-body">
          {readOnly ? (
            <p className="vg-simple-modal-hint">
              Tour đang diễn ra nên không thể chỉnh sửa thông tin liên hệ. Bạn chỉ có thể xem lại thông tin bên dưới.
            </p>
          ) : null}
          <label>
            Họ và tên người liên hệ
            <input
              type="text"
              value={form.contact_name}
              onChange={(event) => updateField("contact_name", event.target.value)}
              disabled={readOnly}
            />
          </label>
          <label>
            Số điện thoại
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(event) => updateField("contact_phone", event.target.value)}
              disabled={readOnly}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.contact_email}
              onChange={(event) => updateField("contact_email", event.target.value)}
              disabled={readOnly}
            />
          </label>
          <label>
            Địa chỉ
            <input
              type="text"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              disabled={readOnly}
            />
          </label>
          <label>
            Yêu cầu đặc biệt
            <textarea
              rows={3}
              value={form.special_request}
              onChange={(event) => updateField("special_request", event.target.value)}
              disabled={readOnly}
            />
          </label>
          {error ? <p className="vg-booking-action-error">{error}</p> : null}
          <div className="vg-simple-modal-actions">
            <button type="button" onClick={onClose} disabled={submitting} className="is-ghost">
              Đóng
            </button>
            {readOnly ? null : (
              <button type="submit" disabled={submitting} className="is-primary">
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const GENDER_OPTIONS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];

function ParticipantsEditModal({ booking, onClose, onUpdated, readOnly = false }) {
  const [rows, setRows] = useState(() =>
    (booking?.participants || []).map((p) => ({
      id: p.id,
      full_name: p.full_name || "",
      phone: p.phone || "",
      gender: p.gender || "",
      identity_number: p.identity_number || "",
      participant_type: p.participant_type,
      birth_date: p.birth_date,
    })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!booking) return null;

  function updateRow(index, field, value) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (readOnly) return;

    if (rows.some((row) => !row.full_name.trim())) {
      setError("Vui lòng nhập đầy đủ họ tên cho tất cả hành khách.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const updatedBooking = await updateBookingParticipants(booking.id, {
        participants: rows.map((row) => ({
          id: row.id,
          full_name: row.full_name,
          phone: row.phone || null,
          gender: row.gender || null,
          identity_number: row.identity_number || null,
        })),
      });
      onUpdated?.(updatedBooking);
    } catch (submitError) {
      const errors = submitError.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat().find(Boolean) : null;
      setError(firstError || submitError.response?.data?.message || "Không thể cập nhật thông tin hành khách.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="vg-ticket-modal-overlay" onClick={() => !submitting && onClose?.()}>
      <div className="vg-simple-modal" onClick={(e) => e.stopPropagation()}>
        <header className="vg-simple-modal-header">
          <h2>{readOnly ? `Thông tin hành khách (${rows.length} khách)` : `Sửa thông tin hành khách (${rows.length} khách)`}</h2>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng">
            <Icon name="close" size={18} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="vg-simple-modal-body">
          <p className="vg-simple-modal-hint">
            {readOnly
              ? "Tour đang diễn ra nên không thể chỉnh sửa thông tin hành khách. Bạn chỉ có thể xem lại thông tin bên dưới."
              : "Không thể sửa ngày sinh vì ảnh hưởng đến giá vé. Nếu cần đổi ngày sinh, vui lòng liên hệ hỗ trợ."}
          </p>

          <div className="vg-participant-edit-list">
            {rows.map((row, index) => (
              <div className="vg-participant-edit-item" key={row.id}>
                <div className="vg-participant-edit-item-head">
                  <strong>Hành khách {index + 1}</strong>
                  {row.birth_date ? <small>Ngày sinh: {row.birth_date}</small> : null}
                </div>

                <label>
                  Họ và tên
                  <input
                    type="text"
                    value={row.full_name}
                    onChange={(event) => updateRow(index, "full_name", event.target.value)}
                    disabled={readOnly}
                  />
                </label>

                <div className="vg-participant-edit-row">
                  <label>
                    Số điện thoại
                    <input
                      type="tel"
                      value={row.phone}
                      onChange={(event) => updateRow(index, "phone", event.target.value)}
                      disabled={readOnly}
                    />
                  </label>

                  <label>
                    Giới tính
                    <select
                      value={row.gender}
                      onChange={(event) => updateRow(index, "gender", event.target.value)}
                      disabled={readOnly}
                    >
                      <option value="">-- Chọn --</option>
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  CCCD / Hộ chiếu
                  <input
                    type="text"
                    value={row.identity_number}
                    onChange={(event) => updateRow(index, "identity_number", event.target.value)}
                    disabled={readOnly}
                  />
                </label>
              </div>
            ))}
          </div>

          {error ? <p className="vg-booking-action-error">{error}</p> : null}

          <div className="vg-simple-modal-actions">
            <button type="button" onClick={onClose} disabled={submitting} className="is-ghost">
              Đóng
            </button>
            {readOnly ? null : (
              <button type="submit" disabled={submitting} className="is-primary">
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function DisruptionRequestModal({ booking, onClose, onSubmitted }) {
  const [type, setType] = useState("refund");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!booking) return null;

  async function handleSubmit(event) {
    event.preventDefault();

    if (reason.trim().length < 5) {
      setError("Vui lòng mô tả rõ tình huống (tối thiểu 5 ký tự).");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await createDisruptionRequest(booking.id, {
        type,
        reason: reason.trim(),
      });
      setSuccess(true);
      onSubmitted?.(result);
    } catch (submitError) {
      const errors = submitError.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat().find(Boolean) : null;
      setError(firstError || submitError.response?.data?.message || "Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="vg-ticket-modal-overlay" onClick={() => !submitting && onClose?.()}>
      <div className="vg-simple-modal" onClick={(e) => e.stopPropagation()}>
        <header className="vg-simple-modal-header">
          <h2>Yêu cầu hủy đơn</h2>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng">
            <Icon name="close" size={18} />
          </button>
        </header>

        {success ? (
          <div className="vg-simple-modal-body">
            <p className="vg-simple-modal-success">
              Đã gửi yêu cầu thành công. Nhân viên ViVuGo sẽ liên hệ và xử lý sớm nhất.
            </p>
            <div className="vg-simple-modal-actions">
              <button type="button" onClick={onClose} className="is-primary">
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="vg-simple-modal-body">
            <p className="vg-simple-modal-hint">
              Áp dụng cho đơn <strong>{booking.booking_code}</strong> khi bạn muốn gửi yêu cầu hủy đơn, hoàn tiền, bảo lưu hoặc đổi lịch.
            </p>

            <div className="vg-disruption-type-list">
              {DISRUPTION_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`vg-disruption-type-item ${type === option.value ? "is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="disruption-type"
                    value={option.value}
                    checked={type === option.value}
                    onChange={() => setType(option.value)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>

            <label>
              Lý do hủy đơn
              <textarea
                rows={4}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setError("");
                }}
                placeholder="Ví dụ: Tôi có việc bận đột xuất không thể tham gia chuyến đi..."
              />
            </label>

            {type === "transfer" ? (
              <p className="vg-simple-modal-hint">
                Bạn chưa cần chọn lịch khởi hành mới — nhân viên hỗ trợ sẽ liên hệ để chọn lịch phù hợp còn chỗ trống.
              </p>
            ) : null}

            {error ? <p className="vg-booking-action-error">{error}</p> : null}

            <div className="vg-simple-modal-actions">
              <button type="button" onClick={onClose} disabled={submitting} className="is-ghost">
                Đóng
              </button>
              <button type="submit" disabled={submitting} className="is-primary">
                {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ProfileDashboard({
  route,
  profile,
  summary,
  bookings,
  bookingsLoading = false,
  favoriteTours,
  favoritesLoading = false,
  onFavorite,
  onBookingUpdated,
}) {
  const { formatCurrency, formatDate } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const active = route.includes("bookings")
    ? "bookings"
    : route.includes("favorites")
      ? "favorites"
      : route.includes("settings")
        ? "settings"
        : "profile";
  const bookingCount = summary.bookings_count || bookings.length || 0;
  const wishlistCount = summary.wishlist_count || favoriteTours.length || 0;
  const shortName = profile.full_name || "Khách hàng ViVuGo";
  const [now, setNow] = useState(() => Date.now());
  const [bookingActionId, setBookingActionId] = useState(null);
  const [bookingActionError, setBookingActionError] = useState("");

  // Booking filters & search state
  const [bookingFilter, setBookingFilter] = useState("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingSort, setBookingSort] = useState("newest");
  const [activeTicketBooking, setActiveTicketBooking] = useState(null);
  const [reviewableBookings, setReviewableBookings] = useState([]);
  const [reviewableBookingsLoading, setReviewableBookingsLoading] = useState(false);
  const [reviewableBookingsError, setReviewableBookingsError] = useState("");
  const [activeGuideReview, setActiveGuideReview] = useState(null);
  const [activeTourReview, setActiveTourReview] = useState(null);
  const [cancelTargetBooking, setCancelTargetBooking] = useState(null);
  const [contactEditBooking, setContactEditBooking] = useState(null);
  const [participantsEditBooking, setParticipantsEditBooking] = useState(null);
  const [disruptionBooking, setDisruptionBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editingBookingReadOnly, setEditingBookingReadOnly] = useState(false);

  const selectBookingFilter = (nextFilter) => {
    setBookingFilter(nextFilter);
    setBookingSearch("");
  };

  useEffect(() => {
    if (active !== "bookings") {
      setBookingSearch("");
      return;
    }

    const bookingCode = new URLSearchParams(location.search).get("booking");
    if (!bookingCode) return;

    setBookingSearch(bookingCode);
    navigate("/customer/bookings", { replace: true });
  }, [active, location.search, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (active !== "bookings") return undefined;

    let requestActive = true;

    Promise.resolve().then(() => {
      if (!requestActive) return;
      setReviewableBookingsLoading(true);
      setReviewableBookingsError("");
    });

    fetchGuideReviewableBookings({ per_page: 50 })
      .then((items) => {
        if (requestActive) setReviewableBookings(items);
      })
      .catch((error) => {
        if (!requestActive) return;

        setReviewableBookingsError(
          error.response?.data?.message || "Không thể tải thông tin đánh giá hướng dẫn viên.",
        );
      })
      .finally(() => {
        if (requestActive) setReviewableBookingsLoading(false);
      });

    return () => {
      requestActive = false;
    };
  }, [active]);

  const reviewableBookingById = useMemo(
    () => new Map(reviewableBookings.map((booking) => [Number(booking.id), booking])),
    [reviewableBookings],
  );

  const paymentExpiresAt = useCallback((booking) => booking.payment?.expires_at
    ? new Date(booking.payment.expires_at).getTime()
    : 0, []);

  const canPayBooking = useCallback((booking) => (
    booking.status === "pending"
    && booking.payment_status === "unpaid"
    && booking.payment?.payment_method === "vnpay"
    && booking.payment?.status === "pending"
    && paymentExpiresAt(booking) > now
  ), [now, paymentExpiresAt]);

  const canEditBookingInformation = useCallback((booking) => {
    if (!['pending', 'confirmed'].includes(booking.status)) return false;

    const departureDate = booking.tour_departure?.departure_date;
    if (!departureDate) return false;

    // Không ghép chuỗi thủ công (dễ tạo ra chuỗi ngày không hợp lệ nếu
    // departureDate đã là datetime đầy đủ, ví dụ "...T00:00:00Z") — parse
    // trực tiếp rồi tự chuẩn hoá về đầu ngày để tính hạn chỉnh sửa.
    const departureTime = new Date(departureDate).getTime();
    if (Number.isNaN(departureTime)) return false;

    const deadline = new Date(departureTime);
    deadline.setHours(0, 0, 0, 0);
    deadline.setDate(deadline.getDate() - 3);
    deadline.setHours(23, 59, 59, 999);

    return Date.now() <= deadline.getTime();
  }, []);

  // Dùng cho bộ lọc/trạng thái: chỉ cần booking đang chờ và chưa thanh toán.
  // Không phụ thuộc payment object đã được backend tạo đầy đủ hay chưa.
  const isAwaitingPayment = useCallback((booking) => (
    booking.status === "pending"
    && booking.payment_status === "unpaid"
  ), []);

  const getBookingTripState = useCallback((booking) => {
    if (booking.status === "cancelled" && booking.payment_status === "failed") {
      return "expired";
    }

    if (["cancelled", "cancelled_by_tour"].includes(booking.status)) return "cancelled";

    const departureAt = booking.tour_departure?.departure_date
      ? new Date(booking.tour_departure.departure_date).getTime()
      : 0;
    const returnAt = booking.tour_departure?.return_date
      ? new Date(booking.tour_departure.return_date).getTime()
      : 0;

    // Tour đã kết thúc phải được ưu tiên là "completed",
    // kể cả payment trước đó đã hết hạn trong dữ liệu mẫu.
    if (
      booking.status === "completed"
      || (returnAt > 0 && returnAt <= now)
    ) {
      return "completed";
    }

    // Booking vừa tạo, đang pending và chưa thanh toán phải hiện ở "Chờ thanh toán",
    // kể cả payment object chưa có hoặc chưa đủ trường.
    if (isAwaitingPayment(booking)) {
      const expiresAt = paymentExpiresAt(booking);

      if (expiresAt > 0 && expiresAt <= now) {
        return "expired";
      }

      return "pending";
    }

    // Chỉ booking đã thanh toán mới được xếp theo lịch chuyến đi.
    if (booking.payment_status === "paid") {
      if (departureAt > now) return "upcoming";

      if (
        departureAt > 0
        && departureAt <= now
        && (!returnAt || returnAt > now)
      ) {
        return "ongoing";
      }
    }

    return "other";
  }, [canPayBooking, now, paymentExpiresAt]);

  const stats = useMemo(() => {
    const result = {
      all: bookings.length,
      pending: 0,
      upcoming: 0,
      completed: 0,
      cancelled: 0,
      expired: 0,
      other: 0,
    };

    bookings.forEach((booking) => {
      const state = getBookingTripState(booking);

      if (state === "pending") result.pending++;
      if (state === "upcoming" || state === "ongoing") result.upcoming++;
      if (state === "completed") result.completed++;
      if (state === "cancelled") result.cancelled++;
      if (state === "expired") result.expired++;
      if (state === "other") result.other++;
    });

    return result;
  }, [bookings, getBookingTripState]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const state = getBookingTripState(booking);

      if (bookingFilter !== "all" && state !== bookingFilter) {
        // Tab "Sắp khởi hành" hiển thị cả tour đang diễn ra.
        if (!(bookingFilter === "upcoming" && state === "ongoing")) {
          return false;
        }
      }

      if (bookingSearch.trim()) {
        const q = bookingSearch.trim().toLowerCase();
        const code = (booking.booking_code || "").toLowerCase();
        const title = (booking.tour?.title || "").toLowerCase();
        const dest = (booking.tour?.destination?.name || booking.tour?.destination_name || "").toLowerCase();
        return code.includes(q) || title.includes(q) || dest.includes(q);
      }

      return true;
    }).sort((a, b) => {
      if (bookingFilter === "all") {
        const stateOrder = {
          pending: 0,
          upcoming: 1,
          ongoing: 1,
          completed: 2,
          cancelled: 3,
          expired: 4,
          other: 5,
        };
        const priorityDifference =
          (stateOrder[getBookingTripState(a)] ?? 5) -
          (stateOrder[getBookingTripState(b)] ?? 5);

        if (priorityDifference !== 0) return priorityDifference;
      }

      if (bookingSort === "oldest") {
        return a.id - b.id;
      }
      if (bookingSort === "price_desc") {
        return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      }
      if (bookingSort === "price_asc") {
        return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      }
      return b.id - a.id;
    });
  }, [bookings, bookingFilter, bookingSearch, bookingSort, canPayBooking, now]);

  const renderStatusBadge = (booking) => {
    const state = getBookingTripState(booking);

    if (booking.payment_status === "refund_pending") {
      return (
        <span className="vg-status-badge is-pending-payment">
          <Icon name="clock" size={13} /> Chờ hoàn tiền
        </span>
      );
    }

    if (state === "cancelled") {
      return (
        <span className="vg-status-badge is-cancelled">
          <Icon name="trash" size={13} /> Đã hủy
        </span>
      );
    }

    if (state === "completed") {
      return (
        <span className="vg-status-badge is-paid">
          <Icon name="checkCircle" size={13} /> Đã hoàn thành
        </span>
      );
    }

    if (state === "completed-legacy") {
      return (
        <span className="vg-status-badge is-paid">
          <Icon name="checkCircle" size={13} /> Đã thanh toán
        </span>
      );
    }

    if (state === "upcoming") {
      return (
        <span className="vg-status-badge is-paid">
          <Icon name="calendar" size={13} /> Sắp khởi hành
        </span>
      );
    }

    if (state === "ongoing") {
      return (
        <span className="vg-status-badge is-paid">
          <Icon name="calendar" size={13} /> Đang diễn ra
        </span>
      );
    }

    if (state === "expired") {
      return (
        <span className="vg-status-badge is-expired">
          <Icon name="alertCircle" size={13} /> Đã hết hạn
        </span>
      );
    }

    if (booking.payment_status === "paid") {
      return (
        <span className="vg-status-badge is-paid">
          <Icon name="checkCircle" size={13} /> Đã thanh toán
        </span>
      );
    }

    if (booking.payment_status === "failed") {
      return (
        <span className="vg-status-badge is-failed">
          <Icon name="xCircle" size={13} /> Thanh toán thất bại
        </span>
      );
    }

    if (state === "pending") {
      return (
        <span className="vg-status-badge is-pending-payment">
          <Icon name="clock" size={13} /> Đang đợi thanh toán
        </span>
      );
    }

    return (
      <span className="vg-status-badge">
        {booking.status}
      </span>
    );
  };

  const handleContinuePayment = async (booking) => {
    setBookingActionError("");
    setBookingActionId(booking.id);

    try {
      const payment = await continueCustomerBookingPayment(booking.id);

      if (!payment?.checkout_url) {
        throw new Error("Không thể tạo liên kết thanh toán VNPAY.");
      }

      window.location.assign(payment.checkout_url);
    } catch (error) {
      setBookingActionError(error.response?.data?.message || error.message || "Không thể tiếp tục thanh toán.");
      setBookingActionId(null);
    }
  };

  const handleCancelBooking = (booking) => {
    setBookingActionError("");
    setDisruptionBooking(booking);
  };

  const handleBookingCancelled = (updatedBooking) => {
    onBookingUpdated?.(updatedBooking);
    setCancelTargetBooking(null);
  };

  const handleContactUpdated = (updatedBooking) => {
    onBookingUpdated?.(updatedBooking);
    setContactEditBooking(null);
  };

  const handleParticipantsUpdated = (updatedBooking) => {
    onBookingUpdated?.(updatedBooking);
    setParticipantsEditBooking(null);
  };

  const handleDisruptionSubmitted = () => {
    // Modal tự hiển thị trạng thái thành công, không cần đóng ngay.
  };

  const handleBookingInformationSaved = async (payload) => {
    const updatedBooking = await updateCustomerBookingInformation(editingBooking.id, payload);
    onBookingUpdated?.(updatedBooking);
  };


  const handleGuideReviewSaved = (savedReview) => {
    if (!activeGuideReview) return;

    const bookingId = Number(activeGuideReview.booking.id);
    const guideId = Number(activeGuideReview.guide.id);

    setReviewableBookings((current) => current.map((booking) => {
      if (Number(booking.id) !== bookingId) return booking;

      return {
        ...booking,
        guides: (booking.guides || []).map((guide) => (
          Number(guide.id) === guideId
            ? {
              ...guide,
              reviewed: true,
              review: savedReview,
            }
            : guide
        )),
      };
    }));
  };

  // Cập nhật ngay state `bookings` (qua onBookingUpdated) với đánh giá tour vừa lưu,
  // để mở lại modal là thấy dữ liệu mới mà không cần tải lại trang.
  const handleTourReviewSaved = (savedReview) => {
    if (!activeTourReview?.booking) return;

    const updatedBooking = {
      ...activeTourReview.booking,
      tour_review: savedReview,
    };

    onBookingUpdated?.(updatedBooking);
  };

  return (
    <main className="vg-profile-page">
      <section className="vg-profile-hero">
        <div className="vg-container vg-profile-hero-shell">
          <div className="vg-profile-user">
            <CustomerAvatar profile={profile} />
            <div className="vg-profile-main">
              <span className="vg-profile-kicker">Tài khoản khách hàng</span>
              <h1>{shortName}</h1>
              <p>{profile.email}</p>
              <div className="vg-profile-summary">
                <span>
                  <Icon name="calendar" size={18} /> {bookingCount} chuyến đã đặt
                </span>
                <span>
                  <Icon name="heart" size={18} /> {wishlistCount} tour đã lưu
                </span>
                <span>
                  <Icon name="shield" size={18} /> Hồ sơ đã xác thực
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="vg-container vg-profile-content">
        <nav className="vg-profile-tabs">
          <NavLink className={active === "profile" ? "active" : ""} to="/customer/profile">
            <Icon name="user" /> Hồ sơ
          </NavLink>
          <NavLink className={active === "bookings" ? "active" : ""} to="/customer/bookings">
            <Icon name="calendar" /> Chuyến đi
          </NavLink>
          <NavLink className={active === "favorites" ? "active" : ""} to="/customer/favorites">
            <Icon name="heart" /> Yêu thích
          </NavLink>
          <NavLink className={active === "settings" ? "active" : ""} to="/customer/settings">
            <Icon name="settings" /> Cài đặt
          </NavLink>
        </nav>

        {active === "favorites" ? (
          favoritesLoading ? (
            <LoadingState compact label="Đang tải tour yêu thích..." />
          ) : favoriteTours.length ? (
            <div className="vg-tour-grid vg-profile-grid">
              {favoriteTours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  favorite
                  onFavorite={onFavorite}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="heart"
              title="Chưa có tour yêu thích"
              action="Khám phá tour"
            />
          )
        ) : null}

        {active === "bookings" ? (
          <div className="vg-bookings-wrapper">
            {/* Filter & Search Toolbar */}
            <div className="vg-booking-toolbar">
              <div className="vg-booking-filter-tabs">
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "all" ? "active" : ""}`}
                  onClick={() => selectBookingFilter("all")}
                >
                  Tất cả <span className="vg-filter-count">{stats.all}</span>
                </button>
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "pending" ? "active" : ""}`}
                  onClick={() => selectBookingFilter("pending")}
                >
                  Chờ thanh toán <span className="vg-filter-count is-warn">{stats.pending}</span>
                </button>
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "upcoming" ? "active" : ""}`}
                  onClick={() => selectBookingFilter("upcoming")}
                >
                  Sắp khởi hành <span className="vg-filter-count">{stats.upcoming}</span>
                </button>
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "completed" ? "active" : ""}`}
                  onClick={() => selectBookingFilter("completed")}
                >
                  Hoàn thành <span className="vg-filter-count">{stats.completed}</span>
                </button>
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "cancelled" ? "active" : ""}`}
                  onClick={() => selectBookingFilter("cancelled")}
                >
                  Đã hủy <span className="vg-filter-count">{stats.cancelled}</span>
                </button>
                <button
                  type="button"
                  className={`vg-filter-btn ${bookingFilter === "expired" ? "active" : ""}`}
                  onClick={() => selectBookingFilter("expired")}
                >
                  Đã hết hạn <span className="vg-filter-count is-warn">{stats.expired}</span>
                </button>
                {stats.other > 0 ? (
                  <button
                    type="button"
                    className={`vg-filter-btn ${bookingFilter === "other" ? "active" : ""}`}
                    onClick={() => selectBookingFilter("other")}
                  >
                    Khác <span className="vg-filter-count">{stats.other}</span>
                  </button>
                ) : null}
              </div>

              <div className="vg-booking-search-sort">
                <div className="vg-booking-search-box">
                  <Icon name="search" size={16} />
                  <input
                    type="text"
                    placeholder="Tìm theo mã đơn hoặc tên tour..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                  />
                  {bookingSearch ? (
                    <button type="button" onClick={() => setBookingSearch("")}>
                      <Icon name="close" size={14} />
                    </button>
                  ) : null}
                </div>

                <div className="vg-booking-sort-box">
                  <select value={bookingSort} onChange={(e) => setBookingSort(e.target.value)}>
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="price_desc">Giá: Cao đến thấp</option>
                    <option value="price_asc">Giá: Thấp đến cao</option>
                  </select>
                </div>
              </div>
            </div>

            {!bookingsLoading && reviewableBookingsLoading ? (
              <p className="vg-guide-review-load-state">Đang kiểm tra các tour có thể đánh giá...</p>
            ) : null}
            {reviewableBookingsError ? (
              <p className="vg-booking-action-error">{reviewableBookingsError}</p>
            ) : null}

            {/* Bookings List */}
            {bookingsLoading ? (
              <LoadingState label="Đang tải chuyến đi của bạn..." />
            ) : filteredBookings.length ? (
              <div className="vg-bookings">
                {bookingActionError ? <p className="vg-booking-action-error">{bookingActionError}</p> : null}
                {filteredBookings.map((booking) => {
                  const isPendingPayment = canPayBooking(booking);
                  const cancellationLimitReached = Number(booking.customer_cancellation_count || 0)
                    >= Number(booking.customer_cancellation_limit || 2);
                  const bookingTripState = getBookingTripState(booking);
                  // Tour đang diễn ra (đã khởi hành, chưa kết thúc): khách chỉ được XEM
                  // thông tin liên hệ/hành khách, không được sửa, không được yêu cầu xử lý
                  // mưa bão hay hủy đơn nữa.
                  const isOngoingTrip = bookingTripState === "ongoing";
                  // Chỉ đơn "sắp diễn ra" (chưa khởi hành, đã xác nhận, chưa hết hạn) mới cho
                  // phép khách tự sửa thông tin, gửi yêu cầu xử lý mưa bão hoặc hủy đơn.
                  // Đơn đã hết hạn / đã hủy / đã hoàn thành / đang diễn ra đều không hiện các nút này.
                  const canManageBooking = bookingTripState === "upcoming";
                  const hasPendingDisruption = Boolean(
                    booking.has_pending_disruption
                    || booking.pending_disruption_request
                    || booking.disruption_requests?.some((r) => r.status === "pending")
                  );
                  const tourImage = booking.tour?.thumbnail_url || booking.tour?.image || booking.tour?.thumbnail?.image_url || "";
                  const departureDate = booking.tour_departure?.departure_date ? formatDate(booking.tour_departure.departure_date) : null;
                  const returnDate = booking.tour_departure?.return_date ? formatDate(booking.tour_departure.return_date) : null;
                  const destinationName = booking.tour?.destination?.name || booking.tour?.destination_name || "";
                  const meetingPoint = booking.tour_departure?.meeting_point || "Thông báo trước 24h";
                  const unitPrice = Number(booking.unit_price || (booking.total_amount && booking.number_of_people ? Number(booking.total_amount) / booking.number_of_people : 0));
                  const durationText = booking.tour?.duration || (booking.tour?.duration_days ? `${booking.tour.duration_days}N${booking.tour.duration_nights || 0}Đ` : "Chuyến đi");
                  const reviewableBooking = reviewableBookingById.get(Number(booking.id));

                  const rawGuideCandidates = [
                    ...(reviewableBooking?.guides || []),
                    ...(booking?.guides || []),
                    ...(booking?.tour_departure?.guides || []),
                    booking?.tour_departure?.guide,
                    booking?.guide,
                    booking?.assigned_guide,
                    booking?.tour_guide,
                  ].filter(Boolean);

                  const reviewableGuides = rawGuideCandidates
                    .map((item) => item?.guide || item)
                    .filter((guide, index, list) => (
                      guide?.id
                      && list.findIndex((candidate) => Number(candidate?.id) === Number(guide.id)) === index
                    ));

                  // Dùng kết quả kiểm tra từ backend để nút/form đánh giá luôn
                  // đồng nhất với điều kiện API. `reviewableBooking` là fallback
                  // cho dữ liệu cũ chưa có trường can_review_tour.
                  const canReviewBooking = Boolean(
                    bookingTripState === "completed"
                    || booking.can_review_tour
                    || reviewableBooking,
                  );
                  const guideForReview = reviewableGuides.find((guide) => !guide.reviewed)
                    || reviewableGuides[0]
                    || null;

                  return (
                    <article key={booking.id} className={`vg-booking-card ${isPendingPayment ? "is-pending-payment-card" : ""}`}>
                      {tourImage ? (
                        <div className="vg-booking-thumb">
                          <img
                            src={mediaUrl(tourImage)}
                            alt={booking.tour?.title || "Tour ViVuGo"}
                            onError={(e) => {
                              e.currentTarget.parentElement.style.display = "none";
                            }}
                          />
                        </div>
                      ) : null}

                      <div className="vg-booking-details">
                        <div className="vg-booking-header-line">
                          <div className="vg-booking-tags">
                            <span className="vg-booking-code-chip">
                              <Icon name="briefcase" size={13} /> {booking.booking_code}
                            </span>
                            <span className="vg-booking-created-date">Ngày đặt: {formatDate(booking.created_at)}</span>
                            {hasPendingDisruption ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                <Icon name="alertCircle" size={12} /> Đơn này đã có yêu cầu đang chờ xử lý
                              </span>
                            ) : null}
                          </div>
                          {destinationName ? (
                            <span className="vg-booking-dest-chip">
                              <Icon name="mapPin" size={13} /> {destinationName}
                            </span>
                          ) : null}
                        </div>

                        <h3 className="vg-booking-title">
                          <Link to={booking.tour?.slug ? `/tours/${booking.tour.slug}` : "#"}>
                            {booking.tour?.title || "Tour Du Lịch ViVuGo"}
                          </Link>
                        </h3>

                        {/* Visual Trip Track Bar */}
                        {(() => {
                          const tourTitle = booking.tour?.title || "";
                          const vehicleIcon = getVehicleIconName(tourTitle);
                          return (
                            <div className="vg-trip-track-container">
                              <div className="vg-track-node">
                                <span className="vg-node-label">
                                  <span className="vg-node-dot is-start"></span> Khởi hành
                                </span>
                                <strong className="vg-node-date">{departureDate || "Đang cập nhật"}</strong>
                              </div>

                              <div className="vg-track-line-wrapper">
                                <div className="vg-track-line-dashed"></div>
                                <div className="vg-track-badge">
                                  <Icon name={vehicleIcon} size={14} />
                                  <span>{durationText}</span>
                                </div>
                              </div>

                              <div className="vg-track-node is-end">
                                <span className="vg-node-label">
                                  Kết thúc <span className="vg-node-dot is-end"></span>
                                </span>
                                <strong className="vg-node-date">{returnDate || "Đang cập nhật"}</strong>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Trip Meta Footer */}
                        <div className="vg-booking-meta-row">
                          <span className="vg-meta-item">
                            <Icon name="users" size={14} /> {booking.number_of_people} khách {unitPrice > 0 ? `(${formatCurrency(unitPrice)}/khách)` : ""}
                          </span>
                          {meetingPoint ? (
                            <span className="vg-meta-item is-meeting" title={`Điểm tập trung: ${meetingPoint}`}>
                              <Icon name="mapPin" size={14} /> {meetingPoint}
                            </span>
                          ) : null}
                        </div>

                        {canReviewBooking ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {guideForReview ? (
                              <button
                                type="button"
                                onClick={() => setActiveGuideReview({
                                  booking: reviewableBooking || booking,
                                  guide: guideForReview,
                                })}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-white px-4 text-xs font-extrabold text-blue-600 transition hover:bg-blue-50"
                              >
                                <Icon name={guideForReview.reviewed ? "edit" : "star"} size={14} />
                                {guideForReview.reviewed ? "Sửa đánh giá HDV" : "Đánh giá HDV"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                title="Booking này chưa có dữ liệu hướng dẫn viên từ API"
                                className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-5 text-sm font-black text-slate-500 shadow-sm opacity-90"
                              >
                                <Icon name="star" size={14} />
                                Chưa có HDV
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setActiveTourReview({
                                booking,
                                bookingId: booking.id,
                                tourId: booking.tour?.id,
                                tourDepartureId: booking.tour_departure?.id,
                                tourTitle: booking.tour?.title || "Tour đã hoàn thành",
                                existingReview: booking.tour_review || null,
                              })}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-600 bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-sm font-black text-white shadow-md shadow-amber-200 transition hover:-translate-y-0.5 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg active:translate-y-0"
                            >
                              <Icon name={booking.tour_review ? "edit" : "star"} size={14} />
                              {booking.tour_review ? "Sửa đánh giá tour" : "Đánh giá tour"}
                            </button>
                          </div>
                        ) : null}

                        {isPendingPayment && booking.payment?.expires_at ? (
                          <div className="vg-booking-countdown-wrapper">
                            <BookingCountdown
                              expiresAt={booking.payment.expires_at}
                              onExpire={() => setNow(Date.now())}
                            />
                          </div>
                        ) : null}

                        {booking.payment_status === "refund_pending" ? (
                          <p className="vg-booking-action-error">
                            Hủy đơn thành công. Vui lòng liên hệ nhân viên hộ trợ để được hoàn toàn
                          </p>
                        ) : null}

                        {hasPendingDisruption ? (
                          <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-semibold text-amber-800">
                            <Icon name="alertCircle" size={15} /> Đơn này đã có yêu cầu đang chờ xử lý, vui lòng đợi ViVuGo phản hồi.
                          </p>
                        ) : null}
                      </div>

                      <div className="vg-booking-summary-side">
                        <div className="vg-booking-status-wrap">
                          {renderStatusBadge(booking)}
                        </div>

                        <div className="vg-price-block">
                          <span className="vg-price-label">Tổng thanh toán</span>
                          <strong className="vg-price-value">{formatCurrency(Number(booking.total_amount))}</strong>
                        </div>

                        <div className="vg-booking-actions-row">
                          {(canManageBooking || isOngoingTrip) ? (
                            <button
                              type="button"
                              className="vg-btn-ticket"
                              onClick={() => {
                                setEditingBookingReadOnly(!canEditBookingInformation(booking));
                                setEditingBooking(booking);
                              }}
                            >
                              <Icon name={canEditBookingInformation(booking) ? "edit" : "eye"} size={15} />
                              {canEditBookingInformation(booking) ? "Sửa thông tin" : "Xem thông tin"}
                            </button>
                          ) : null}
                          {isPendingPayment ? (
                            <div className="vg-booking-actions">
                              <button
                                type="button"
                                className="is-pay"
                                onClick={() => handleContinuePayment(booking)}
                                disabled={bookingActionId === booking.id}
                              >
                                <Icon name="creditCard" size={14} />
                                {bookingActionId === booking.id ? "Đang xử lý..." : "Thanh toán"}
                              </button>
                              <button
                                type="button"
                                className="is-cancel"
                                onClick={() => handleCancelBooking(booking)}
                                disabled={bookingActionId === booking.id || cancellationLimitReached}
                                title={cancellationLimitReached ? "Bạn đã dùng hết 2 lần hủy booking theo chính sách." : undefined}
                              >
                                Hủy đơn
                              </button>
                            </div>
                          ) : (
                            <div className="vg-booking-actions-group">
                              {booking.status !== "cancelled" && bookingTripState !== "expired" && (
                                <button
                                  type="button"
                                  className="vg-btn-ticket"
                                  onClick={() => setActiveTicketBooking(booking)}
                                >
                                  <Icon name="eye" size={15} /> Vé điện tử
                                </button>
                              )}

                              {canManageBooking ? (
                                <button
                                  type="button"
                                  className="is-cancel"
                                  onClick={() => handleCancelBooking(booking)}
                                  disabled={bookingActionId === booking.id || cancellationLimitReached || hasPendingDisruption}
                                  title={
                                    hasPendingDisruption
                                      ? "Đơn này đã có yêu cầu đang chờ xử lý, vui lòng đợi ViVuGo phản hồi."
                                      : cancellationLimitReached
                                        ? "Bạn đã dùng hết 2 lần hủy booking theo chính sách."
                                        : undefined
                                  }
                                >
                                  {hasPendingDisruption ? "Đang chờ xử lý" : "Hủy đơn"}
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon="calendar"
                title={bookingSearch ? "Không tìm thấy chuyến đi phù hợp" : "Chưa có chuyến đi nào ở mục này"}
                action="Khám phá tour ngay"
              />
            )}
          </div>
        ) : null}

        {active === "profile" ? (
          <div className="vg-profile-overview">
            <section className="vg-profile-card">
              <header>
                <div>
                  <span>Thông tin cá nhân</span>
                  <h2>Hồ sơ của bạn</h2>
                </div>
                <Link to="/customer/profile/edit">
                  <Icon name="edit" size={18} /> Chỉnh sửa
                </Link>
              </header>
              <div className="vg-profile-info-grid">
                <div>
                  <span>Họ và tên</span>
                  <strong>{profile.full_name || "Chưa cập nhật"}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{profile.email || "Chưa cập nhật"}</strong>
                </div>
                <div>
                  <span>Số điện thoại</span>
                  <strong>{profile.phone || "Chưa cập nhật"}</strong>
                </div>
              </div>
            </section>

            <aside className="vg-profile-side">
              <div>
                <Icon name="wallet" size={22} />
                <span>Tổng giá trị đặt tour</span>
                <strong>
                  {formatCurrency(
                    bookings.reduce(
                      (total, booking) => total + Number(booking.total_amount || 0),
                      0,
                    ),
                  )}
                </strong>
              </div>
              <Link to="/customer/password">
                <Icon name="shield" size={19} /> Đổi mật khẩu
              </Link>
            </aside>
          </div>
        ) : null}

        {active === "settings" ? (
          <div className="vg-settings-card">
            <h2>Tùy chọn tài khoản</h2>
            <label>
              <span>
                <strong>Nhận ưu đãi qua email</strong>
                <small>Cập nhật tour mới và chương trình khuyến mãi.</small>
              </span>
              <input type="checkbox" defaultChecked />
            </label>
            <label>
              <span>
                <strong>Lưu lịch sử tìm kiếm</strong>
                <small>Giúp ViVuGo đề xuất hành trình phù hợp hơn.</small>
              </span>
              <input type="checkbox" defaultChecked />
            </label>
          </div>
        ) : null}
      </section>

      {/* Interactive E-Ticket Modal */}
      {activeTicketBooking ? (
        <BookingTicketModal
          booking={activeTicketBooking}
          onClose={() => setActiveTicketBooking(null)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      ) : null}

      {editingBooking ? (
        <BookingInformationModal
          key={editingBooking.id}
          booking={editingBooking}
          readOnly={editingBookingReadOnly}
          onClose={() => {
            setEditingBooking(null);
            setEditingBookingReadOnly(false);
          }}
          onSave={handleBookingInformationSaved}
        />
      ) : null}


      <GuideReviewModal
        key={activeGuideReview ? `${activeGuideReview.booking.id}-${activeGuideReview.guide.id}` : "guide-review-closed"}
        target={activeGuideReview}
        onClose={() => setActiveGuideReview(null)}
        onSubmitted={(savedReview) => {
          handleGuideReviewSaved(savedReview);
          setActiveGuideReview(null);
        }}
      />

      <TourReviewModal
        key={activeTourReview ? `tour-${activeTourReview.bookingId}` : "tour-review-closed"}
        target={activeTourReview}
        onClose={() => setActiveTourReview(null)}
        onSubmitted={(savedReview) => {
          handleTourReviewSaved(savedReview);
          setActiveTourReview(null);
        }}
      />

      {cancelTargetBooking ? (
        <CancelBookingModal
          booking={cancelTargetBooking}
          onClose={() => setCancelTargetBooking(null)}
          onCancelled={handleBookingCancelled}
        />
      ) : null}

      {contactEditBooking ? (
        <BookingContactEditModal
          booking={contactEditBooking}
          onClose={() => setContactEditBooking(null)}
          onUpdated={handleContactUpdated}
          readOnly={contactEditBooking.__viewOnly === true}
        />
      ) : null}

      {participantsEditBooking ? (
        <ParticipantsEditModal
          booking={participantsEditBooking}
          onClose={() => setParticipantsEditBooking(null)}
          onUpdated={handleParticipantsUpdated}
          readOnly={participantsEditBooking.__viewOnly === true}
        />
      ) : null}

      {disruptionBooking ? (
        <DisruptionRequestModal
          booking={disruptionBooking}
          onClose={() => setDisruptionBooking(null)}
          onSubmitted={handleDisruptionSubmitted}
        />
      ) : null}
    </main>
  );
}

export default ProfileDashboard;