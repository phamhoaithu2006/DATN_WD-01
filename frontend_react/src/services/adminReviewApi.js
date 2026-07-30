import apiClient from './apiClient'

export async function getAdminTourReviews(params = {}) {
  const response = await apiClient.get('/admin/tour-reviews', {
    params,
  })

  return {
    summary: response.data?.summary || {},
    reviews: response.data?.data?.data || [],
    pagination: response.data?.data || {},
  }
}

export async function getAdminTourReviewDetail(reviewId) {
  const response = await apiClient.get(
    `/admin/tour-reviews/${reviewId}`,
  )

  return response.data?.data || null
}

export async function updateAdminTourReviewStatus(reviewId, status) {
  const response = await apiClient.patch(
    `/admin/tour-reviews/${reviewId}/status`,
    { status },
  )

  return response.data?.data || null
}