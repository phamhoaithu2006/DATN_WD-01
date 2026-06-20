import apiClient from './apiClient'

export const getCustomerStatistics = async () =>
  (await apiClient.get('/admin/customers/statistics')).data.data

export const getCustomers = async (params) =>
  (await apiClient.get('/admin/customers', { params })).data.data

export const getCustomer = async (id) =>
  (await apiClient.get(`/admin/customers/${id}`)).data.data

export const createCustomer = async (payload) =>
  (await apiClient.post('/admin/customers', payload)).data

export const updateCustomer = async (id, payload) =>
  (await apiClient.put(`/admin/customers/${id}`, payload)).data

export const setCustomerLocked = async (id, locked) =>
  (
    await apiClient.patch(
      `/admin/customers/${id}/${locked ? 'lock' : 'unlock'}`,
    )
  ).data
