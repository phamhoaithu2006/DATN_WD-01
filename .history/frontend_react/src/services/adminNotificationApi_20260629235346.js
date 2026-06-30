import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('access_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

const BASE_URL = '/admin/notifications'

const unwrap = (response) => response.data

const adminNotificationApi = {
  getUsers(params = {}) {
    return api.get(`${BASE_URL}/users`, { params }).then(unwrap)
  },

  previewRecipients(payload) {
    return api.post(`${BASE_URL}/preview-recipients`, payload).then(unwrap)
  },

  saveDraft(payload) {
    return api.post(`${BASE_URL}/draft`, payload).then(unwrap)
  },

  getDrafts() {
    return api.get(`${BASE_URL}/drafts`).then(unwrap)
  },

  getDraft(id) {
    return api.get(`${BASE_URL}/draft/${id}`).then(unwrap)
  },

  updateDraft(id, payload) {
    return api.put(`${BASE_URL}/draft/${id}`, payload).then(unwrap)
  },

  deleteDraft(id) {
    return api.delete(`${BASE_URL}/draft/${id}`).then(unwrap)
  },

  getTrash() {
    return api.get(`${BASE_URL}/drafts/trashed`).then(unwrap)
  },

  restoreDraft(id) {
    return api.post(`${BASE_URL}/draft/restore/${id}`).then(unwrap)
  },

  forceDeleteDraft(id) {
    return api.delete(`${BASE_URL}/draft/force-delete/${id}`).then(unwrap)
  },

  sendDraft(id) {
    return api.post(`${BASE_URL}/send/${id}`).then(unwrap)
  },

  getSentNotifications() {
    return api.get(`${BASE_URL}/get-all-send`).then(unwrap)
  },

  revokeNotification(draftId) {
    return api.delete(`${BASE_URL}/revoke/${draftId}`).then(unwrap)
  },

  getRoles() {
    return api.get('/roles').then(unwrap)
    },
}

export default adminNotificationApi