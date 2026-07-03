import React from "react";

const CalendarIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M3 10h18" />
  </svg>
);

const MoneyIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 10v4" />
    <path d="M18 10v4" />
  </svg>
);

const UsersIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
    <path d="M16 3.1a4 4 0 0 1 0 7.8" />
  </svg>
);

const StatusIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 12l2 2 4-5" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const FieldIcon = ({ children, tone = "blue" }) => {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    yellow: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-violet-50 text-violet-600 border-violet-100",
  }[tone];

  return (
    <span
      className={`pointer-events-none absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border ${toneClass}`}
    >
      {children}
    </span>
  );
};

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white pl-13 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const selectClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white pl-13 pr-9 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const TourDepartureForm = ({
  formData,
  onChange,
  onSubmit,
  submitText = "Lưu",
  onCancel,
  hideWrapper = false,
  hideActions = false,
}) => {
  const formFields = (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Ngày khởi hành <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <FieldIcon tone="blue">
              <CalendarIcon />
            </FieldIcon>

            <input
              type="date"
              name="departure_date"
              value={formData?.departure_date || ""}
              onChange={onChange}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Ngày về
          </label>

          <div className="relative">
            <FieldIcon tone="green">
              <CalendarIcon />
            </FieldIcon>

            <input
              type="date"
              name="return_date"
              value={formData?.return_date || ""}
              onChange={onChange}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Giá
          </label>

          <div className="relative">
            <FieldIcon tone="yellow">
              <MoneyIcon />
            </FieldIcon>

            <input
              type="number"
              name="price"
              value={formData?.price || ""}
              onChange={onChange}
              min="0"
              className={inputClass}
              placeholder="VD: 3500000"
            />
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Nhập số tiền dạng số, ví dụ: 3500000
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Tổng số chỗ <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <FieldIcon tone="purple">
              <UsersIcon />
            </FieldIcon>

            <input
              type="number"
              name="total_slots"
              value={formData?.total_slots || ""}
              onChange={onChange}
              min="1"
              required
              className={inputClass}
              placeholder="VD: 30"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Trạng thái <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <FieldIcon tone="blue">
              <StatusIcon />
            </FieldIcon>

            <select
              name="status"
              value={formData?.status || "open"}
              onChange={onChange}
              required
              className={selectClass}
            >
              <option value="open">Đang mở</option>
              <option value="closed">Đã đóng</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              ▾
            </span>
          </div>
        </div>
      </div>

      {!hideActions && (
        <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </button>
          )}

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            {submitText}
          </button>
        </div>
      )}
    </>
  );

  if (hideWrapper) {
    return <div>{formFields}</div>;
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Thông tin lịch khởi hành
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Nhập ngày đi, ngày về, giá tour, số chỗ và trạng thái lịch.
        </p>
      </div>

      {formFields}
    </form>
  );
};

export default TourDepartureForm;