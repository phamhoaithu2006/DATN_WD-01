import apiClient from './apiClient'

const unwrap = (response) => response.data

function normalizeItems(payload) {
  const data = payload?.data ?? payload

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
}

export async function getGuideLeaveRequestSummary() {
  return unwrap(await apiClient.get('/guide/leave-requests/summary'))
}

export async function getGuideLeaveRequests(params = {}) {
  return unwrap(
    await apiClient.get('/guide/leave-requests', {
      params,
    }),
  )
}

export async function createGuideLeaveRequest(payload = {}) {
  const formData = new FormData()

  formData.append('start_date', payload.start_date || '')
  formData.append('end_date', payload.end_date || '')
  formData.append('reason', payload.reason || '')

  ;(payload.evidence || []).forEach((file) => {
    if (file) formData.append('evidence[]', file)
  })

  return unwrap(
    await apiClient.post('/guide/leave-requests', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  )
}

export async function cancelGuideLeaveRequest(id, payload = {}) {
  return unwrap(
    await apiClient.patch(`/guide/leave-requests/${id}/cancel`, payload),
  )
}

export { normalizeItems }