import apiClient from "./apiClient";

export async function sendCustomerPresenceHeartbeat() {
  const response = await apiClient.post("/customer/presence/heartbeat");
  return response?.data ?? response;
}

export async function getCustomerPresence() {
  const response = await apiClient.get("/admin/customers/presence");
  return response?.data?.data || response?.data || {};
}
