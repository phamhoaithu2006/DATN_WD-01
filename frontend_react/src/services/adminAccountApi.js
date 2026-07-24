import apiClient from "./apiClient";

const USER_MANAGEMENT_ENDPOINT = "/admin/customers";
const ROLE_ENDPOINT = "/admin/roles";

const unwrapList = (response, key) => {
  const payload = response?.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.[key])) {
    return payload[key];
  }

  if (Array.isArray(payload?.data?.[key])) {
    return payload.data[key];
  }

  return [];
};

const hasFilters = (params = {}) =>
  Object.values(params).some(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== "",
  );

const toAccountFormData = (payload = {}) => {
  const formData = new FormData();

  Object.entries(payload).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        formData.append(key, value);
      }
    },
  );

  return formData;
};

const hasAvatarFile = (payload) =>
  typeof File !== "undefined" &&
  payload?.avatar instanceof File;

/*
|--------------------------------------------------------------------------
| THỐNG KÊ
|--------------------------------------------------------------------------
*/

export const getAccountStatistics =
  async () => {
    const response = await apiClient.get(
      `${USER_MANAGEMENT_ENDPOINT}/statistics`,
    );

    return (
      response.data?.data ||
      response.data ||
      {}
    );
  };

/*
|--------------------------------------------------------------------------
| VAI TRÒ
|--------------------------------------------------------------------------
*/

export const getAccountRoles =
  async () => {
    const response = await apiClient.get(
      ROLE_ENDPOINT,
    );

    return unwrapList(
      response,
      "roles",
    );
  };

/*
|--------------------------------------------------------------------------
| DANH SÁCH TÀI KHOẢN
|--------------------------------------------------------------------------
*/

export const getAccounts = async (
  params = {},
) => {
  const endpoint = hasFilters(params)
    ? `${USER_MANAGEMENT_ENDPOINT}/search`
    : USER_MANAGEMENT_ENDPOINT;

  const response = await apiClient.get(
    endpoint,
    {
      params,
    },
  );

  return (
    response.data?.data ||
    response.data ||
    []
  );
};

export const searchAccounts = async (
  params = {},
) => {
  const response = await apiClient.get(
    `${USER_MANAGEMENT_ENDPOINT}/search`,
    {
      params,
    },
  );

  return (
    response.data?.data ||
    response.data ||
    []
  );
};

/*
|--------------------------------------------------------------------------
| CHI TIẾT TÀI KHOẢN
|--------------------------------------------------------------------------
*/

export const getAccount = async (id) => {
  if (!id) {
    throw new Error(
      "Thiếu ID tài khoản.",
    );
  }

  const response = await apiClient.get(
    `${USER_MANAGEMENT_ENDPOINT}/${id}`,
  );

  return (
    response.data?.data ||
    response.data ||
    null
  );
};

/*
|--------------------------------------------------------------------------
| THÊM TÀI KHOẢN
|--------------------------------------------------------------------------
*/

export const createAccount = async (
  payload,
) => {
  const formData =
    toAccountFormData(payload);

  const response = await apiClient.post(
    USER_MANAGEMENT_ENDPOINT,
    formData,
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| CẬP NHẬT TÀI KHOẢN
|--------------------------------------------------------------------------
*/

export const updateAccount = async (
  id,
  payload,
) => {
  if (!id) {
    throw new Error(
      "Thiếu ID tài khoản.",
    );
  }

  if (hasAvatarFile(payload)) {
    const formData =
      toAccountFormData(payload);

    formData.append(
      "_method",
      "PUT",
    );

    const response =
      await apiClient.post(
        `${USER_MANAGEMENT_ENDPOINT}/${id}`,
        formData,
      );

    return response.data;
  }

  const response = await apiClient.put(
    `${USER_MANAGEMENT_ENDPOINT}/${id}`,
    payload,
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| KHÓA / MỞ KHÓA TÀI KHOẢN
|--------------------------------------------------------------------------
*/

export const setAccountStatus = async (
  id,
  status,
) => {
  if (!id) {
    throw new Error(
      "Thiếu ID tài khoản.",
    );
  }

  const action =
    status === "active"
      ? "unlock"
      : "lock";

  const response =
    await apiClient.patch(
      `${USER_MANAGEMENT_ENDPOINT}/${id}/${action}`,
    );

  return response.data;
};