import apiClient from './apiClient'

const adminGuideActivityApi = {
  async list(params = {}) {
    const response = await apiClient.get('/admin/guide-activities', { params })
    return response.data
  },
}

export default adminGuideActivityApi
