import apiClient from './apiClient'

const unwrap = (response) => response.data

export const getGuideTours = async (params = {}) =>
  unwrap(await apiClient.get('/guide/tours', { params }))

export const getGuideTourUpcoming = async (params = {}) =>
  unwrap(await apiClient.get('/guide/tours/upcoming', { params }))

export const getGuideTourOngoing = async (params = {}) =>
  unwrap(await apiClient.get('/guide/tours/ongoing', { params }))

export const getGuideTourCompleted = async (params = {}) =>
  unwrap(await apiClient.get('/guide/tours/completed', { params }))

export const getGuideTourDetail = async (departureId) =>
  unwrap(await apiClient.get(`/guide/tours/${departureId}`)).data
