import apiClient from "./apiClient";

export const getAccountStatistics = async () =>
  (await apiClient.get("/admin/accounts/statistics")).data.data;
export const getAccounts = async (params) =>
  (await apiClient.get("/admin/accounts", { params })).data.data;
export const getAccount = async (id) =>
  (await apiClient.get(`/admin/accounts/${id}`)).data.data;
export const createAccount = async (payload) =>
  (await apiClient.post("/admin/accounts", payload)).data;
export const updateAccount = async (id, payload) =>
  (await apiClient.put(`/admin/accounts/${id}`, payload)).data;
export const setAccountStatus = async (id, status) =>
  (await apiClient.patch(`/admin/accounts/${id}/status`, { status })).data;
