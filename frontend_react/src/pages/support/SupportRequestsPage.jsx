import { useEffect, useState } from "react";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import {
  getSupportRequestDetail,
  getSupportRequests,
  updateSupportRequestStatus,
} from "../../services/supportRequestApi";

const STATUS_LABELS = {
  pending: "Chưa hỗ trợ",
  in_progress: "Đang hỗ trợ",
  resolved: "Đã hỗ trợ",
};

const CATEGORY_LABELS = {
  technical: "Lỗi kỹ thuật",
  payment: "Thanh toán",
  account: "Tài khoản",
  feedback: "Góp ý",
  general: "Câu hỏi chung",
};

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function formatDateTime(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function SupportRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  const [counts, setCounts] = useState({
    pending: 0,
    in_progress: 0,
    resolved: 0,
  });

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");

    try {
      const payload = await getSupportRequests({
        search: search || undefined,
        status: status || undefined,
        category: category || undefined,
      });

      setRequests(payload.items || []);
      setCounts(
        payload.counts || {
          pending: 0,
          in_progress: 0,
          resolved: 0,
        },
      );

      if (selected) {
        const stillExists = (payload.items || []).some(
          (item) => item.id === selected.id,
        );

        if (!stillExists && status) {
          setSelected(null);
        }
      }
    } catch (requestError) {
      console.error(requestError);
      setError("Không thể tải danh sách yêu cầu hỗ trợ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequests();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search, status, category]);

  async function openDetail(item) {
    setDetailLoading(true);
    setError("");

    try {
      const detail = await getSupportRequestDetail(item.id);
      setSelected(detail);
    } catch (requestError) {
      console.error(requestError);
      setError("Không thể mở chi tiết yêu cầu hỗ trợ.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeStatus(nextStatus) {
    if (!selected || changingStatus) return;

    setChangingStatus(true);
    setError("");

    try {
      const updated = await updateSupportRequestStatus(
        selected.id,
        nextStatus,
      );

      setSelected(updated);

      await loadRequests();

      window.dispatchEvent(
        new Event("support-request-count-changed"),
      );
    } catch (requestError) {
      console.error(requestError);
      setError("Không thể cập nhật trạng thái yêu cầu.");
    } finally {
      setChangingStatus(false);
    }
  }

  function toggleStatusFilter(nextStatus) {
    setStatus((current) =>
      current === nextStatus ? "" : nextStatus,
    );
  }

  return (
    <section className="min-h-screen space-y-6 pb-10">
      <AdminPageHeader
        breadcrumb={[
          "ViVuGo",
          "Nhân viên hỗ trợ",
          "Yêu cầu hỗ trợ",
        ]}
        title="Yêu cầu hỗ trợ"
        description="Tiếp nhận, theo dõi và xử lý yêu cầu hỗ trợ từ khách hàng."
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {/* ================= THỐNG KÊ TRẠNG THÁI ================= */}
      <div className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => toggleStatusFilter("pending")}
          className={`group rounded-3xl border p-5 text-left shadow-sm transition-all duration-200 ${
            status === "pending"
              ? "border-amber-300 bg-amber-50 shadow-amber-100"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500">
                Chưa hỗ trợ
              </p>
              <strong className="mt-2 block text-3xl font-black text-slate-900">
                {counts.pending}
              </strong>
            </div>

            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            toggleStatusFilter("in_progress")
          }
          className={`group rounded-3xl border p-5 text-left shadow-sm transition-all duration-200 ${
            status === "in_progress"
              ? "border-blue-300 bg-blue-50 shadow-blue-100"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500">
                Đang hỗ trợ
              </p>
              <strong className="mt-2 block text-3xl font-black text-slate-900">
                {counts.in_progress}
              </strong>
            </div>

            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 12a8 8 0 0 1 14.9-4" />
                <path d="M20 4v5h-5" />
                <path d="M20 12a8 8 0 0 1-14.9 4" />
                <path d="M4 20v-5h5" />
              </svg>
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleStatusFilter("resolved")}
          className={`group rounded-3xl border p-5 text-left shadow-sm transition-all duration-200 ${
            status === "resolved"
              ? "border-emerald-300 bg-emerald-50 shadow-emerald-100"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-500">
                Đã hỗ trợ
              </p>
              <strong className="mt-2 block text-3xl font-black text-slate-900">
                {counts.resolved}
              </strong>
            </div>

            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 2.5 2.5L16 9" />
              </svg>
            </span>
          </div>
        </button>
      </div>

      {/* ================= SEARCH + FILTER ================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
          <label className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Tìm theo tên, email, SĐT, mã ticket..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            <option value="">
              Tất cả danh mục
            </option>
            <option value="technical">
              Lỗi kỹ thuật
            </option>
            <option value="payment">
              Thanh toán
            </option>
            <option value="account">
              Tài khoản
            </option>
            <option value="feedback">
              Góp ý
            </option>
            <option value="general">
              Câu hỏi chung
            </option>
          </select>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            <option value="">
              Tất cả trạng thái
            </option>
            <option value="pending">
              Chưa hỗ trợ
            </option>
            <option value="in_progress">
              Đang hỗ trợ
            </option>
            <option value="resolved">
              Đã hỗ trợ
            </option>
          </select>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* DANH SÁCH */}
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="mt-4 text-sm font-semibold text-slate-500">
                Đang tải yêu cầu hỗ trợ...
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2a10 10 0 1 0 10 10" />
                  <path d="M12 8v4" />
                  <circle cx="12" cy="16" r="1" />
                </svg>
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-800">
                Không có yêu cầu phù hợp
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Hãy thay đổi từ khóa hoặc bộ lọc để xem kết quả khác.
              </p>
            </div>
          ) : (
            requests.map((item) => {
              const isSelected =
                selected?.id === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    openDetail(item)
                  }
                  className={`block w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition-all duration-200 ${
                    isSelected
                      ? "border-blue-300 ring-4 ring-blue-50"
                      : "border-slate-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-black text-slate-900">
                          {item.subject}
                        </h3>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                          {item.ticket_code}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-medium text-slate-600">
                        {item.full_name}
                        {" · "}
                        {item.email}
                        {item.phone
                          ? ` · ${item.phone}`
                          : ""}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {CATEGORY_LABELS[
                            item.category
                          ] || item.category}
                        </span>

                        {item.created_at ? (
                          <span>
                            {formatDateTime(
                              item.created_at,
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-extrabold ${
                        STATUS_STYLES[
                          item.status
                        ] ||
                        "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {STATUS_LABELS[
                        item.status
                      ] || item.status}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* CHI TIẾT */}
        <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24">
          {!selected ? (
            <div className="px-7 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4h16v12H5.2L4 18.5V4Z" />
                  <path d="M8 8h8M8 12h5" />
                </svg>
              </div>

              <h3 className="mt-4 text-base font-black text-slate-800">
                Chưa chọn yêu cầu
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Chọn một yêu cầu bên trái để xem thông tin chi tiết và cập nhật trạng thái.
              </p>
            </div>
          ) : detailLoading ? (
            <div className="px-7 py-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="mt-4 text-sm font-semibold text-slate-500">
                Đang tải chi tiết...
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 to-white px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-blue-600">
                      {selected.ticket_code}
                    </span>

                    <h2 className="mt-2 text-xl font-black leading-tight text-slate-900">
                      {selected.subject}
                    </h2>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-extrabold ${
                      STATUS_STYLES[
                        selected.status
                      ] ||
                      "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {STATUS_LABELS[
                      selected.status
                    ] || selected.status}
                  </span>
                </div>
              </div>

              <div className="space-y-6 p-6">
                {/* CUSTOMER */}
                <section>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Khách hàng
                  </p>

                  <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                    <strong className="block text-sm text-slate-900">
                      {selected.full_name}
                    </strong>

                    <p className="mt-1 text-sm text-slate-500">
                      {selected.email}
                    </p>

                    {selected.phone ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {selected.phone}
                      </p>
                    ) : null}
                  </div>
                </section>

                {/* CATEGORY */}
                <section>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Danh mục
                  </p>

                  <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                    {CATEGORY_LABELS[
                      selected.category
                    ] || selected.category}
                  </span>
                </section>

                {/* DESCRIPTION */}
                <section>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Nội dung yêu cầu
                  </p>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {selected.description}
                    </p>
                  </div>
                </section>

                {/* ATTACHMENTS */}
                {selected.attachments?.length ? (
                  <section>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Tệp đính kèm
                    </p>

                    <div className="mt-3 space-y-2">
                      {selected.attachments.map(
                        (attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
                          >
                            <span>📎</span>
                            <span className="min-w-0 truncate">
                              {
                                attachment.original_name
                              }
                            </span>
                          </a>
                        ),
                      )}
                    </div>
                  </section>
                ) : null}

                {/* STATUS */}
                <section className="border-t border-slate-100 pt-5">
                  <label className="block">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Trạng thái xử lý
                    </span>

                    <select
                      value={selected.status}
                      disabled={changingStatus}
                      onChange={(event) =>
                        changeStatus(
                          event.target.value,
                        )
                      }
                      className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="pending">
                        Chưa hỗ trợ
                      </option>

                      <option value="in_progress">
                        Đang hỗ trợ
                      </option>

                      <option value="resolved">
                        Đã hỗ trợ
                      </option>
                    </select>
                  </label>

                  {changingStatus ? (
                    <p className="mt-2 text-xs font-semibold text-blue-600">
                      Đang cập nhật trạng thái...
                    </p>
                  ) : null}

                  {selected.assigned_to ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <span className="text-xs font-bold text-slate-400">
                        Người xử lý
                      </span>

                      <strong className="mt-1 block text-sm text-slate-800">
                        {selected.assigned_to
                          ?.full_name ||
                          "Nhân viên hỗ trợ"}
                      </strong>
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

export default SupportRequestsPage;