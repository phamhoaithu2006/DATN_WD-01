import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { createCustomerSupportRequest } from "../../services/supportRequestApi";
import {
  getMySupportRequestDetail,
  getMySupportRequests,
  getMySupportRequestUnreadCount,
  supplementMySupportRequest,
} from "../../services/supportWorkflowApi";

const STATUS_LABELS = {
  pending: "Đang chờ",
  in_progress: "Đã được tiếp nhận",
  cancelled: "Yêu cầu đã bị hủy",
  resolved: "Đã được xử lý",
};

const STATUS_CLASSES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};


function getDisplayStatus(item) {
  if (item?.needs_more_info) {
    return {
      label: "Cần bổ sung thông tin",
      className: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return {
    label: STATUS_LABELS[item?.status] || item?.status || "Không xác định",
    className:
      STATUS_CLASSES[item?.status] ||
      "bg-slate-100 text-slate-600 border-slate-200",
  };
}

const CATEGORY_LABELS = {
  technical: "Lỗi kỹ thuật",
  payment: "Thanh toán",
  account: "Tài khoản",
  booking: "Đặt tour",
  cancellation: "Hoàn hủy",
  feedback: "Góp ý",
  general: "Câu hỏi chung",
  other: "Khác",
};

const initialForm = {
  full_name: "",
  email: "",
  phone: "",
  category: "general",
  subject: "",
  description: "",
  attachments: [],
};

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function unwrapRequestList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;

  return [];
}

function unwrapDetail(payload) {
  return payload?.data?.data || payload?.data || payload || null;
}

function unwrapCreatedRequest(payload) {
  return payload?.data?.data || payload?.data || payload || null;
}

function getAttachmentUrl(file) {
  return (
    file?.url ||
    file?.file_url ||
    file?.path ||
    file?.file_path ||
    "#"
  );
}

export default function CustomerSupportPage({ profile }) {
  const location = useLocation();
  const openedNotificationRef = useRef("");

  const [activeTab, setActiveTab] = useState("form");

  const [form, setForm] = useState(() => ({
    ...initialForm,
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
  }));

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [formError, setFormError] = useState("");

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [requestError, setRequestError] = useState("");

  const [supplementText, setSupplementText] = useState("");
  const [supplementFiles, setSupplementFiles] = useState([]);
  const [supplementSubmitting, setSupplementSubmitting] =
    useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setForm((current) => ({
      ...current,
      full_name:
        profile?.full_name ||
        current.full_name ||
        "",
      email:
        profile?.email ||
        current.email ||
        "",
      phone:
        profile?.phone ||
        current.phone ||
        "",
    }));
  }, [
    profile?.full_name,
    profile?.email,
    profile?.phone,
  ]);

  async function loadRequests() {
    setRequestsLoading(true);
    setRequestError("");

    try {
      const [payload, total] = await Promise.all([
        getMySupportRequests(),
        getMySupportRequestUnreadCount(),
      ]);

      setItems(unwrapRequestList(payload));
      setUnreadCount(Number(total || 0));
    } catch (error) {
      console.error(
        "Không thể tải danh sách yêu cầu hỗ trợ:",
        error,
      );

      setItems([]);
      setRequestError(
        error?.response?.data?.message ||
          "Không thể tải danh sách yêu cầu hỗ trợ.",
      );
    } finally {
      setRequestsLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const supportRequestId = params.get("supportRequestId");
    const ticketCode = params.get("ticket");

    if (!supportRequestId && !ticketCode) {
      return;
    }

    const openKey = `${supportRequestId || ""}|${ticketCode || ""}`;

    if (openedNotificationRef.current === openKey) {
      return;
    }

    openedNotificationRef.current = openKey;

    async function openFromNotification() {
      setActiveTab("requests");
      setDetailLoading(true);
      setRequestError("");
      setNotice("");

      try {
        let targetId = supportRequestId;

        if (!targetId && ticketCode) {
          const payload = await getMySupportRequests();
          const requestItems = unwrapRequestList(payload);

          setItems(requestItems);

          const target = requestItems.find(
            (item) =>
              String(item.ticket_code || "").toUpperCase() ===
              String(ticketCode).toUpperCase(),
          );

          targetId = target?.id || null;
        }

        if (!targetId) {
          setRequestError(
            "Không tìm thấy yêu cầu hỗ trợ từ thông báo này.",
          );
          return;
        }

        const response = await getMySupportRequestDetail(targetId);
        const detail = unwrapDetail(response);

        setSelected(detail);

        await loadRequests();

        window.dispatchEvent(
          new Event("customer-support-unread-changed"),
        );
      } catch (error) {
        console.error(
          "Không thể mở yêu cầu hỗ trợ từ thông báo:",
          error,
        );

        setRequestError(
          error?.response?.data?.message ||
            "Không thể mở chi tiết yêu cầu hỗ trợ từ thông báo.",
        );
      } finally {
        setDetailLoading(false);
      }
    }

    void openFromNotification();
  }, [location.search]);

  function change(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function changeFiles(event) {
    setForm((current) => ({
      ...current,
      attachments: Array.from(
        event.target.files || [],
      ),
    }));
  }

  async function submit(event) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setFormError("");
    setSuccess(null);

    try {
      const response =
        await createCustomerSupportRequest(
          form,
        );

      const created =
        unwrapCreatedRequest(response);

      setSuccess(created);

      setForm((current) => ({
        ...initialForm,
        full_name: current.full_name,
        email: current.email,
        phone: current.phone,
      }));

      await loadRequests();

      window.dispatchEvent(
        new Event(
          "customer-support-unread-changed",
        ),
      );
    } catch (error) {
      console.error(
        "Không thể gửi yêu cầu hỗ trợ:",
        error,
      );

      const validationErrors =
        error?.response?.data?.errors;

      const firstValidationError =
        validationErrors &&
        Object.values(validationErrors)
          .flat()
          .find(Boolean);

      setFormError(
        firstValidationError ||
          error?.response?.data?.message ||
          "Không thể gửi yêu cầu hỗ trợ.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openRequest(item) {
    if (!item?.id || detailLoading) return;

    setDetailLoading(true);
    setRequestError("");
    setNotice("");

    try {
      const response =
        await getMySupportRequestDetail(
          item.id,
        );

      const detail =
        unwrapDetail(response);

      setSelected(detail);

      await loadRequests();

      window.dispatchEvent(
        new Event(
          "customer-support-unread-changed",
        ),
      );
    } catch (error) {
      console.error(
        "Không thể mở chi tiết yêu cầu:",
        error,
      );

      setRequestError(
        error?.response?.data?.message ||
          "Không thể mở chi tiết yêu cầu hỗ trợ.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitSupplement(event) {
    event.preventDefault();

    if (
      !selected?.id ||
      supplementSubmitting ||
      !supplementText.trim()
    ) {
      return;
    }

    setSupplementSubmitting(true);
    setRequestError("");
    setNotice("");

    try {
      const response =
        await supplementMySupportRequest(
          selected.id,
          {
            message:
              supplementText.trim(),
            attachments:
              supplementFiles,
          },
        );

      setSupplementText("");
      setSupplementFiles([]);

      setNotice(
        response?.message ||
          response?.data?.message ||
          "Đã gửi thông tin bổ sung.",
      );

      const detailResponse =
        await getMySupportRequestDetail(
          selected.id,
        );

      setSelected(
        unwrapDetail(detailResponse),
      );

      await loadRequests();

      window.dispatchEvent(
        new Event(
          "customer-support-unread-changed",
        ),
      );
    } catch (error) {
      console.error(
        "Không thể gửi thông tin bổ sung:",
        error,
      );

      setRequestError(
        error?.response?.data?.message ||
          "Không thể gửi thông tin bổ sung.",
      );
    } finally {
      setSupplementSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f6f8fc_100%)] py-10 md:py-14">
      <div className="mx-auto w-[min(1180px,calc(100%-24px))]">
        {/* HEADER */}
        <section className="mb-8 text-center">
          <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-extrabold tracking-[0.08em] text-blue-600">
            TRUNG TÂM HỖ TRỢ
          </span>

          <h1 className="mt-3 text-3xl font-black text-slate-950 md:text-5xl">
            ViVuGo luôn sẵn sàng hỗ trợ bạn
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
            Gửi yêu cầu mới hoặc theo dõi tiến trình xử lý các yêu cầu hỗ trợ của bạn tại một nơi duy nhất.
          </p>
        </section>

        {/* TABS */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setActiveTab("form");
                setSelected(null);
                setNotice("");
              }}
              className={`min-w-[170px] rounded-xl px-5 py-3 text-sm font-bold transition ${
                activeTab === "form"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-slate-500 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              Form hỗ trợ
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("requests");
                setNotice("");
                void loadRequests();
              }}
              className={`relative min-w-[210px] rounded-xl px-5 py-3 text-sm font-bold transition ${
                activeTab === "requests"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-slate-500 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              Yêu cầu hỗ trợ của bạn

              {unreadCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* FORM TAB */}
        {activeTab === "form" ? (
          <div className="mx-auto max-w-4xl">
            {success ? (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <strong className="text-base">
                      Yêu cầu đã được gửi thành công!
                    </strong>

                    {success?.ticket_code ? (
                      <p className="mt-1 text-sm">
                        Mã yêu cầu:{" "}
                        <b>
                          {success.ticket_code}
                        </b>
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(
                        "requests",
                      );
                      void loadRequests();
                    }}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Xem yêu cầu
                  </button>
                </div>
              </div>
            ) : null}

            {formError ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {formError}
              </div>
            ) : null}

            <form
              onSubmit={submit}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
            >
              <section className="p-6 md:p-8">
                <div className="mb-6 flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-200">
                    01
                  </span>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Thông tin định danh
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Thông tin để chúng tôi liên hệ với bạn.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                  <label className="space-y-2 text-sm font-bold text-slate-700">
                    <span>
                      Họ và tên *
                    </span>

                    <input
                      name="full_name"
                      value={form.full_name}
                      onChange={change}
                      className="h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </label>

                  <label className="space-y-2 text-sm font-bold text-slate-700">
                    <span>
                      Email *
                    </span>

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={change}
                      className="h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </label>

                  <label className="space-y-2 text-sm font-bold text-slate-700">
                    <span>
                      Số điện thoại
                    </span>

                    <input
                      name="phone"
                      value={form.phone}
                      onChange={change}
                      className="h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                </div>
              </section>

              <section className="border-t border-slate-100 p-6 md:p-8">
                <div className="mb-6 flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-200">
                    02
                  </span>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Phân loại vấn đề
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Giúp chúng tôi chuyển yêu cầu tới đúng bộ phận.
                    </p>
                  </div>
                </div>

                <label className="space-y-2 text-sm font-bold text-slate-700">
                  <span>
                    Chủ đề *
                  </span>

                  <select
                    name="category"
                    value={form.category}
                    onChange={change}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="technical">
                      Lỗi kỹ thuật
                    </option>
                    <option value="payment">
                      Thanh toán
                    </option>
                    <option value="account">
                      Tài khoản
                    </option>
                    <option value="booking">
                      Đặt tour
                    </option>
                    <option value="cancellation">
                      Hoàn hủy
                    </option>
                    <option value="feedback">
                      Góp ý
                    </option>
                    <option value="general">
                      Câu hỏi chung
                    </option>
                    <option value="other">
                      Khác
                    </option>
                  </select>
                </label>
              </section>

              <section className="border-t border-slate-100 p-6 md:p-8">
                <div className="mb-6 flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-200">
                    03
                  </span>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Chi tiết sự việc
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Mô tả càng rõ, chúng tôi càng hỗ trợ nhanh.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="block space-y-2 text-sm font-bold text-slate-700">
                    <span>
                      Tiêu đề vấn đề *
                    </span>

                    <input
                      name="subject"
                      value={form.subject}
                      onChange={change}
                      className="h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      placeholder="Ví dụ: Không thể thanh toán tour Đà Nẵng"
                      required
                    />
                  </label>

                  <label className="block space-y-2 text-sm font-bold text-slate-700">
                    <span>
                      Mô tả chi tiết *
                    </span>

                    <textarea
                      name="description"
                      rows="7"
                      value={form.description}
                      onChange={change}
                      className="w-full resize-y rounded-xl border border-slate-200 p-4 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      placeholder="Hãy mô tả vấn đề bạn đang gặp phải..."
                      required
                    />
                  </label>

                  <label className="block space-y-2 text-sm font-bold text-slate-700">
                    <span>
                      Ảnh chụp màn hình / Tài liệu
                    </span>

                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                      onChange={changeFiles}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-500"
                    />
                  </label>

                  {form.attachments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {form.attachments.map(
                        (file) => (
                          <span
                            key={`${file.name}-${file.size}`}
                            className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                          >
                            📎 {file.name}
                          </span>
                        ),
                      )}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? "Đang gửi yêu cầu..."
                      : "Gửi yêu cầu hỗ trợ"}
                  </button>
                </div>
              </section>
            </form>
          </div>
        ) : null}

        {/* REQUEST LIST TAB */}
        {activeTab === "requests" ? (
          <section className="relative mx-auto max-w-5xl">
            {requestError ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {requestError}
              </div>
            ) : null}

            {notice ? (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                {notice}
              </div>
            ) : null}

            {requestsLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <p className="font-bold text-slate-600">
                  Đang tải yêu cầu hỗ trợ...
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <div className="text-4xl">
                  🎫
                </div>

                <h3 className="mt-4 text-xl font-black text-slate-900">
                  Bạn chưa có yêu cầu hỗ trợ nào
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Khi cần hỗ trợ, hãy gửi yêu cầu để đội ngũ ViVuGo giúp bạn.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab("form")
                  }
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
                >
                  Gửi yêu cầu hỗ trợ
                </button>
              </div>
            ) : (
              <>
                {/* DANH SÁCH CARD */}
                <div className="space-y-4">
                  {items.map((item) => {
                    const isSelected =
                      String(
                        selected?.id ||
                          "",
                      ) ===
                      String(item.id);

                    const displayStatus =
                      getDisplayStatus(item);

                    return (
                      <article
                        key={item.id}
                        className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                          isSelected
                            ? "border-blue-400 ring-4 ring-blue-50"
                            : "border-slate-200 hover:border-blue-200 hover:shadow-md"
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-blue-600">
                                {item.ticket_code}
                              </span>

                              {item.customer_has_unread_update ? (
                                <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600">
                                  Có cập nhật mới
                                </span>
                              ) : null}
                            </div>

                            <h3 className="mt-2 text-lg font-black text-slate-900">
                              {item.subject}
                            </h3>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                              <span>
                                Gửi lúc:{" "}
                                {formatDateTime(
                                  item.created_at,
                                )}
                              </span>

                              <span>
                                Danh mục:{" "}
                                <strong className="text-slate-700">
                                  {CATEGORY_LABELS[
                                    item.category
                                  ] ||
                                    item.category}
                                </strong>
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${displayStatus.className}`}
                              >
                                {item.needs_more_info ? "⚠ " : ""}
                                {displayStatus.label}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                void openRequest(
                                  item,
                                )
                              }
                              className={`w-full rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm transition md:w-auto ${
                                item.needs_more_info
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }`}
                            >
                              {item.needs_more_info
                                ? "Bổ sung thông tin"
                                : isSelected
                                  ? "Đang xem chi tiết"
                                  : "Xem chi tiết"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* CARD CHI TIẾT LỒNG LÊN TRÊN TAB YÊU CẦU */}
                {selected ? (
                  <div className="fixed inset-x-0 bottom-0 top-[72px] z-[9999] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] md:p-5">
                    <div className="flex h-[70vh] min-h-[480px] max-h-[650px] w-[min(1450px,calc(100vw-40px))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]">
                      {detailLoading ? (
                        <div className="p-12 text-center text-slate-500">
                          Đang tải chi tiết...
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-slate-50/80 p-6 md:flex-row md:items-start">
                            <div>
                              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-600">
                                {selected.ticket_code}
                              </span>

                              <h2 className="mt-3 text-2xl font-black text-slate-950">
                                {selected.subject}
                              </h2>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-3 py-2 text-xs font-bold ${getDisplayStatus(selected).className}`}
                              >
                                {selected.needs_more_info ? "⚠ " : ""}
                                {getDisplayStatus(selected).label}
                              </span>

                              <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                              >
                                ✕ Đóng
                              </button>
                            </div>
                          </div>

                          <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="text-xs text-slate-400">
                                  Danh mục
                                </span>

                                <strong className="mt-1 block text-sm text-slate-800">
                                  {CATEGORY_LABELS[selected.category] ||
                                    selected.category}
                                </strong>
                              </div>

                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="text-xs text-slate-400">
                                  Ngày gửi
                                </span>

                                <strong className="mt-1 block text-sm text-slate-800">
                                  {formatDateTime(selected.created_at)}
                                </strong>
                              </div>

                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="text-xs text-slate-400">
                                  Trạng thái
                                </span>

                                <strong
                                  className={`mt-1 block text-sm ${
                                    selected.needs_more_info
                                      ? "text-red-700"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {getDisplayStatus(selected).label}
                                </strong>
                              </div>
                            </div>

                            <section className="mt-6">
                              <h3 className="text-sm font-black text-slate-900">
                                Nội dung yêu cầu
                              </h3>

                              <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                                {selected.description}
                              </div>
                            </section>

                            {selected.needs_more_info ? (
                              <form
                                onSubmit={submitSupplement}
                                className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"
                              >
                                <h3 className="font-black text-amber-900">
                                  Bổ sung thông tin yêu cầu
                                </h3>

                                <div className="mt-3 rounded-xl bg-white p-4 text-sm leading-6 text-amber-800">
                                  <strong>
                                    Yêu cầu từ ViVuGo:
                                  </strong>

                                  <p className="mt-1">
                                    {selected.info_request_message}
                                  </p>
                                </div>

                                <textarea
                                  value={supplementText}
                                  onChange={(event) =>
                                    setSupplementText(event.target.value)
                                  }
                                  rows="5"
                                  className="mt-4 w-full rounded-xl border border-amber-200 bg-white p-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  placeholder="Mô tả chi tiết thông tin cần bổ sung..."
                                  required
                                />

                                <input
                                  type="file"
                                  multiple
                                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                                  onChange={(event) =>
                                    setSupplementFiles(
                                      Array.from(event.target.files || []),
                                    )
                                  }
                                  className="mt-3 block w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm"
                                />

                                <button
                                  type="submit"
                                  disabled={supplementSubmitting}
                                  className="mt-4 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60"
                                >
                                  {supplementSubmitting
                                    ? "Đang gửi..."
                                    : "Gửi thông tin bổ sung"}
                                </button>
                              </form>
                            ) : null}

                            {Array.isArray(selected.messages) &&
                            selected.messages.length > 0 ? (
                              <section className="mt-7">
                                <h3 className="text-sm font-black text-slate-900">
                                  Lịch sử trao đổi
                                </h3>

                                <div className="mt-4 space-y-3">
                                  {selected.messages.map((message) => {
                                    const isStaff =
                                      message.sender_type === "support_staff";

                                    return (
                                      <div
                                        key={message.id}
                                        className={`flex ${
                                          isStaff
                                            ? "justify-start"
                                            : "justify-end"
                                        }`}
                                      >
                                        <div
                                          className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                            isStaff
                                              ? "border border-slate-200 bg-slate-50 text-slate-700"
                                              : "bg-blue-600 text-white"
                                          }`}
                                        >
                                          <div className="mb-1 flex justify-between gap-4 text-[10px] opacity-80">
                                            <strong>
                                              {isStaff ? "ViVuGo" : "Bạn"}
                                            </strong>

                                            <span>
                                              {formatDateTime(
                                                message.created_at,
                                              )}
                                            </span>
                                          </div>

                                          {message.message ? (
                                            <p className="text-sm leading-6">
                                              {message.message}
                                            </p>
                                          ) : null}

                                          {Array.isArray(
                                            message.attachments,
                                          ) &&
                                          message.attachments.length > 0 ? (
                                            <div className="mt-2 space-y-1">
                                              {message.attachments.map(
                                                (file) => (
                                                  <a
                                                    key={
                                                      file.id ||
                                                      file.original_name ||
                                                      file.filename
                                                    }
                                                    href={getAttachmentUrl(
                                                      file,
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block text-xs font-semibold underline"
                                                  >
                                                    📎{" "}
                                                    {file.original_name ||
                                                      file.filename ||
                                                      "Tệp đính kèm"}
                                                  </a>
                                                ),
                                              )}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}