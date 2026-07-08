import apiClient from './apiClient'

const unwrap = (response) => response.data

export const getGuideDashboard = async () =>
  unwrap(await apiClient.get('/guide/dashboard'))
