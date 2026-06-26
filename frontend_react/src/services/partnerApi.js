import apiClient from './apiClient'

const PRIMARY_ENDPOINT = '/admin/partners'
const FALLBACK_ENDPOINTS = ['/admin/partner-services', '/admin/partner-service']

async function requestFirst(candidates) {
  let lastError = null

  for (const candidate of candidates) {
    try {
      return await apiClient.request(candidate)
    } catch (error) {
      lastError = error

      const status = error.response?.status
      if (status && status !== 404 && status !== 405) {
        throw error
      }
    }
  }

  throw lastError || new Error('Request failed')
}

function listCandidates(path = '', config = {}) {
  return [
    { method: 'get', url: `${PRIMARY_ENDPOINT}${path}`, ...config },
    ...FALLBACK_ENDPOINTS.map((baseURL) => ({ method: 'get', url: `${baseURL}${path}`, ...config })),
  ]
}

function mutationCandidates(method, path = '', data = undefined) {
  return [
    { method, url: `${PRIMARY_ENDPOINT}${path}`, data },
    ...FALLBACK_ENDPOINTS.map((baseURL) => ({ method, url: `${baseURL}${path}`, data })),
  ]
}

export const partnerApi = {
  getAll(params) {
    return requestFirst(listCandidates('', { params }))
  },

  getStatistics() {
    return requestFirst(listCandidates('/statistics'))
  },

  getOne(id) {
    return requestFirst(listCandidates(`/${id}`))
  },

  create(payload) {
    return requestFirst(mutationCandidates('post', '', payload))
  },

  update(id, payload) {
    return requestFirst(mutationCandidates('put', `/${id}`, payload))
  },

  remove(id) {
    return requestFirst(mutationCandidates('delete', `/${id}`))
  },

  getTrashed() {
    return requestFirst([
      { method: 'get', url: `${PRIMARY_ENDPOINT}/trash/list` },
      { method: 'get', url: `${PRIMARY_ENDPOINT}/trashed` },
      ...FALLBACK_ENDPOINTS.flatMap((baseURL) => [
        { method: 'get', url: `${baseURL}/trash/list` },
        { method: 'get', url: `${baseURL}/trashed` },
      ]),
    ])
  },

  restore(id) {
    return requestFirst([
      { method: 'post', url: `${PRIMARY_ENDPOINT}/${id}/restore` },
      { method: 'patch', url: `${PRIMARY_ENDPOINT}/${id}/restore` },
      { method: 'post', url: `${PRIMARY_ENDPOINT}/restore/${id}` },
      ...FALLBACK_ENDPOINTS.flatMap((baseURL) => [
        { method: 'post', url: `${baseURL}/${id}/restore` },
        { method: 'patch', url: `${baseURL}/${id}/restore` },
        { method: 'post', url: `${baseURL}/restore/${id}` },
      ]),
    ])
  },

  forceDelete(id) {
    return requestFirst([
      { method: 'delete', url: `${PRIMARY_ENDPOINT}/${id}/force-delete` },
      { method: 'delete', url: `${PRIMARY_ENDPOINT}/force-delete/${id}` },
      ...FALLBACK_ENDPOINTS.flatMap((baseURL) => [
        { method: 'delete', url: `${baseURL}/${id}/force-delete` },
        { method: 'delete', url: `${baseURL}/force-delete/${id}` },
      ]),
    ])
  },
}

