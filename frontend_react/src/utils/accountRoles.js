const roleLabels = {
  customer: "Khách Hàng",
  admin: "Admin",
  "support staff": "NV Hỗ Trợ",
  "tour guide": "Hướng Dẫn Viên",
};
export const roleLabel = (role) =>
  roleLabels[role?.name] || role?.description || role?.name || "Chưa xác định";
export const roleClass = (role) =>
  role?.name?.replaceAll(" ", "-") || "unknown";
