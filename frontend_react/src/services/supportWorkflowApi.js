import apiClient from './apiClient'

function normalizePagination(payload) {
  if (
    payload &&
    Array.isArray(payload.data)
  ) {
    return payload
  }

  if (
    payload?.data &&
    Array.isArray(payload.data.data)
  ) {
    return payload.data
  }

  if (Array.isArray(payload)) {
    return {
      data: payload,
      current_page: 1,
      last_page: 1,
      total: payload.length,
    }
  }

  return {
    data: [],
    current_page: 1,
    last_page: 1,
    total: 0,
  }
}

/*
|--------------------------------------------------------------------------
| CUSTOMER - YÊU CẦU HỖ TRỢ
|--------------------------------------------------------------------------
*/

export async function getMySupportRequests(
  page = 1,
) {
  const response =
    await apiClient.get(
      '/customer/support-requests',
      {
        params: {
          page,
        },
      },
    )

  return normalizePagination(
    response.data?.data ||
      response.data,
  )
}

export async function getMySupportRequestDetail(
  id,
) {
  if (!id) {
    return null
  }

  const response =
    await apiClient.get(
      `/customer/support-requests/${id}`,
    )

  return (
    response.data?.data ||
    response.data ||
    null
  )
}

export async function getMySupportRequestUnreadCount() {
  const response =
    await apiClient.get(
      '/customer/support-requests/unread-count',
    )

  return Number(
    response.data?.unread_count ??
      response.data?.data
        ?.unread_count ??
      0,
  )
}

export async function supplementMySupportRequest(
  id,
  {
    message = '',
    attachments = [],
  } = {},
) {
  if (!id) {
    throw new Error(
      'Thiếu ID yêu cầu hỗ trợ.',
    )
  }

  const normalizedMessage =
    String(message || '').trim()

  const files =
    Array.isArray(attachments)
      ? attachments
      : []

  if (
    !normalizedMessage &&
    files.length === 0
  ) {
    throw new Error(
      'Vui lòng nhập thông tin bổ sung hoặc chọn tệp đính kèm.',
    )
  }

  const formData =
    new FormData()

  if (normalizedMessage) {
    formData.append(
      'message',
      normalizedMessage,
    )
  }

  files.forEach((file) => {
    formData.append(
      'attachments[]',
      file,
    )
  })

  const response =
    await apiClient.post(
      `/customer/support-requests/${id}/supplement`,
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      },
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| NVHT - WORKFLOW YÊU CẦU HỖ TRỢ
|--------------------------------------------------------------------------
*/

export async function claimSupportRequest(
  id,
) {
  if (!id) {
    throw new Error(
      'Thiếu ID yêu cầu hỗ trợ.',
    )
  }

  const response =
    await apiClient.post(
      `/support/requests/${id}/claim`,
    )

  return response.data
}

export async function requestCustomerMoreInfo(
  id,
  message,
) {
  if (!id) {
    throw new Error(
      'Thiếu ID yêu cầu hỗ trợ.',
    )
  }

  const normalizedMessage =
    String(message || '').trim()

  if (!normalizedMessage) {
    throw new Error(
      'Vui lòng nhập nội dung yêu cầu khách bổ sung.',
    )
  }

  const response =
    await apiClient.post(
      `/support/requests/${id}/request-more-info`,
      {
        message:
          normalizedMessage,
      },
    )

  return response.data
}

export async function sendSupportRequestToAdmin(
  id,
  content,
) {
  if (!id) {
    throw new Error(
      'Thiếu ID yêu cầu hỗ trợ.',
    )
  }

  const normalizedContent =
    String(content || '').trim()

  if (!normalizedContent) {
    throw new Error(
      'Vui lòng nhập nội dung gửi Admin.',
    )
  }

  const response =
    await apiClient.post(
      `/support/requests/${id}/send-to-admin`,
      {
        content:
          normalizedContent,
      },
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| ADMIN - THÔNG BÁO ĐÃ NHẬN
|--------------------------------------------------------------------------
*/

/**
 * Lấy danh sách thông báo Admin đã nhận.
 *
 * params:
 * - sender_role: all | guide | support
 * - sender_key: khóa người gửi cụ thể
 * - per_page: số lượng mỗi trang
 */
export async function getAdminReceivedNotifications(
  page = 1,
  params = {},
) {
  const response =
    await apiClient.get(
      '/admin/received-notifications',
      {
        params: {
          page,
          ...params,
        },
      },
    )

  const root =
    response.data || {}

  const pagination =
    normalizePagination(
      root.data || root,
    )

  return {
    ...pagination,

    filters:
      root.filters || {
        selected_role: 'all',
        selected_sender: 'all',
        roles: [],
        senders: [],
      },
  }
}

/**
 * Lấy chi tiết một thông báo Admin đã nhận.
 */
export async function getAdminReceivedNotificationDetail(
  id,
) {
  if (!id) {
    return null
  }

  const response =
    await apiClient.get(
      `/admin/received-notifications/${id}`,
    )

  return (
    response.data?.data ||
    response.data ||
    null
  )
}

/**
 * Lấy số thông báo Admin chưa đọc.
 */
export async function getAdminReceivedUnreadCount() {
  const response =
    await apiClient.get(
      '/admin/received-notifications/unread-count',
    )

  return Number(
    response.data?.unread_count ??
      response.data?.data
        ?.unread_count ??
      response.data?.count ??
      0,
  )
}

/**
 * Admin xác nhận đã xử lý xong yêu cầu hỗ trợ.
 */
export async function markSupportRequestProcessedByAdmin(
  id,
) {
  if (!id) {
    throw new Error(
      'Thiếu ID yêu cầu hỗ trợ.',
    )
  }

  const response =
    await apiClient.post(
      `/admin/support-requests/${id}/processed`,
    )

  return response.data
}