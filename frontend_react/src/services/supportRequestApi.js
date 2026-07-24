import apiClient from './apiClient'

/*
|--------------------------------------------------------------------------
| CUSTOMER - TẠO YÊU CẦU HỖ TRỢ
|--------------------------------------------------------------------------
*/

export async function createCustomerSupportRequest(payload) {
  const formData = new FormData()

  formData.append(
    'full_name',
    payload?.full_name || '',
  )

  formData.append(
    'email',
    payload?.email || '',
  )

  if (payload?.phone) {
    formData.append(
      'phone',
      payload.phone,
    )
  }

  formData.append(
    'category',
    payload?.category || 'general',
  )

  formData.append(
    'subject',
    payload?.subject || '',
  )

  formData.append(
    'description',
    payload?.description || '',
  )

  const files = Array.isArray(
    payload?.attachments,
  )
    ? payload.attachments
    : []

  files.forEach((file) => {
    formData.append(
      'attachments[]',
      file,
    )
  })

  const response =
    await apiClient.post(
      '/customer/support-requests',
      formData,
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| SUPPORT STAFF - DANH SÁCH YÊU CẦU
|--------------------------------------------------------------------------
*/

export async function getSupportRequests(
  params = {},
) {
  const response =
    await apiClient.get(
      '/support/requests',
      {
        params,
      },
    )

  const responseData =
    response.data || {}

  const pagination =
    responseData.data || {}

  return {
    items: Array.isArray(
      pagination.data,
    )
      ? pagination.data
      : [],

    counts:
      responseData.counts || {
        pending: 0,
        in_progress: 0,
        resolved: 0,
        cancelled: 0,
      },

    meta: {
      current_page:
        pagination.current_page || 1,

      last_page:
        pagination.last_page || 1,

      per_page:
        pagination.per_page || 10,

      total:
        pagination.total || 0,
    },
  }
}

/*
|--------------------------------------------------------------------------
| SUPPORT STAFF - DANH SÁCH NVHT ĐÃ XỬ LÝ
|--------------------------------------------------------------------------
*/

export async function getSupportRequestAssignees() {
  const response =
    await apiClient.get(
      '/support/requests/assignees',
    )

  return Array.isArray(
    response.data?.data,
  )
    ? response.data.data
    : []
}

/*
|--------------------------------------------------------------------------
| SUPPORT STAFF - DANH SÁCH NVHT CÓ THỂ CHUYỂN TICKET
|--------------------------------------------------------------------------
*/

export async function getSupportStaffOptions() {
  const response =
    await apiClient.get(
      '/support/requests/staff-options',
    )

  return Array.isArray(
    response.data?.data,
  )
    ? response.data.data
    : []
}

/*
|--------------------------------------------------------------------------
| SUPPORT STAFF - CHI TIẾT TICKET
|--------------------------------------------------------------------------
*/

export async function getSupportRequestDetail(
  id,
) {
  if (!id) {
    return null
  }

  const response =
    await apiClient.get(
      `/support/requests/${id}`,
    )

  return response.data?.data || null
}

/*
|--------------------------------------------------------------------------
| SUPPORT STAFF - TRẢ TICKET VỀ KHO
|--------------------------------------------------------------------------
|
| Chỉ sử dụng khi:
| - Ticket đang in_progress
| - Ticket thuộc NVHT hiện tại
| - Ticket CHƯA gửi yêu cầu lên Admin
|
| Khi admin_request_status = pending thì backend nên từ chối.
|
*/

export async function releaseSupportRequest(
  id,
) {
  const response =
    await apiClient.post(
      `/support/requests/${id}/release`,
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| SUPPORT STAFF - CHUYỂN NHÂN VIÊN
|--------------------------------------------------------------------------
|
| payload:
|
| {
|   assigned_to: 10,
|   reason: "Lý do chuyển ticket"
| }
|
| Khi ticket đã gửi Admin xử lý thì không nên cho phép chuyển.
|
*/

export async function transferSupportRequest(
  id,
  payload,
) {
  const response =
    await apiClient.post(
      `/support/requests/${id}/transfer`,
      {
        assigned_to:
          payload?.assigned_to,

        reason:
          payload?.reason || '',
      },
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| SUPPORT STAFF - LỊCH SỬ TRAO ĐỔI
|--------------------------------------------------------------------------
*/

export async function getSupportRequestMessages(
  id,
) {
  const response =
    await apiClient.get(
      `/support/requests/${id}/messages`,
    )

  return Array.isArray(
    response.data?.data,
  )
    ? response.data.data
    : []
}

/*
|--------------------------------------------------------------------------
| SUPPORT STAFF - GỬI PHẢN HỒI CHO KHÁCH
|--------------------------------------------------------------------------
*/

export async function sendSupportRequestMessage(
  id,
  {
    message = '',
    attachments = [],
  } = {},
) {
  const formData =
    new FormData()

  const normalizedMessage =
    String(
      message || '',
    ).trim()

  if (normalizedMessage) {
    formData.append(
      'message',
      normalizedMessage,
    )
  }

  const files =
    Array.isArray(
      attachments,
    )
      ? attachments
      : []

  files.forEach(
    (file) => {
      formData.append(
        'attachments[]',
        file,
      )
    },
  )

  const response =
    await apiClient.post(
      `/support/requests/${id}/messages`,
      formData,
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| SUPPORT STAFF - LỊCH SỬ XỬ LÝ
|--------------------------------------------------------------------------
*/

export async function getSupportRequestHistory(
  id,
) {
  const response =
    await apiClient.get(
      `/support/requests/${id}/history`,
    )

  return Array.isArray(
    response.data?.data,
  )
    ? response.data.data
    : []
}

/*
|--------------------------------------------------------------------------
| SUPPORT STAFF - BADGE SIDEBAR
|--------------------------------------------------------------------------
|
| Badge NVHT:
|
| pending + in_progress
|
*/

export async function getSupportRequestBadgeCount() {
  const response =
    await apiClient.get(
      '/support/requests/badge-count',
    )

  return Number(
    response.data?.count || 0,
  )
}