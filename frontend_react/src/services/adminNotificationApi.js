import apiClient from './apiClient'

const BASE_URL = '/admin/notifications'
const BELL_URL = '/admin/notification-bell'

const unwrap = (response) => response.data

const adminNotificationApi = {
  getUnreadCount() {
    return apiClient.get(`${BELL_URL}/unread-count`).then(unwrap)
  },

  getList(params = {}) {
    return apiClient.get(BELL_URL, { params }).then(unwrap)
  },

  markAsRead(id) {
    return apiClient.patch(`${BELL_URL}/${id}/read`).then(unwrap)
  },

  markAllAsRead() {
    return apiClient.patch(`${BELL_URL}/read-all`).then(unwrap)
  },

  getAdminNotificationUnreadCount() {
    return this.getUnreadCount()
  },

  getAdminNotifications(params = {}) {
    return this.getList(params)
  },

  markAdminNotificationAsRead(id) {
    return this.markAsRead(id)
  },

  markAllAdminNotificationsAsRead() {
    return this.markAllAsRead()
  },

  getUsers(params = {}) {
    return apiClient.get(`${BASE_URL}/users`, { params }).then(unwrap)
  },

  getRoles() {
    return apiClient.get('/roles').then(unwrap)
  },

  previewRecipients(payload) {
    return apiClient.post(`${BASE_URL}/preview-recipients`, payload).then(unwrap)
  },

  saveDraft(payload) {
    return apiClient.post(`${BASE_URL}/draft`, payload).then(unwrap)
  },

  getDrafts() {
    return apiClient.get(`${BASE_URL}/drafts`).then(unwrap)
  },

  getDraft(id) {
    return apiClient.get(`${BASE_URL}/draft/${id}`).then(unwrap)
  },

  updateDraft(id, payload) {
    return apiClient.put(`${BASE_URL}/draft/${id}`, payload).then(unwrap)
  },

  deleteDraft(id) {
    return apiClient.delete(`${BASE_URL}/draft/${id}`).then(unwrap)
  },

  getTrash() {
    return apiClient.get(`${BASE_URL}/drafts/trashed`).then(unwrap)
  },

  restoreDraft(id) {
    return apiClient.post(`${BASE_URL}/draft/restore/${id}`).then(unwrap)
  },

  forceDeleteDraft(id) {
    return apiClient.delete(`${BASE_URL}/draft/force-delete/${id}`).then(unwrap)
  },

  sendDraft(id) {
    return apiClient.post(`${BASE_URL}/send/${id}`).then(unwrap)
  },

  getSentNotifications(params = {}) {
    return apiClient.get(`${BASE_URL}/get-all-send`, { params }).then(unwrap)
  },

  revokeNotification(draftId) {
    return apiClient.delete(`${BASE_URL}/revoke/${draftId}`).then(unwrap)
  },
}

export default adminNotificationApi