import apiClient from "./apiClient";

const USER_MANAGEMENT_ENDPOINT = "/admin/customers";

export const getAccountStatistics = async () =>
  (await apiClient.get(`${USER_MANAGEMENT_ENDPOINT}/statistics`)).data.data;
export const getAccounts = async (params) =>
  (await apiClient.get(USER_MANAGEMENT_ENDPOINT, { params })).data.data;
export const getAccount = async (id) =>
  (await apiClient.get(`${USER_MANAGEMENT_ENDPOINT}/${id}`)).data.data;
export const createAccount = async (payload) =>
  (await apiClient.post(USER_MANAGEMENT_ENDPOINT, payload)).data;
export const updateAccount = async (id, payload) =>
  (await apiClient.put(`${USER_MANAGEMENT_ENDPOINT}/${id}`, payload)).data;
export const setAccountStatus = async (id, status) =>
  (
    await apiClient.patch(
      `${USER_MANAGEMENT_ENDPOINT}/${id}/${status === "active" ? "unlock" : "lock"}`,
    )
  ).data;
