import apiClient from './apiClient'

const SUPPORT_STAFF_ENDPOINT = '/admin/support-staff'

export const getSupportStaffStatistics = async () =>
  (await apiClient.get(`${SUPPORT_STAFF_ENDPOINT}/statistics`)).data

export const getSupportStaffs = async (params) =>
  (await apiClient.get(SUPPORT_STAFF_ENDPOINT, { params })).data

export const getSupportStaff = async (id) =>
  (await apiClient.get(`${SUPPORT_STAFF_ENDPOINT}/${id}`)).data

export const createSupportStaff = async (payload) =>
  (await apiClient.post(SUPPORT_STAFF_ENDPOINT, payload)).data

export const updateSupportStaff = async (id, payload) =>
  (await apiClient.put(`${SUPPORT_STAFF_ENDPOINT}/${id}`, payload)).data

export const deleteSupportStaff = async (id) =>
  (await apiClient.delete(`${SUPPORT_STAFF_ENDPOINT}/${id}`)).data
