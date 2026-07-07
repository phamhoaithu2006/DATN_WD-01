import apiClient from './apiClient'

const PAYMENT_ENDPOINT = '/admin/payments'

const unwrap = (response) => response.data

export const confirmPayment = async (id, payload = {}) =>
  unwrap(await apiClient.patch(`${PAYMENT_ENDPOINT}/${id}/confirm`, payload))

export const failPayment = async (id) =>
  unwrap(await apiClient.patch(`${PAYMENT_ENDPOINT}/${id}/fail`))

export const refundPayment = async (id) =>
  unwrap(await apiClient.patch(`${PAYMENT_ENDPOINT}/${id}/refund`))
