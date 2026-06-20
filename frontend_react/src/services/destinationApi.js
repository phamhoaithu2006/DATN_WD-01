import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000/api/admin'

export const destinationApi = {
  getAll() {
    return axios.get(`${API_URL}/destinations`)
  },

  getOne(id) {
    return axios.get(`${API_URL}/destinations/${id}`)
  },

  search(params) {
    return axios.get(`${API_URL}/destinations/search`, {
      params,
    })
  },

  create(data) {
    return axios.post(`${API_URL}/destinations`, data)
  },

  update(id, data) {
    return axios.put(`${API_URL}/destinations/${id}`, data)
  },

  remove(id) {
    return axios.delete(`${API_URL}/destinations/${id}`)
  },

  getTrashed() {
    return axios.get(`${API_URL}/destinations/trash/list`)
  },

  restore(id) {
    return axios.post(`${API_URL}/destinations/${id}/restore`)
  },

  forceDelete(id) {
    return axios.delete(`${API_URL}/destinations/${id}/force-delete`)
  },
}