import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('admin_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

const tourApi = {
  getAll() {
    return api.get('/admin/tours')
  },

  getHidden() {
    return api.get('/admin/tours/hidden-list')
  },

  create(data) {
    return api.post('/admin/tours', data)
  },

  update(id, data) {
    data.append('_method', 'PUT')
    return api.post(`/admin/tours/${id}`, data)
  },

  delete(id) {
    return api.delete(`/admin/tours/${id}`)
  },

  hide(id) {
    return api.patch(`/admin/tours/${id}/hide`)
  },

  unhide(id) {
    return api.patch(`/admin/tours/${id}/unhide`)
  },
}

export default tourApi