import React from "react";
import { Link } from "react-router-dom";

const EditIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

const CalendarIcon = ({ className = "w-5 h-5" }) => (
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

const GuideIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c.8-4.1 3.4-6 8-6s7.2 1.9 8 6" />
  </svg>
);

const EmptyIcon = ({ className = "w-10 h-10" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M3 10h18" />
    <path d="M9 15h6" />
  </svg>
);

const TourDepartureTable = ({
  departures = [],
  selectedTourId,
  onDelete,
  assignmentPath = "/admin/tour-departures/guide-assignments",
}) => {
  const formatDate = (date) => {
    if (!date) return "-";

    const rawDate = String(date).slice(0, 10);
    const parsedDate = new Date(`${rawDate}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) return "-";

    return parsedDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === "") return "-";

    const numberPrice = Number(price);

    if (Number.isNaN(numberPrice)) return "-";

    return `${numberPrice.toLocaleString("vi-VN")}đ`;
  };

  const getStatusMeta = (status) => {
    switch (status) {
      case "open":
        return {
          text: "Đang mở",
          badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
          dot: "bg-emerald-500",
        };

      case "closed":
        return {
          text: "Đã đóng",
          badge: "bg-slate-100 text-slate-700 ring-slate-200",
          dot: "bg-slate-400",
        };

      case "completed":
        return {
          text: "Hoàn thành",
          badge: "bg-sky-50 text-sky-700 ring-sky-100",
          dot: "bg-sky-500",
        };

      case "cancelled":
        return {
          text: "Đã hủy",
          badge: "bg-rose-50 text-rose-700 ring-rose-100",
          dot: "bg-rose-500",
        };

      default:
        return {
          text: status || "Không rõ",
          badge: "bg-gray-50 text-gray-700 ring-gray-200",
          dot: "bg-gray-400",
        };
    }
  };

  const getRemainSlotClass = (remainSlots) => {
    if (remainSlots <= 0) {
      return "text-rose-600 bg-rose-50 ring-rose-100";
    }

    if (remainSlots <= 5) {
      return "text-amber-600 bg-amber-50 ring-amber-100";
    }

    return "text-emerald-600 bg-emerald-50 ring-emerald-100";
  };

  const getAssignments = (departure) => {
    if (Array.isArray(departure.assigned_guides)) {
      return departure.assigned_guides;
    }

    if (Array.isArray(departure.guide_assignments)) {
      return departure.guide_assignments;
    }

    if (Array.isArray(departure.guideAssignments)) {
      return departure.guideAssignments;
    }

    return [];
  };

  const getLeadAssignment = (departure) => {
    const assignments = getAssignments(departure);

    return (
      assignments.find(
        (assignment) =>
          assignment.status === "assigned" &&
          (assignment.role === "lead" || !assignment.role)
      ) ||
      assignments.find((assignment) => assignment.status === "assigned") ||
      null
    );
  };

  const getGuideName = (assignment) => {
    if (!assignment) return "";

    return (
      assignment.guide?.user?.full_name ||
      assignment.guide?.user?.name ||
      assignment.guide_name ||
      assignment.user?.full_name ||
      assignment.user?.name ||
      assignment.guide?.guide_code ||
      `HDV #${assignment.guide_id || assignment.guide?.id || ""}`
    );
  };

  const getGuideAvatar = (assignment) => {
    return (
      assignment?.guide?.user?.avatar_url ||
      assignment?.user?.avatar_url ||
      ""
    );
  };

  const getGuideCode = (assignment) => {
    return (
      assignment?.guide?.guide_code ||
      assignment?.guide_code ||
      ""
    );
  };

  const getAssignmentMeta = (departure) => {
    const leadAssignment = getLeadAssignment(departure);
    const state = departure.assignment_state;

    if (leadAssignment || state === "assigned") {
      return {
        text: "Đã phân công",
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        dot: "bg-emerald-500",
        row: "bg-emerald-50/25",
      };
    }

    if (state === "blocked") {
      return {
        text: "Hết HDV phù hợp",
        badge: "bg-rose-50 text-rose-700 ring-rose-100",
        dot: "bg-rose-500",
        row: "bg-rose-50/25",
      };
    }

    return {
      text: "Chưa phân công",
      badge: "bg-amber-50 text-amber-700 ring-amber-100",
      dot: "bg-amber-500",
      row: "bg-amber-50/20",
    };
  };

  const getAssignmentLink = (departureId) => {
    const params = new URLSearchParams();

    if (selectedTourId) {
      params.set("tourId", selectedTourId);
    }

    if (departureId) {
      params.set("departureId", departureId);
    }

    const query = params.toString();

    return query ? `${assignmentPath}?${query}` : assignmentPath;
  };

  const getEditLink = (departureId) => {
    if (selectedTourId) {
      return `/admin/tour-departures/${selectedTourId}/edit/${departureId}`;
    }

    return `/admin/tour-departures/edit/${departureId}`;
  };

  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)] ring-1 ring-white">
      <div className="border-b border-slate-100 px-5 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-[#0575f9] ring-1 ring-sky-100">
              <CalendarIcon />
            </div>

            <div>
              <h2 className="text-[20px] font-black tracking-[-0.03em] text-slate-950">
                Danh sách lịch khởi hành
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Quản lý lịch khởi hành, số chỗ và phân công hướng dẫn viên.
              </p>
            </div>
          </div>

          <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
            {departures.length} lịch
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-t-xl border border-b-0 border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-[#0575f9]">
            Lịch khởi hành
          </span>

          <Link
            to={assignmentPath}
            className="inline-flex items-center gap-2 rounded-t-xl border border-b-0 border-transparent px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
          >
            <GuideIcon />
            Phân công HDV
          </Link>
        </div>
      </div>

      <div className="p-5">
        <div className="overflow-hidden rounded-[18px] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-center text-[12px] font-black uppercase tracking-[0.04em] text-slate-500">
                  <th className="border-b border-slate-200 px-4 py-4">
                    STT
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4 text-left">
                    Ngày đi
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4 text-left">
                    Ngày về
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4 text-left">
                    Thời điểm tạo
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4 text-right">
                    Giá
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4">
                    Tổng chỗ
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4">
                    Đã đặt
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4">
                    Còn lại
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4 text-left">
                    HDV phụ trách
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4">
                    Phân công
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4">
                    Trạng thái tour
                  </th>

                  <th className="border-b border-slate-200 px-4 py-4">
                    Hành động
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {departures.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-14">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                          <EmptyIcon />
                        </div>

                        <p className="text-base font-black text-slate-800">
                          Chưa có lịch khởi hành
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Khi thêm lịch khởi hành, dữ liệu sẽ hiển thị tại đây.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  departures.map((item, index) => {
                    const totalSlots = Number(item.total_slots || 0);
                    const bookedSlots = Number(item.booked_slots || 0);
                    const remainSlots = Math.max(
                      totalSlots - bookedSlots,
                      0
                    );

                    const statusMeta = getStatusMeta(item.status);
                    const assignmentMeta = getAssignmentMeta(item);
                    const leadAssignment = getLeadAssignment(item);

                    return (
                      <tr
                        key={item.id}
                        className={`text-slate-700 transition duration-150 hover:bg-sky-50/40 ${assignmentMeta.row}`}
                      >
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-600 ring-1 ring-slate-200">
                            {index + 1}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-left">
                          <p className="font-bold text-slate-900">
                            {formatDate(item.departure_date)}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-left">
                          <p className="font-bold text-slate-900">
                            {formatDate(
                              item.return_date || item.departure_date
                            )}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-left">
                          <p className="font-semibold text-slate-700">
                            {formatDateTime(item.created_at)}
                          </p>

                          <span className="text-xs text-slate-400">
                            Ngày tạo lịch
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <p className="font-black text-slate-950">
                            {formatPrice(item.price)}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="font-bold text-slate-700">
                            {totalSlots}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="font-bold text-slate-700">
                            {bookedSlots}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex min-w-[54px] justify-center rounded-full px-3 py-1 text-xs font-black ring-1 ${getRemainSlotClass(
                              remainSlots
                            )}`}
                          >
                            {remainSlots}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-left">
                          {leadAssignment ? (
                            <div className="flex items-center gap-2.5">
                              {getGuideAvatar(leadAssignment) ? (
                                <img
                                  src={getGuideAvatar(leadAssignment)}
                                  alt={getGuideName(leadAssignment)}
                                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                                />
                              ) : (
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-700">
                                  HDV
                                </span>
                              )}

                              <div className="min-w-0">
                                <p className="truncate font-black text-slate-900">
                                  {getGuideName(leadAssignment)}
                                </p>

                                <p className="mt-0.5 text-xs font-medium text-slate-500">
                                  {getGuideCode(leadAssignment) || "HDV chính"}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-slate-500">
                              Chưa có HDV
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${assignmentMeta.badge}`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${assignmentMeta.dot}`}
                            />

                            {assignmentMeta.text}
                          </span>

                          {!leadAssignment &&
                          Number(item.available_guide_count) > 0 ? (
                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                              {item.available_guide_count} HDV phù hợp
                            </p>
                          ) : null}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${statusMeta.badge}`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${statusMeta.dot}`}
                            />

                            {statusMeta.text}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              to={getAssignmentLink(item.id)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sky-50 px-3.5 text-xs font-black text-sky-700 ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-[0_10px_24px_rgba(14,165,233,0.16)]"
                            >
                              <GuideIcon />

                              {leadAssignment ? "Xem phân công" : "Phân HDV"}
                            </Link>

                            <Link
                              to={getEditLink(item.id)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-50 px-3.5 text-xs font-black text-amber-700 ring-1 ring-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-[0_10px_24px_rgba(245,158,11,0.18)]"
                            >
                              <EditIcon />
                              Sửa
                            </Link>

                            {typeof onDelete === "function" ? (
                              <button
                                type="button"
                                onClick={() => onDelete(item.id)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 text-xs font-black text-rose-700 ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-[0_10px_24px_rgba(244,63,94,0.18)]"
                              >
                                <TrashIcon />
                                Xóa
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourDepartureTable;