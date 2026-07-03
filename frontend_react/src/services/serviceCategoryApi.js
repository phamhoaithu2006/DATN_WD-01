import apiClient from './apiClient'

const SERVICE_CATEGORY_ENDPOINT = '/admin/service-categories'

function normalizeStatusForQuery(status) {
  if (status === true || status === '1' || status === 1) return 1
  if (status === false || status === '0' || status === 0) return 0
  return undefined
}

function normalizeStatus(value) {
  if (value === true || value === '1' || value === 1) return true
  if (value === false || value === '0' || value === 0 || value === 'false') return false
  return Boolean(value)
}

function compactListParams(params = {}) {
  const query = {}
  const search = typeof params.search === 'string' ? params.search.trim() : ''
  const status = normalizeStatusForQuery(params.status)

  if (search) query.search = search
  if (status === 0 || status === 1) query.status = status
  if (params.page) query.page = params.page
  if (params.per_page) query.per_page = params.per_page

  return query
}

function normalizeServiceCategory(item = {}) {
  return {
    id: Number(item.id),
    name: item.name || '',
    slug: item.slug || '',
    description: item.description ?? null,
    status: normalizeStatus(item.status),
    created_at: item.created_at || '',
    updated_at: item.updated_at || '',
  }
}

function normalizeListResponse(payload) {
  const body = payload?.data ?? payload
  const data = body?.data ?? {}
  const pagination = data.pagination || {}
  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.data)
      ? data.data
      : Array.isArray(body?.data)
        ? body.data
        : []

  return {
    message: body?.message || '',
    items: items.map(normalizeServiceCategory),
    pagination: {
      currentPage: Number(pagination.current_page || data.current_page || 1),
      lastPage: Number(pagination.last_page || data.last_page || 1),
      perPage: Number(pagination.per_page || data.per_page || 10),
      total: Number(pagination.total || data.total || items.length || 0),
    },
  }
}

function normalizeItemResponse(payload) {
  const body = payload?.data ?? payload
  const item = body?.data ?? body

  return {
    message: body?.message || '',
    item: normalizeServiceCategory(item),
  }
}

function normalizeMutationResponse(payload) {
  const body = payload?.data ?? payload

  return {
    message: body?.message || '',
    item: body?.data ? normalizeServiceCategory(body.data) : null,
  }
}

function buildPayload(payload) {
  return {
    name: payload.name.trim(),
    description: payload.description?.trim() ? payload.description.trim() : null,
    status: Boolean(payload.status),
  }
}

export async function getServiceCategories(params) {
  const response = await apiClient.get(SERVICE_CATEGORY_ENDPOINT, {
    params: compactListParams(params),
  })

  return normalizeListResponse(response)
}

export async function getServiceCategory(id) {
  const response = await apiClient.get(`${SERVICE_CATEGORY_ENDPOINT}/${id}`)

  return normalizeItemResponse(response)
}

export async function createServiceCategory(payload) {
  const response = await apiClient.post(SERVICE_CATEGORY_ENDPOINT, buildPayload(payload))

  return normalizeMutationResponse(response)
}

export async function updateServiceCategory(id, payload) {
  const response = await apiClient.put(`${SERVICE_CATEGORY_ENDPOINT}/${id}`, buildPayload(payload))

  return normalizeMutationResponse(response)
}

export async function deleteServiceCategory(id) {
  const response = await apiClient.delete(`${SERVICE_CATEGORY_ENDPOINT}/${id}`)

  return normalizeMutationResponse(response)
}
