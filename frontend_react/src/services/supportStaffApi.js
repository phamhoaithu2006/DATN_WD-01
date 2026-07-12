import apiClient from './apiClient'

const SUPPORT_STAFF_ENDPOINT = '/admin/support-staff'

export const getSupportStaffStatistics = async () =>
  (await apiClient.get(`${SUPPORT_STAFF_ENDPOINT}/statistics`)).data

export const getAvailableSupportStaffUsers = async () =>
  (await apiClient.get(`${SUPPORT_STAFF_ENDPOINT}/available-users`)).data

export const getSupportStaffs = async (params) =>
  (await apiClient.get(SUPPORT_STAFF_ENDPOINT, { params })).data

export const getSupportStaff = async (id) =>
  (await apiClient.get(`${SUPPORT_STAFF_ENDPOINT}/${id}`)).data

export const createSupportStaff = async (payload) =>
  (await apiClient.post(SUPPORT_STAFF_ENDPOINT, payload)).data

export const updateSupportStaff = async (id, payload) =>
  (await apiClient.put(`${SUPPORT_STAFF_ENDPOINT}/${id}`, payload)).data

export const uploadSupportStaffAvatar = async (id, file) => {
  const formData = new FormData()
  formData.append('avatar', file)
  return (await apiClient.post(`${SUPPORT_STAFF_ENDPOINT}/${id}/avatar`, formData)).data
}

export const deleteSupportStaffAvatar = async (id) =>
  (await apiClient.delete(`${SUPPORT_STAFF_ENDPOINT}/${id}/avatar`)).data

export const deleteSupportStaff = async (id) =>
  (await apiClient.delete(`${SUPPORT_STAFF_ENDPOINT}/${id}`)).data

export const getTrashedSupportStaffs = async (params) =>
  (await apiClient.get(`${SUPPORT_STAFF_ENDPOINT}/trashed`, { params })).data

export const restoreSupportStaff = async (id) =>
  (await apiClient.patch(`${SUPPORT_STAFF_ENDPOINT}/${id}/restore`)).data

export const forceDeleteSupportStaff = async (id) =>
  (await apiClient.delete(`${SUPPORT_STAFF_ENDPOINT}/${id}/force-delete`)).data
