import apiClient from './apiClient'

const BASE = '/admin/languages'

export const languageApi = {
  // Ngôn ngữ
  getAll:  ()         => apiClient.get(BASE),
  getOne:  (id)       => apiClient.get(`${BASE}/${id}`),
  create:  (payload)  => apiClient.post(BASE, payload),
  update:  (id, data) => apiClient.put(`${BASE}/${id}`, data),
  remove:  (id)       => apiClient.delete(`${BASE}/${id}`),

  // Level
  getLevels:     (langId)              => apiClient.get(`${BASE}/${langId}/levels`),
  createLevel:   (langId, payload)     => apiClient.post(`${BASE}/${langId}/levels`, payload),
  updateLevel:   (langId, lvId, data)  => apiClient.put(`${BASE}/${langId}/levels/${lvId}`, data),
  removeLevel:   (langId, lvId)        => apiClient.delete(`${BASE}/${langId}/levels/${lvId}`),
}