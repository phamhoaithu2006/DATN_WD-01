import apiClient from './apiClient'

function getResponseData(response) {
  return response?.data ?? response
}

export async function getSupportStaffs(params = {}) {
  const response = await apiClient.get(
    '/admin/support-staff',
    {
      params,
    },
  )

  return getResponseData(response)
}

export async function getSupportStaffStatistics() {
  const response = await apiClient.get(
    '/admin/support-staff/statistics',
  )

  return getResponseData(response)
}

export async function getAvailableSupportStaffUsers() {
  const response = await apiClient.get(
    '/admin/support-staff/available-users',
  )

  return getResponseData(response)
}

export async function getSupportStaff(id) {
  if (!id) {
    throw new Error(
      'Không tìm thấy mã nhân viên hỗ trợ.',
    )
  }

  const response = await apiClient.get(
    `/admin/support-staff/${id}`,
  )

  return getResponseData(response)
}

export async function createSupportStaff(payload) {
  const response = await apiClient.post(
    '/admin/support-staff',
    payload,
  )

  return getResponseData(response)
}

export async function updateSupportStaff(
  id,
  payload,
) {
  if (!id) {
    throw new Error(
      'Không tìm thấy mã nhân viên hỗ trợ.',
    )
  }

  const response = await apiClient.put(
    `/admin/support-staff/${id}`,
    payload,
  )

  return getResponseData(response)
}

export async function deleteSupportStaff(id) {
  if (!id) {
    throw new Error(
      'Không tìm thấy mã nhân viên hỗ trợ.',
    )
  }

  const response = await apiClient.delete(
    `/admin/support-staff/${id}`,
  )

  return getResponseData(response)
}

export async function uploadSupportStaffAvatar(
  id,
  avatarFile,
) {
  if (!id) {
    throw new Error(
      'Không tìm thấy mã nhân viên hỗ trợ.',
    )
  }

  if (!avatarFile) {
    throw new Error(
      'Vui lòng chọn ảnh đại diện.',
    )
  }

  const formData = new FormData()

  formData.append(
    'avatar',
    avatarFile,
  )

  const response = await apiClient.post(
    `/admin/support-staff/${id}/avatar`,
    formData,
    {
      headers: {
        'Content-Type':
          'multipart/form-data',
      },
    },
  )

  return getResponseData(response)
}

export async function deleteSupportStaffAvatar(
  id,
) {
  if (!id) {
    throw new Error(
      'Không tìm thấy mã nhân viên hỗ trợ.',
    )
  }

  const response = await apiClient.delete(
    `/admin/support-staff/${id}/avatar`,
  )

  return getResponseData(response)
}

export async function getTrashedSupportStaffs(
  params = {},
) {
  const response = await apiClient.get(
    '/admin/support-staff/trashed',
    {
      params,
    },
  )

  return getResponseData(response)
}

export async function restoreSupportStaff(id) {
  if (!id) {
    throw new Error(
      'Không tìm thấy mã nhân viên hỗ trợ.',
    )
  }

  const response = await apiClient.patch(
    `/admin/support-staff/${id}/restore`,
  )

  return getResponseData(response)
}

export async function forceDeleteSupportStaff(
  id,
) {
  if (!id) {
    throw new Error(
      'Không tìm thấy mã nhân viên hỗ trợ.',
    )
  }

  const response = await apiClient.delete(
    `/admin/support-staff/${id}/force-delete`,
  )

  return getResponseData(response)
}

/**
 * Lấy trạng thái online/offline
 * của toàn bộ nhân viên hỗ trợ.
 */
export async function getSupportStaffPresence() {
  const response = await apiClient.get(
    '/admin/support-staff/presence',
  )

  return getResponseData(response)
}

/**
 * Lấy lịch sử thao tác yêu cầu hỗ trợ
 * và lịch sử online của một NVHT.
 */
export async function getSupportStaffActivityHistory(
  id,
  params = {},
) {
  if (!id) {
    throw new Error(
      'Không tìm thấy mã nhân viên hỗ trợ.',
    )
  }

  const response = await apiClient.get(
    `/admin/support-staff/${id}/activity-history`,
    {
      params,
    },
  )

  return getResponseData(response)
}