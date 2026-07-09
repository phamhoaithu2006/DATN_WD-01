import apiClient from './apiClient'

const unwrap = (response) => response.data

export const getPublicWidgets = async (params = {}) =>
  unwrap(await apiClient.get('/widgets', { params }))
