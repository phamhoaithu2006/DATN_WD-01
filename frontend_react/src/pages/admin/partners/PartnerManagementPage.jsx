import { useCallback, useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import { partnerApi } from "../../../services/partnerApi";
import "../../../styles/partner-management.css";
import "../../../styles/support-staff.css";

const STATUS_OPTIONS = [
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
];
const EMPTY_FORM = {
  name: "",
  service_type_id: "",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  contract_start: "",
  contract_end: "",
  status: "",
  description: "",
};
const SERVICE_LABELS = {
  flight: "Chuyến bay",
  hotel: "Khách sạn",
  restaurant: "Nhà hàng",
  transport: "Vận chuyển",
  train: "Tàu hỏa",
  cruise: "Du thuyền",
  insurance: "Bảo hiểm",
  attraction: "Điểm tham quan",
};

const n = (v) =>
  String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const unwrap = (p) => p?.data ?? p;
const list = (p) => {
  const r = unwrap(p);
  return Array.isArray(r)
    ? r
    : Array.isArray(r?.data)
      ? r.data
      : Array.isArray(r?.data?.data)
        ? r.data.data
        : [];
};
const meta = (p) => {
  const r = unwrap(p),
    m = r?.data && !Array.isArray(r.data) ? r.data : r;
  return !m || Array.isArray(m) || typeof m !== "object"
    ? { currentPage: 1, lastPage: 1, total: 0, perPage: 10 }
    : {
        currentPage: m.current_page || 1,
        lastPage: m.last_page || 1,
        total: m.total || 0,
        perPage: m.per_page || 10,
      };
};
const stats = (p) => p?.data?.data || p?.data || {};
const fmtDate = (v) => {
  if (!v) return "—";

  const raw = String(v).trim();
  const datePart = raw.includes("T") ? raw.slice(0, 10) : raw;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
};
const fmtRange = (s, e) =>
  !s && !e ? "—" : [fmtDate(s), fmtDate(e)].filter(Boolean).join(" - ");
const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "DT";
const partnerName = (p) =>
  p.name || p.partner_name || p.company_name || p.title || "—";
const partnerCode = (p) =>
  p.partner_code ||
  p.code ||
  p.partner_id ||
  `DT${String(p.id).padStart(3, "0")}`;
const partnerType = (p) =>
  p.service_type || p.type || p.partner_type || p.serviceType?.slug || "";
const partnerTypeLabel = (p) =>
  p.service_type_label ||
  p.serviceType?.name ||
  p.type_label ||
  SERVICE_LABELS[partnerType(p)] ||
  partnerType(p) ||
  "—";
const serviceTypeId = (p) =>
  String(
    p.service_type_id ||
      p.serviceType?.id ||
      p.service_type?.id ||
      p.serviceTypeId ||
      "",
  );
const partnerContact = (p) => ({
  name: p.contact_name || p.contact_person || p.contact || "",
  phone: p.phone || p.contact_phone || "",
  email: p.email || p.contact_email || "",
  website: p.website || p.website_url || "",
});
const partnerStatus = (p) => p.status || (p.deleted_at ? "hidden" : "active");
const norm = (p) => ({
  ...p,
  displayName: partnerName(p),
  displayCode: partnerCode(p),
  displayType: partnerType(p),
  displayTypeId: serviceTypeId(p),
  displayTypeLabel: partnerTypeLabel(p),
  displayContact: partnerContact(p),
  displayStatus: partnerStatus(p),
  displayRating: Number(p.rating ?? p.average_rating ?? p.score ?? 0),
  displayLogo: p.logo_url || p.logo || p.avatar_url || "",
  displayContractStart:
    p.contract_start || p.contract_from || p.start_date || "",
  displayContractEnd: p.contract_end || p.contract_to || p.end_date || "",
  displayCreatedAt: p.created_at || p.createdAt || "",
  displayUpdatedAt: p.updated_at || p.updatedAt || "",
});
const optList = (arr = []) =>
  arr
    .map((i) => {
      if (!i) return null;
      const value = String(i.id || i.value || i.key || "");
      if (!value) return null;
      return {
        value,
        label: i.name || i.label || i.slug || SERVICE_LABELS[i.slug] || value,
        slug: i.slug || i.value || i.key || "",
      };
    })
    .filter(Boolean);
const getMsg = (e, f) =>
  Object.values(e.response?.data?.errors || {})
    .flat()
    .join(" ") ||
  e.response?.data?.message ||
  f;

const isValidUrl = (value) => {
  if (!value.trim()) return true;

  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
};
const isValidPhone = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
};

function Icon({ type }) {
  return type === "detail" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5c5 0 9 4 10 7-1 3-5 7-10 7s-9-4-10-7c1-3 5-7 10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : type === "edit" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}
function Badge({ label, tone = "blue" }) {
  return <span className={`partner-badge ${tone}`}>{label}</span>;
}

function PartnerFormModal({
  editingPartner,
  form,
  formErrors,
  logoCurrentUrl,
  logoFile,
  logoPreviewUrl,
  logoInputRef,
  logoRemoveRequested,
  saving,
  onChange,
  onClose,
  onClearLogo,
  onRequestRemoveLogo,
  onOpenLogoPicker,
  onPickLogo,
  onSubmit,
  typeOptions,
}) {
  return (
    <div
      className="partner-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="partner-modal"
        noValidate
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="partner-modal-header">
          <div>
            <p>{editingPartner ? "Cập nhật đối tác" : "Thêm đối tác"}</p>
            <h2>
              {editingPartner
                ? `Mã hiển thị: ${partnerCode(editingPartner)}`
                : "Đối tác dịch vụ mới"}
            </h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="partner-form-grid">
          <label>
            Tên đối tác
            <input value={form.name} onChange={onChange("name")} />
            {formErrors.name ? (
              <span className="partner-error">{formErrors.name}</span>
            ) : null}
          </label>
          <label>
            Loại dịch vụ
            <select
              value={form.service_type_id}
              onChange={onChange("service_type_id")}
            >
              <option value="" disabled>
                Chọn loại dịch vụ
              </option>
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {formErrors.service_type_id ? (
              <span className="partner-error">
                {formErrors.service_type_id}
              </span>
            ) : null}
          </label>
          <label>
            Người liên hệ
            <input
              value={form.contact_name}
              onChange={onChange("contact_name")}
            />
            {formErrors.contact_name ? (
              <span className="partner-error">{formErrors.contact_name}</span>
            ) : null}
          </label>
          <label>
            Số điện thoại
            <input value={form.phone} onChange={onChange("phone")} />
            {formErrors.phone ? (
              <span className="partner-error">{formErrors.phone}</span>
            ) : null}
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={onChange("email")}
            />
            {formErrors.email ? (
              <span className="partner-error">{formErrors.email}</span>
            ) : null}
          </label>
          <label>
            Website
            <input value={form.website} onChange={onChange("website")} />
            {formErrors.website ? (
              <span className="partner-error">{formErrors.website}</span>
            ) : null}
          </label>
          <label>
            Địa chỉ
            <input value={form.address} onChange={onChange("address")} />
            {formErrors.address ? (
              <span className="partner-error">{formErrors.address}</span>
            ) : null}
          </label>
          <label>
            Ngày bắt đầu hợp đồng
            <input
              type="date"
              value={form.contract_start}
              onChange={onChange("contract_start")}
            />
            {formErrors.contract_start ? (
              <span className="partner-error">{formErrors.contract_start}</span>
            ) : null}
          </label>
          <label>
            Ngày kết thúc hợp đồng
            <input
              type="date"
              value={form.contract_end}
              onChange={onChange("contract_end")}
            />
            {formErrors.contract_end ? (
              <span className="partner-error">{formErrors.contract_end}</span>
            ) : null}
          </label>
          <label>
            Trạng thái
            <select value={form.status} onChange={onChange("status")}>
              <option value="" disabled>
                Chọn trạng thái
              </option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {formErrors.status ? (
              <span className="partner-error">{formErrors.status}</span>
            ) : null}
          </label>
          <label className="partner-form-wide">
            Mô tả
            <textarea
              rows="4"
              value={form.description}
              onChange={onChange("description")}
            />
            {formErrors.description ? (
              <span className="partner-error">{formErrors.description}</span>
            ) : null}
          </label>
          <label className="partner-form-wide">
            Logo đối tác
            <div className="partner-logo-upload">
              <input
                accept="image/*"
                className="partner-logo-input"
                ref={logoInputRef}
                type="file"
                onChange={onPickLogo}
              />
              <div className="partner-logo-preview">
                {logoPreviewUrl || logoCurrentUrl ? (
                  <img alt="Logo đối tác" src={logoPreviewUrl || logoCurrentUrl} />
                ) : (
                  <span>Chưa có logo</span>
                )}
              </div>
              <div className="partner-logo-panel">
                <button
                  className="partner-logo-button"
                  type="button"
                  onClick={onOpenLogoPicker}
                >
                  {logoCurrentUrl ? "Đổi logo" : "Chọn logo"}
                </button>
                <span className="partner-logo-meta">
                  {logoFile
                    ? `Đã chọn: ${logoFile.name}`
                    : logoCurrentUrl
                      ? "Đang có logo hiện tại."
                      : "Chưa chọn logo."}
                </span>
                {logoFile ? (
                  <button
                    className="partner-logo-link"
                    type="button"
                    onClick={onClearLogo}
                  >
                    Bỏ file đã chọn
                  </button>
                ) : null}
                {editingPartner && logoCurrentUrl && !logoFile ? (
                  <button
                    className="partner-logo-link"
                    type="button"
                    onClick={onRequestRemoveLogo}
                  >
                    {logoRemoveRequested
                      ? "Đã chọn xóa logo hiện tại"
                      : "Xóa logo hiện tại"}
                  </button>
                ) : null}
              </div>
            </div>
          </label>
        </div>
        <div className="partner-modal-actions">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary" disabled={saving} type="submit">
            {saving
              ? "Đang lưu..."
              : editingPartner
                ? "Lưu thay đổi"
                : "Thêm đối tác"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PartnerDetailModal({ partner, loading, onClose }) {
  const c = partner ? partnerContact(partner) : {};
  return (
    <div
      className="partner-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="partner-modal partner-detail-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="partner-modal-header">
          <div>
            <p>Chi tiết đối tác</p>
            <p className="partner-modal-code">
              {partner ? `Mã hiển thị: ${partnerCode(partner)}` : "—"}
            </p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        {loading ? (
          <div className="partner-empty-state">
            Đang tải dữ liệu chi tiết...
          </div>
        ) : (
          <>
            <div className="partner-detail-head">
              <div className="partner-avatar large">
                {partner?.displayLogo ? (
                  <img alt={partnerName(partner)} src={partner.displayLogo} />
                ) : (
                  <span>{initials(partnerName(partner))}</span>
                )}
              </div>
              <div>
                <h3>{partnerName(partner)}</h3>
                <div className="partner-detail-tags">
                  <Badge
                    label={
                      partner?.displayStatus === "active"
                        ? "Hoạt động"
                        : partner?.displayStatus === "inactive"
                          ? "Ngừng hoạt động"
                          : partner?.displayStatus || "—"
                    }
                    tone={
                      partner?.displayStatus === "active" ? "green" : "amber"
                    }
                  />
                </div>
              </div>
            </div>
            <dl className="partner-detail-grid">
              <div>
                <dt>Loại dịch vụ</dt>
                <dd>{partnerTypeLabel(partner)}</dd>
              </div>
              <div>
                <dt>Người liên hệ</dt>
                <dd>{c.name || "—"}</dd>
              </div>
              <div>
                <dt>Số điện thoại</dt>
                <dd>{c.phone || "—"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{c.email || "—"}</dd>
              </div>
              <div>
                <dt>Website</dt>
                <dd>{c.website || "—"}</dd>
              </div>
              <div>
                <dt>Hợp đồng</dt>
                <dd>
                  {fmtRange(
                    partner?.displayContractStart,
                    partner?.displayContractEnd,
                  )}
                </dd>
              </div>
              <div>
                <dt>Ngày tạo</dt>
                <dd>{fmtDate(partner?.displayCreatedAt)}</dd>
              </div>
              <div>
                <dt>Cập nhật gần nhất</dt>
                <dd>{fmtDate(partner?.displayUpdatedAt)}</dd>
              </div>
            </dl>
            <div className="partner-detail-section">
              <h3>Mô tả</h3>
              <p>{partner?.description || "Chưa có mô tả."}</p>
            </div>
            <div className="partner-modal-actions">
              <button className="primary" type="button" onClick={onClose}>
                Đóng
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function PartnerManagementPage() {
  const [partners, setPartners] = useState([]),
    [statistics, setStatistics] = useState({}),
    [serviceTypes, setServiceTypes] = useState([]),
    [search, setSearch] = useState(""),
    [filterStatus, setFilterStatus] = useState("all"),
    [page, setPage] = useState(1),
    [pagination, setPagination] = useState({
      currentPage: 1,
      lastPage: 1,
      total: 0,
      perPage: 10,
    }),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [detailLoading, setDetailLoading] = useState(false),
    [formVisible, setFormVisible] = useState(false),
    [editingPartner, setEditingPartner] = useState(null),
    [detailPartner, setDetailPartner] = useState(null),
    [deleteTarget, setDeleteTarget] = useState(null),
    [deleting, setDeleting] = useState(false),
    [notice, setNotice] = useState(null),
    [form, setForm] = useState(EMPTY_FORM),
    [formErrors, setFormErrors] = useState({}),
    [logoFile, setLogoFile] = useState(null),
    [logoCurrentUrl, setLogoCurrentUrl] = useState(""),
    [logoPreviewUrl, setLogoPreviewUrl] = useState(""),
    [logoRemoveRequested, setLogoRemoveRequested] = useState(false);
  const logoInputRef = useRef(null);
  const normalized = useMemo(() => partners.map(norm), [partners]);
  const typeOptions = useMemo(() => optList(serviceTypes), [serviceTypes]);
  const visible = useMemo(() => {
    const k = n(search.trim());
    return normalized.filter((p) => {
      const ok =
        !k ||
        n(
          [
            p.displayName,
            p.displayCode,
            p.displayTypeLabel,
            p.displayContact.name,
            p.displayContact.phone,
            p.displayContact.email,
            p.description,
          ].join(" "),
        ).includes(k);
      return ok && (filterStatus === "all" || p.displayStatus === filterStatus);
    });
  }, [filterStatus, normalized, search]);
  const loadData = useCallback(
    async (pageNumber = page) => {
      setLoading(true);
      try {
        const [lr, sr] = await Promise.all([
          partnerApi.getAll({
            page: pageNumber,
            per_page: 10,
            keyword: search.trim() || undefined,
            status: filterStatus !== "all" ? filterStatus : undefined,
          }),
          partnerApi.getStatistics().catch(() => null),
        ]);
        setPartners(list(lr));
        setPagination(meta(lr));
        setStatistics(stats(sr));
      } catch (e) {
        if (e.response?.status === 404) {
          setPartners([]);
          setPagination({ currentPage: 1, lastPage: 1, total: 0, perPage: 10 });
          setStatistics({});
        } else
          setNotice({
            type: "error",
            text: getMsg(e, "Không tải được danh sách đối tác."),
          });
      } finally {
        setLoading(false);
      }
    },
    [filterStatus, page, search],
  );
  const loadServiceTypes = useCallback(async () => {
    try {
      setServiceTypes(list(await partnerApi.getServiceTypes()));
    } catch {
      return undefined;
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void loadData(page), 250);
    return () => clearTimeout(t);
  }, [loadData, page]);
  useEffect(() => {
    const t = setTimeout(() => void loadServiceTypes(), 0);
    return () => clearTimeout(t);
  }, [loadServiceTypes]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 10000);
    return () => clearTimeout(t);
  }, [notice]);
  const openToast = (type, text) => setNotice({ type, text });
  const resetForm = (nextPartner = null) => {
    void loadServiceTypes();
    clearLogoSelection();
    if (nextPartner) {
      const matched =
        nextPartner.service_type_id ||
        serviceTypes.find((i) => i.slug === nextPartner.service_type)?.id ||
        serviceTypes.find((i) => i.name === nextPartner.service_type_label)
          ?.id ||
        "";
      setForm({
        name:
          nextPartner.name ||
          nextPartner.partner_name ||
          nextPartner.company_name ||
          "",
        service_type_id: String(matched),
        contact_name:
          nextPartner.contact_name || nextPartner.contact_person || "",
        phone: nextPartner.phone || nextPartner.contact_phone || "",
        email: nextPartner.email || nextPartner.contact_email || "",
        address: nextPartner.address || "",
        website: nextPartner.website || nextPartner.website_url || "",
        contract_start:
          nextPartner.contract_start || nextPartner.contract_from || "",
        contract_end: nextPartner.contract_end || nextPartner.contract_to || "",
        status: nextPartner.status || "",
        description: nextPartner.description || "",
      });
      setLogoFile(null);
      setLogoCurrentUrl(nextPartner.displayLogo || nextPartner.logo_url || "");
      setLogoPreviewUrl("");
      setLogoRemoveRequested(false);
      setEditingPartner(nextPartner);
    } else {
      setForm(EMPTY_FORM);
      setEditingPartner(null);
      setLogoFile(null);
      setLogoCurrentUrl("");
      setLogoPreviewUrl("");
      setLogoRemoveRequested(false);
    }
    setFormErrors({});
    setFormVisible(true);
  };
  const closeForm = () => {
    setFormVisible(false);
    setEditingPartner(null);
    setFormErrors({});
    setLogoCurrentUrl("");
    setLogoRemoveRequested(false);
    clearLogoSelection();
  };
  const changeField = (field) => (event) => {
    const v = event.target.value;
    setForm((c) => ({ ...c, [field]: v }));
    setFormErrors((c) => {
      if (field === "website") {
        if (!v.trim()) return { ...c, website: "" };
        return {
          ...c,
          website: isValidUrl(v)
            ? ""
            : "Website phải là URL hợp lệ, ví dụ https://example.com.",
        };
      }
      if (field === "email") {
        if (!v.trim()) return { ...c, email: "" };
        return {
          ...c,
          email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
            ? ""
            : "Email không hợp lệ.",
        };
      }
      if (field === "phone") {
        if (!v.trim()) return { ...c, phone: "" };
        return {
          ...c,
          phone: isValidPhone(v.trim()) ? "" : "Số điện thoại không hợp lệ.",
        };
      }
      return { ...c, [field]: "" };
    });
  };
  const pickLogo = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      return;
    }
    setLogoFile(file);
    setLogoRemoveRequested(false);
    setLogoPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return file ? URL.createObjectURL(file) : "";
    });
  };
  const clearLogoSelection = () => {
    setLogoFile(null);
    setLogoPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return "";
    });
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };
  const requestRemoveLogo = () => {
    setLogoRemoveRequested(true);
    setLogoFile(null);
    setLogoPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return "";
    });
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };
  const openLogoPicker = () => {
    logoInputRef.current?.click();
  };
  const buildPayload = (f) => ({
    service_type_id: Number(f.service_type_id),
    name: f.name.trim(),
    contact_person: f.contact_name.trim() || null,
    phone: f.phone.trim() || null,
    email: f.email.trim() || null,
    address: f.address.trim() || null,
    website: f.website.trim() || null,
    description: f.description.trim() || null,
    contract_start: f.contract_start || null,
    contract_end: f.contract_end || null,
    status: f.status,
  });
  const validate = (f) => {
    const e = {},
      st = Number(f.service_type_id);
    if (!f.name.trim()) e.name = "Vui lòng nhập tên đối tác.";
    else if (f.name.trim().length > 255)
      e.name = "Tên đối tác tối đa 255 ký tự.";
    if (!Number.isInteger(st) || st <= 0)
      e.service_type_id = "Vui lòng chọn loại dịch vụ.";
    if (!f.contact_name.trim()) e.contact_name = "Vui lòng nhập người liên hệ.";
    if (!f.phone.trim()) e.phone = "Vui lòng nhập số điện thoại.";
    else if (!isValidPhone(f.phone.trim()))
      e.phone = "Số điện thoại không hợp lệ.";
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
      e.email = "Email không hợp lệ.";
    if (f.website.trim() && !isValidUrl(f.website))
      e.website = "Website phải là URL hợp lệ, ví dụ https://example.com.";
    if (!f.contract_start) e.contract_start = "Vui lòng chọn ngày bắt đầu hợp đồng.";
    if (!f.contract_end) e.contract_end = "Vui lòng chọn ngày kết thúc hợp đồng.";
    else if (
      f.contract_start &&
      f.contract_end &&
      new Date(f.contract_end) < new Date(f.contract_start)
      )
      e.contract_end = "Ngày kết thúc phải lớn hơn ngày bắt đầu.";
    if (!f.status) e.status = "Vui lòng chọn trạng thái.";
    return e;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(form);
      const res = editingPartner
        ? await partnerApi.update(editingPartner.id, payload)
        : await partnerApi.create(payload);
      const partnerId =
        res.data?.data?.id || res.data?.id || editingPartner?.id || null;
      let logoUploadFailed = false;

      if (logoFile && partnerId) {
        try {
          await partnerApi.uploadLogo(partnerId, logoFile);
        } catch {
          logoUploadFailed = true;
        }
      } else if (editingPartner && logoRemoveRequested && partnerId) {
        try {
          await partnerApi.deleteLogo(partnerId);
        } catch {
          logoUploadFailed = true;
        }
      }
      openToast(
        "success",
        res.data?.message ||
          res.message ||
          (editingPartner ? "Đã cập nhật đối tác." : "Đã thêm đối tác.") +
            (logoUploadFailed ? " Logo chưa tải lên được." : ""),
      );
      closeForm();
      await loadData(page);
    } catch (err) {
      const se = err.response?.data?.errors;
      if (se)
        setFormErrors(
          Object.entries(se).reduce(
            (a, [k, m]) => ((a[k] = Array.isArray(m) ? m[0] : String(m)), a),
            {},
          ),
        );
      openToast(
        "error",
        getMsg(
          err,
          "Không lưu được thông tin đối tác. Vui lòng kiểm tra các trường đang báo lỗi.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };
  const openDetail = async (p) => {
    setDetailPartner(p);
    setDetailLoading(true);
    try {
      const res = await partnerApi.getOne(p.id);
      setDetailPartner(norm(res?.data?.data || res?.data || p));
    } catch (err) {
      openToast("error", getMsg(err, "Không tải được chi tiết đối tác."));
    } finally {
      setDetailLoading(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await partnerApi.remove(deleteTarget.id);
      openToast(
        "success",
        res.data?.message || res.message || "Đã xóa mềm đối tác.",
      );
      setDeleteTarget(null);
      await loadData(page);
    } catch (err) {
      openToast("error", getMsg(err, "Không xóa được đối tác."));
    } finally {
      setDeleting(false);
    }
  };
  const total = statistics.total ?? pagination.total ?? normalized.length,
    active =
      statistics.active ??
      normalized.filter((i) => i.displayStatus === "active").length,
    hidden =
      statistics.inactive ??
      normalized.filter((i) => i.displayStatus === "inactive").length;
  return (
    <section className="partner-page">
      <AdminPageHeader
        breadcrumb={["ViVuGo", "Quản Lý Dịch Vụ Đối Tác"]}
        title="Quản Lý Dịch Vụ Đối Tác"
        description="Quản lý danh sách đối tác, thống kê theo loại dịch vụ."
        actions={
          <>
            <Link className="partner-secondary-button" to="/admin/partners/trash">
              Thùng rác
            </Link>
            <button
              className="partner-primary-button"
              type="button"
              onClick={() => resetForm(null)}
            >
              <span aria-hidden="true">+</span>Thêm đối tác
            </button>
          </>
        }
      />
      <div className="partner-stat-grid">
        <button
          className={`partner-stat-card blue ${filterStatus === "all" ? "is-active" : ""}`}
          type="button"
          onClick={() => {
            setFilterStatus("all");
            setPage(1);
          }}
        >
          <strong>{total}</strong>
          <span>Tổng đối tác</span>
          <small>Toàn bộ đối tác</small>
        </button>
        <button
          className={`partner-stat-card green ${filterStatus === "active" ? "is-active" : ""}`}
          type="button"
          onClick={() => {
            setFilterStatus("active");
            setPage(1);
          }}
        >
          <strong>{active}</strong>
          <span>Đang hoạt động</span>
          <small>Sẵn sàng hợp tác</small>
        </button>
        <button
          className={`partner-stat-card purple ${filterStatus === "inactive" ? "is-active" : ""}`}
          type="button"
          onClick={() => {
            setFilterStatus("inactive");
            setPage(1);
          }}
        >
          <strong>{hidden}</strong>
          <span>Ngừng hoạt động</span>
          <small>Tạm ngưng hợp tác</small>
        </button>
      </div>
      <div className="partner-filter-panel">
        <div className="partner-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm kiếm theo tên, mã, email, số điện thoại..."
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="partner-table-wrap">
        <div className="partner-table-scroll">
          <table className="partner-table">
            <colgroup>
              <col className="partner-col-logo" style={{ width: "92px" }} />
              <col className="partner-col-code" style={{ width: "130px" }} />
              <col className="partner-col-name" style={{ width: "340px" }} />
              <col className="partner-col-type" style={{ width: "170px" }} />
              <col className="partner-col-contact" style={{ width: "250px" }} />
              <col className="partner-col-contract" style={{ width: "148px" }} />
              <col className="partner-col-status" style={{ width: "116px" }} />
              <col className="partner-col-actions" style={{ width: "176px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Logo</th>
                <th>Mã</th>
                <th>Tên đối tác</th>
                <th>Loại dịch vụ</th>
                <th>Liên hệ</th>
                <th>Hợp đồng</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="partner-empty-row" colSpan="8">
                    <div className="partner-loading">
                      <span />
                      <p>Đang tải danh sách đối tác...</p>
                    </div>
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td className="partner-empty-row" colSpan="8">
                    <div className="partner-empty-state">
                      <strong>Không tìm thấy đối tác phù hợp</strong>
                      <span>Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="partner-avatar">
                        {p.displayLogo ? (
                          <img alt={partnerName(p)} src={p.displayLogo} />
                        ) : (
                          <span>{initials(partnerName(p))}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="partner-inline-code">
                        {partnerCode(p)}
                      </span>
                    </td>
                    <td>
                      <strong>{partnerName(p)}</strong>
                    </td>
                    <td>
                      <Badge label={partnerTypeLabel(p)} tone="blue" />
                    </td>
                    <td>
                      <div className="partner-contact">
                        <strong>{p.displayContact.phone || "—"}</strong>
                        <small>{p.displayContact.email || "—"}</small>
                      </div>
                    </td>
                    <td>
                      <div className="partner-contract-cell">
                        <div className="partner-contract">
                          <strong>{fmtDate(p.displayContractStart)}</strong>
                          <small>{fmtDate(p.displayContractEnd)}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="partner-status-cell">
                        <Badge
                          label={
                            p.displayStatus === "active"
                              ? "Hoạt động"
                              : p.displayStatus === "inactive"
                                ? "Ngừng hoạt động"
                                : p.displayStatus || "—"
                          }
                          tone={p.displayStatus === "active" ? "green" : "amber"}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="partner-actions">
                        <button
                          type="button"
                          onClick={() => openDetail(p)}
                          title="Chi tiết"
                          aria-label="Chi tiết"
                        >
                          <Icon type="detail" />
                        </button>
                        <button
                          type="button"
                          onClick={() => resetForm(p)}
                          title="Sửa"
                          aria-label="Sửa"
                        >
                          <Icon type="edit" />
                        </button>
                        <button
                          className="danger"
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          title="Xóa"
                          aria-label="Xóa"
                        >
                          <Icon type="delete" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="partner-pagination">
          <button
            type="button"
            onClick={() => setPage((c) => Math.max(1, c - 1))}
            disabled={pagination.currentPage <= 1 || loading}
            aria-label="Trang trước"
          >
            ←
          </button>
          <span>
            {pagination.currentPage} / {pagination.lastPage}
          </span>
          <button
            type="button"
            onClick={() => setPage((c) => Math.min(pagination.lastPage, c + 1))}
            disabled={pagination.currentPage >= pagination.lastPage || loading}
            aria-label="Trang sau"
          >
            →
          </button>
        </div>
      </div>
      {formVisible ? (
        <PartnerFormModal
          editingPartner={editingPartner}
          form={form}
          formErrors={formErrors}
          logoCurrentUrl={logoCurrentUrl}
          logoFile={logoFile}
          logoInputRef={logoInputRef}
          logoPreviewUrl={logoPreviewUrl}
          logoRemoveRequested={logoRemoveRequested}
          onChange={changeField}
          onClose={closeForm}
          onClearLogo={clearLogoSelection}
          onOpenLogoPicker={openLogoPicker}
          onPickLogo={pickLogo}
          onRequestRemoveLogo={requestRemoveLogo}
          onSubmit={handleSubmit}
          saving={saving}
          typeOptions={typeOptions}
        />
      ) : null}
      {detailPartner ? (
        <PartnerDetailModal loading={detailLoading} onClose={() => setDetailPartner(null)} partner={detailPartner} />
      ) : null}
      {deleteTarget ? (
        <div
          className="support-modal-backdrop"
          role="presentation"
          onMouseDown={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        >
          <div
            className="support-delete-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="support-delete-icon">!</div>
            <h3>Xóa mềm đối tác?</h3>
            <p>
              Bạn có chắc muốn xóa <strong>{partnerName(deleteTarget)}</strong>{" "}
              khỏi hệ thống?
            </p>
            <div className="support-modal-actions">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Hủy
              </button>
              <button
                className="danger primary"
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Đang xóa..." : "Xóa mềm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {notice ? (
        <div className={`support-toast ${notice.type}`}>
          <div>
            <strong>
              {notice.type === "success" ? "Thành công" : "Có lỗi xảy ra"}
            </strong>
            <p>{notice.text}</p>
          </div>
          <button type="button" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      ) : null}
    </section>
  );
}
