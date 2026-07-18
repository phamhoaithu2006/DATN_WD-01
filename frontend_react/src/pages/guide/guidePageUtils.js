import { mediaUrl } from "../../utils/mediaUrl";
import { formatDateDdMmYyyy } from "../../utils/dateFormat";
export function normalizePaginator(payload) {
  const body = payload?.data ?? payload;
  const paginator = Array.isArray(body) ? body : (body?.data ?? body);
  const items = Array.isArray(paginator?.data)
    ? paginator.data
    : Array.isArray(paginator)
      ? paginator
      : [];
  const meta = body?.meta ?? paginator?.meta ?? paginator;
  return {
    items,
    meta: {
      current_page: Number(meta?.current_page || 1),
      last_page: Number(meta?.last_page || 1),
      per_page: Number(meta?.per_page || items.length || 10),
      total: Number(meta?.total || items.length || 0),
    },
  };
}
export function formatDate(value, fallback = "Chưa xác định") {
  return formatDateDdMmYyyy(value, fallback);
}
export function formatNumber(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("vi-VN").format(
    Number.isFinite(number) ? number : 0,
  );
}
export function formatMoney(value) {
  const number = Number(value || 0);
  const compact = Math.abs(number) >= 1000000 ? number / 1000000 : number;
  const suffix = Math.abs(number) >= 1000000 ? "tr" : "đ";
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(compact)}${suffix}`;
}
export function getInitials(name) {
  return String(name || "HDV")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
export function getTourTitle(item) {
  return item?.tour?.title || item?.title || "Tour được phân công";
}
export function getDestination(item) {
  const start =
    item?.tour?.departure_location || item?.departure_location || "";
  const end =
    item?.tour?.destination?.name ||
    item?.tour?.destination?.province_city ||
    item?.destination?.name ||
    "";
  if (start && end) return `${start} → ${end}`;
  return end || start || "Chưa có điểm đến";
}
export function getTourImage(item) {
  return mediaUrl(
    item?.tour?.thumbnail?.image_url ||
      item?.tour?.thumbnail_url ||
      item?.tour?.image_url ||
      item?.tour?.image ||
      item?.thumbnail_url ||
      item?.image_url ||
      "",
  );
}
function dateOnly(value) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}
export function getTourState(item) {
  const apiStatus = String(
    item?.guide_status || item?.status || "",
  ).toLowerCase();
  if (
    ["upcoming", "ongoing", "completed", "cancelled", "pending"].includes(
      apiStatus,
    )
  )
    return apiStatus;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const departureDate = dateOnly(item?.departure_date);
  const returnDate = dateOnly(item?.return_date) || departureDate;
  if (departureDate && departureDate > today) return "upcoming";
  if (
    departureDate &&
    returnDate &&
    departureDate <= today &&
    returnDate >= today
  )
    return "ongoing";
  if (departureDate) return "completed";
  return "pending";
}
export function getTourStateLabel(item) {
  const state = getTourState(item);
  if (state === "upcoming") return "Sắp diễn ra";
  if (state === "ongoing") return "Đang dẫn tour";
  if (state === "completed") return "Hoàn thành";
  if (state === "cancelled") return "Đã hủy";
  return "Đang chờ xét duyệt";
}
export function getTourStateClass(item) {
  return `is-${getTourState(item)}`;
}
export function getCustomerType(customer) {
  const raw = String(
    customer?.type ||
      customer?.customer_type ||
      customer?.participant_type ||
      "",
  ).toLowerCase();
  if (raw.includes("child") || raw.includes("trẻ") || raw.includes("tre"))
    return "Trẻ em";
  return "Người lớn";
}
export function getCustomerName(customer) {
  return (
    customer?.full_name ||
    customer?.customer?.full_name ||
    customer?.name ||
    "Khách hàng"
  );
}
export function getCustomerPhone(customer) {
  return (
    customer?.phone || customer?.customer?.phone || customer?.phone_number || ""
  );
}
