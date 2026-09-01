import apiClient from './apiClient'

const PAYMENT_ENDPOINT = '/admin/payments'

const unwrap = (response) => response.data

export const confirmPayment = async (id, payload = {}) =>
  unwrap(await apiClient.patch(`${PAYMENT_ENDPOINT}/${id}/confirm`, payload))

export const failPayment = async (id) =>
  unwrap(await apiClient.patch(`${PAYMENT_ENDPOINT}/${id}/fail`))

export const refundPayment = async (id, proofFile) => {
  const formData = new FormData()
  formData.append('refund_proof', proofFile)
  return unwrap(await apiClient.post(`${PAYMENT_ENDPOINT}/${id}/refund`, formData, {
    params: { _method: 'PATCH' },
  }))
}

export const deleteRefundProof = async (id) =>
  unwrap(await apiClient.delete(`${PAYMENT_ENDPOINT}/${id}/refund-proof`))
