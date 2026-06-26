import apiClient from './apiClient'

const REPORT_ENDPOINT = '/admin/reports'

export const getReportOverview = async (year) =>
  (await apiClient.get(`${REPORT_ENDPOINT}/overview`, { params: { year } })).data

export const getReportCharts = async (year) =>
  (await apiClient.get(`${REPORT_ENDPOINT}/charts`, { params: { year } })).data