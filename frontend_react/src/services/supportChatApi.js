import apiClient from './apiClient'

const supportChatApi = {
  async pendingList() {
    const response = await apiClient.get('/support/chat/pending')
    return response.data?.data || []
  },
  async myActiveList() {
    const response = await apiClient.get('/support/chat/mine')
    return response.data?.data || []
  },
  async show(conversationId) {
    const response = await apiClient.get(`/support/chat/${conversationId}`)
    return response.data
  },
  async accept(conversationId) {
    const response = await apiClient.post(`/support/chat/${conversationId}/accept`)
    return response.data
  },
  async reply(conversationId, content) {
    const response = await apiClient.post(`/support/chat/${conversationId}/reply`, { content })
    return response.data
  },
  async close(conversationId) {
    const response = await apiClient.post(`/support/chat/${conversationId}/close`)
    return response.data
  },
}

export default supportChatApi