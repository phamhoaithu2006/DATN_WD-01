import apiClient from "./apiClient";

export async function createCustomerSupportRequest(payload) {
  const formData = new FormData();

  formData.append("full_name", payload.full_name);
  formData.append("email", payload.email);

  if (payload.phone) {
    formData.append("phone", payload.phone);
  }

  formData.append("category", payload.category);
  formData.append("priority", payload.priority);
  formData.append("subject", payload.subject);
  formData.append("description", payload.description);

  (payload.attachments || []).forEach((file) => {
    formData.append("attachments[]", file);
  });

  // Không tự set Content-Type.
  // Axios sẽ tự thêm multipart boundary.
  const response = await apiClient.post(
    "/customer/support-requests",
    formData,
  );

  return response.data;
}

export async function getSupportRequests(params = {}) {
  const response = await apiClient.get(
    "/support/requests",
    { params },
  );

  const pagination = response.data?.data || {};

  return {
    items: pagination.data || [],
    meta: {
      current_page: pagination.current_page || 1,
      last_page: pagination.last_page || 1,
      total: pagination.total || 0,
    },
    counts: response.data?.counts || {
      pending: 0,
      in_progress: 0,
      resolved: 0,
    },
  };
}

export async function getSupportRequestDetail(id) {
  const response = await apiClient.get(
    `/support/requests/${id}`,
  );

  return response.data?.data;
}

export async function updateSupportRequestStatus(id, status) {
  const response = await apiClient.patch(
    `/support/requests/${id}/status`,
    { status },
  );

  return response.data?.data;
}

export async function getSupportRequestBadgeCount() {
  const response = await apiClient.get(
    "/support/requests/badge-count",
  );

  return Number(response.data?.count || 0);
}