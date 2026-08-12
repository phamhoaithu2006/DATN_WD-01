import apiClient from './apiClient'

const API_URL = '/admin'

const buildDestinationFormData = (data, method = 'POST') => {
  const formData = new FormData()

  if (method !== 'POST') {
    formData.append('_method', method)
  }

  formData.append('name', data.name || '')
  formData.append('slug', data.slug || '')
  formData.append('province_city', data.province_city || '')
  formData.append('country', data.country || '')
  formData.append('description', data.description || '')
  formData.append('status', data.status || 'active')

  for (const provinceId of data.province_ids || []) {
    formData.append('province_ids[]', String(provinceId))
  }

  if (data.thumbnail_image instanceof File) {
    formData.append('thumbnail_image', data.thumbnail_image)
  }

  if (data.remove_thumbnail) {
    formData.append('remove_thumbnail', '1')
  }

  return formData
}

export const destinationApi = {
  getAll() {
    return apiClient.get(`${API_URL}/destinations`)
  },

  getOne(id) {
    return apiClient.get(`${API_URL}/destinations/${id}`)
  },

  getProvinces() {
    return apiClient.get(`${API_URL}/administrative/provinces`)
  },

  getDistricts(id) {
    return apiClient.get(`${API_URL}/destinations/${id}/districts`)
  },

  search(params) {
    return apiClient.get(`${API_URL}/destinations/search`, {
      params,
    })
  },

  create(data) {
    return apiClient.post(
      `${API_URL}/destinations`,
      buildDestinationFormData(data),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  update(id, data) {
    return apiClient.post(
      `${API_URL}/destinations/${id}`,
      buildDestinationFormData(data, 'PUT'),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  remove(id) {
    return apiClient.delete(`${API_URL}/destinations/${id}`)
  },

  getTrashed() {
    return apiClient.get(`${API_URL}/destinations/trash/list`)
  },

  restore(id) {
    return apiClient.post(`${API_URL}/destinations/${id}/restore`)
  },

  forceDelete(id) {
    return apiClient.delete(`${API_URL}/destinations/${id}/force-delete`)
  },
}
