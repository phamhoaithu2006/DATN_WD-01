import apiClient from "./apiClient";

const USER_MANAGEMENT_ENDPOINT = "/admin/customers";

const unwrapList = (response, key) => {
  const payload = response.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.[key])) {
    return payload[key];
  }

  return [];
};

const hasFilters = (params = {}) =>
  Object.values(params).some((value) => value !== undefined && value !== "");

const toAccountFormData = (payload, method) => {
  const formData = new FormData();

  if (method) {
    formData.append("_method", method);
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });

  return formData;
};

export const getAccountStatistics = async () =>
  (await apiClient.get(`${USER_MANAGEMENT_ENDPOINT}/statistics`)).data.data;
export const getAccountRoles = async () =>
  unwrapList(await apiClient.get("/roles"), "roles");
export const getAccounts = async (params) =>
  (
    await apiClient.get(
      hasFilters(params)
        ? `${USER_MANAGEMENT_ENDPOINT}/search`
        : USER_MANAGEMENT_ENDPOINT,
      { params },
    )
  ).data.data;
export const searchAccounts = async (params) =>
  (await apiClient.get(`${USER_MANAGEMENT_ENDPOINT}/search`, { params })).data
    .data;
export const getAccount = async (id) =>
  (await apiClient.get(`${USER_MANAGEMENT_ENDPOINT}/${id}`)).data.data;
export const createAccount = async (payload) =>
  (await apiClient.post(USER_MANAGEMENT_ENDPOINT, toAccountFormData(payload))).data;
export const updateAccount = async (id, payload) =>
  (
    await apiClient.post(
      `${USER_MANAGEMENT_ENDPOINT}/${id}`,
      toAccountFormData(payload, "PUT"),
    )
  ).data;
export const setAccountStatus = async (id, status) =>
  (
    await apiClient.patch(
      `${USER_MANAGEMENT_ENDPOINT}/${id}/${status === "active" ? "unlock" : "lock"}`,
    )
  ).data;
