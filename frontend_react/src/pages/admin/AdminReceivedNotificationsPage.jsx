import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useSearchParams } from 'react-router-dom'

import AdminPageHeader from '../../components/admin/AdminPageHeader'
import {
  getAdminReceivedNotificationDetail,
  getAdminReceivedNotifications,
  getAdminReceivedUnreadCount,
  markSupportRequestProcessedByAdmin,
} from '../../services/supportWorkflowApi'

function getErrorMessage(
  error,
  fallback,
) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  )
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  try {
    return new Intl.DateTimeFormat(
      'vi-VN',
      {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    ).format(new Date(value))
  } catch {
    return String(value)
  }
}

function getNotificationItems(payload) {
  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (
    Array.isArray(
      payload?.data?.data,
    )
  ) {
    return payload.data.data
  }

  if (Array.isArray(payload)) {
    return payload
  }

  return []
}

function getPagination(payload) {
  const source =
    payload?.data &&
    !Array.isArray(payload.data)
      ? payload.data
      : payload

  return {
    currentPage:
      Number(
        source?.current_page,
      ) || 1,

    lastPage:
      Number(
        source?.last_page,
      ) || 1,

    total:
      Number(source?.total) || 0,
  }
}

function getNotificationId(
  notification,
) {
  return (
    notification?.id ||
    notification?.notification_id ||
    null
  )
}

function getSupportRequestId(
  notification,
) {
  return (
    notification
      ?.support_request_id ||
    notification
      ?.data
      ?.support_request_id ||
    notification
      ?.support_request
      ?.id ||
    null
  )
}

function getTicketCode(
  notification,
) {
  const direct =
    notification
      ?.ticket_code ||
    notification
      ?.data
      ?.ticket_code ||
    notification
      ?.support_request
      ?.ticket_code

  if (direct) {
    return String(direct)
  }

  const source = [
    notification?.title,
    notification?.message,
  ]
    .filter(Boolean)
    .join(' ')

  const match =
    source.match(
      /SUP-\d{8}-[A-Z0-9]+/i,
    )

  return match
    ? match[0].toUpperCase()
    : ''
}

function parseNotificationData(
  value,
) {
  if (
    value &&
    typeof value === 'object'
  ) {
    return value
  }

  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return {}
  }

  try {
    const decoded =
      JSON.parse(value)

    return (
      decoded &&
      typeof decoded === 'object'
    )
      ? decoded
      : {}
  } catch {
    return {}
  }
}

function getSender(
  notification,
) {
  const data =
    parseNotificationData(
      notification?.data,
    )

  const sender =
    notification?.sender ||
    data?.sender ||
    {}

  const role =
    sender?.role ||
    notification?.sender_role ||
    data?.sender_role ||
    'system'

  const roleLabel =
    sender?.role_label ||
    notification
      ?.sender_role_label ||
    (
      role === 'guide'
        ? 'Hướng dẫn viên'
        : role === 'support'
          ? 'Nhân viên hỗ trợ'
          : 'Hệ thống'
    )

  return {
    id:
      sender?.id ||
      notification?.sender_id ||
      null,

    key:
      sender?.key ||
      notification?.sender_key ||
      'system',

    name:
      sender?.name ||
      notification?.sender_name ||
      roleLabel,

    role,

    role_label:
      roleLabel,

    avatar_url:
      sender?.avatar_url ||
      notification
        ?.sender_avatar_url ||
      null,
  }
}

function getInitials(
  name = '',
) {
  return (
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map(
        (part) =>
          part.charAt(0),
      )
      .join('')
      .toUpperCase() ||
    'HT'
  )
}

function normalizeNotificationDetail(
  detail,
  fallback,
) {
  const root =
    detail?.data ||
    detail ||
    {}

  const notification =
    root?.notification ||
    root

  return {
    ...(fallback || {}),
    ...(notification || {}),

    data:
      parseNotificationData(
        notification?.data ||
        fallback?.data,
      ),

    support_request:
      root?.support_request ||
      notification
        ?.support_request ||
      fallback
        ?.support_request ||
      null,
  }
}

function getSupportCategoryLabel(
  value,
) {
  const labels = {
    technical: 'Lỗi kỹ thuật',
    payment: 'Thanh toán',
    account: 'Tài khoản',
    feedback: 'Góp ý',
    general: 'Câu hỏi chung',
  }

  return (
    labels[value] ||
    value ||
    'Chưa phân loại'
  )
}

function getRequestAttachments(
  supportRequest,
) {
  return Array.isArray(
    supportRequest?.attachments,
  )
    ? supportRequest.attachments
    : []
}

function getBackendOrigin() {
  const configuredUrl =
    import.meta.env
      .VITE_API_URL ||
    import.meta.env
      .VITE_API_BASE_URL ||
    'http://127.0.0.1:8000/api'

  try {
    return new URL(
      configuredUrl,
      window.location.origin,
    ).origin
  } catch {
    return 'http://127.0.0.1:8000'
  }
}

function getAttachmentUrl(
  attachment,
) {
  const raw =
    attachment?.url ||
    attachment?.file_url ||
    attachment?.file_path ||
    ''

  if (!raw) {
    return ''
  }

  if (
    /^https?:\/\//i.test(raw)
  ) {
    return raw
  }

  const origin =
    getBackendOrigin()

  if (
    String(raw).startsWith(
      '/storage/',
    )
  ) {
    return `${origin}${raw}`
  }

  if (
    String(raw).startsWith(
      'storage/',
    )
  ) {
    return `${origin}/${raw}`
  }

  return (
    `${origin}/storage/` +
    String(raw)
      .replace(/^\/+/, '')
  )
}

function isImageAttachment(
  attachment,
) {
  if (
    attachment?.is_image ===
    true
  ) {
    return true
  }

  const mimeType =
    String(
      attachment?.mime_type ||
      '',
    ).toLowerCase()

  if (
    mimeType.startsWith(
      'image/',
    )
  ) {
    return true
  }

  const fileName =
    String(
      attachment?.original_name ||
      attachment?.name ||
      attachment?.file_path ||
      '',
    ).toLowerCase()

  return /\.(jpe?g|png|webp|gif|bmp|svg)$/.test(
    fileName,
  )
}

function formatFileSize(
  value,
) {
  const bytes =
    Number(value || 0)

  if (!bytes) {
    return ''
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

function isSupportAdminRequestNotification(
  notification,
) {
  const data =
    parseNotificationData(
      notification?.data,
    )

  const values = [
    notification?.type,
    notification?.kind,
    data?.type,
    data?.kind,
    data?.source,
    data?.notification_type,
  ]
    .filter(Boolean)
    .map((value) =>
      String(value)
        .trim()
        .toLowerCase(),
    )

  if (
    values.some((value) =>
      [
        'support_request_admin_action',
        'support_to_admin',
        'support_admin_request',
      ].includes(value),
    )
  ) {
    return true
  }

  const text = [
    notification?.title,
    notification?.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (
    text.includes(
      'yêu cầu hỗ trợ cần xử lý',
    ) ||
    text.includes(
      'nvht đã gửi yêu cầu xử lý',
    ) ||
    text.includes(
      'nhân viên hỗ trợ đã gửi yêu cầu xử lý',
    ) ||
    (
      Boolean(
        getSupportRequestId(
          notification,
        ),
      ) &&
      text.includes(
        'gửi yêu cầu xử lý',
      )
    )
  )
}

function isPendingSupportAdminRequestNotification(
  notification,
) {
  if (
    !isSupportAdminRequestNotification(
      notification,
    )
  ) {
    return false
  }

  const data =
    parseNotificationData(
      notification?.data,
    )

  const supportRequest =
    notification
      ?.support_request ||
    data?.support_request ||
    {}

  const pendingFlag =
    notification
      ?.support_request_is_pending_admin ??
    data
      ?.support_request_is_pending_admin

  if (
    pendingFlag === true ||
    pendingFlag === 1 ||
    pendingFlag === '1'
  ) {
    return true
  }

  if (
    pendingFlag === false ||
    pendingFlag === 0 ||
    pendingFlag === '0'
  ) {
    return false
  }

  const adminRequestStatus =
    notification
      ?.admin_request_status ||
    data
      ?.admin_request_status ||
    supportRequest
      ?.admin_request_status ||
    null

  const supportRequestStatus =
    notification
      ?.support_request_status ||
    data
      ?.support_request_status ||
    supportRequest?.status ||
    null

  /*
   * Dữ liệu mới:
   * chỉ giữ trong danh sách chờ xử lý khi
   * admin_request_status = pending và ticket chưa resolved.
   */
  if (adminRequestStatus) {
    return (
      adminRequestStatus ===
        'pending' &&
      supportRequestStatus !==
        'resolved' &&
      supportRequestStatus !==
        'cancelled'
    )
  }

  /*
   * Dữ liệu notification cũ chưa lưu trạng thái ticket.
   * Tạm xem là đang chờ cho tới khi backend trả flag chính xác.
   */
  return true
}

function deduplicateNotifications(
  items,
) {
  const map = new Map()

  items.forEach((item) => {
    const id =
      getNotificationId(item)

    if (!id) {
      return
    }

    map.set(
      String(id),
      item,
    )
  })

  return Array.from(
    map.values(),
  )
}

function getReadStatus(
  notification,
) {
  if (
    notification?.status
  ) {
    return notification.status
  }

  return notification?.read_at
    ? 'read'
    : 'unread'
}

function getRequestStatusLabel(
  status,
) {
  const map = {
    pending: 'Đang chờ',
    in_progress:
      'Đang xử lý',
    resolved: 'Đã xử lý',
    cancelled: 'Đã hủy',
  }

  return (
    map[status] ||
    status ||
    'Chưa xác định'
  )
}

function AdminReceivedNotificationsPage() {
  const [searchParams] =
    useSearchParams()

  const [
    allNotifications,
    setAllNotifications,
  ] = useState([])

  const [
    selectedNotification,
    setSelectedNotification,
  ] = useState(null)

  const [page, setPage] =
    useState(1)

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0)

  const [loading, setLoading] =
    useState(true)

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false)

  const [
    processing,
    setProcessing,
  ] = useState(false)

  const [error, setError] =
    useState('')

  const [notice, setNotice] =
    useState('')

  const [
    notificationFilter,
    setNotificationFilter,
  ] = useState('all')

  const pageSize = 15

  const queryNotificationId =
    searchParams.get(
      'notification',
    )

  const querySupportRequestId =
    searchParams.get(
      'supportRequestId',
    )

  const selectedRequestId =
    getSupportRequestId(
      selectedNotification,
    ) ||
    querySupportRequestId

  const selectedRequest =
    selectedNotification
      ?.support_request ||
    selectedNotification
      ?.data
      ?.support_request ||
    null

  const selectedIsProcessed =
    selectedRequest?.status ===
      'resolved' ||
    selectedNotification
      ?.admin_request_status ===
      'processed' ||
    selectedNotification
      ?.data
      ?.admin_request_status ===
      'processed'

  /*
   * "Thông báo" là kho lưu toàn bộ notification,
   * bao gồm cả notification NVHT gửi yêu cầu xử lý.
   *
   * Tab "Yêu cầu xử lý từ NVHT" chỉ chứa những
   * yêu cầu hiện vẫn đang chờ Admin xử lý.
   */
  const pendingSupportRequestNotifications =
    useMemo(
      () =>
        allNotifications.filter(
          isPendingSupportAdminRequestNotification,
        ),
      [allNotifications],
    )

  const filterOptions =
    useMemo(
      () => [
        {
          value: 'all',
          label: 'Thông báo',
          count:
            allNotifications.length,
        },
        {
          value:
            'support_admin_request',
          label:
            'Yêu cầu xử lý từ NVHT',
          count:
            pendingSupportRequestNotifications.length,
        },
      ],
      [
        allNotifications.length,
        pendingSupportRequestNotifications.length,
      ],
    )

  const filteredNotifications =
    notificationFilter ===
      'support_admin_request'
      ? pendingSupportRequestNotifications
      : allNotifications

  const sortedFilteredNotifications =
    useMemo(
      () =>
        [...filteredNotifications].sort(
          (left, right) =>
            new Date(
              right.created_at || 0,
            ).getTime() -
            new Date(
              left.created_at || 0,
            ).getTime(),
        ),
      [filteredNotifications],
    )

  const pagination =
    useMemo(() => {
      const total =
        sortedFilteredNotifications.length

      const lastPage =
        Math.max(
          1,
          Math.ceil(
            total / pageSize,
          ),
        )

      const currentPage =
        Math.min(
          Math.max(page, 1),
          lastPage,
        )

      return {
        currentPage,
        lastPage,
        total,
      }
    }, [
      page,
      sortedFilteredNotifications.length,
    ])

  const notifications =
    useMemo(() => {
      const start =
        (pagination.currentPage - 1) *
        pageSize

      return sortedFilteredNotifications.slice(
        start,
        start + pageSize,
      )
    }, [
      pagination.currentPage,
      sortedFilteredNotifications,
    ])

  const sortedNotifications =
    notifications

  const loadUnreadCount =
    useCallback(async () => {
      try {
        const count =
          await getAdminReceivedUnreadCount()

        setUnreadCount(
          Number(count || 0),
        )
      } catch {
        setUnreadCount(0)
      }
    }, [])

  const openNotification =
    useCallback(
      async (
        notification,
        {
          silent = false,
        } = {},
      ) => {
        const id =
          typeof notification ===
          'object'
            ? getNotificationId(
                notification,
              )
            : notification

        if (!id) {
          return
        }

        if (!silent) {
          setDetailLoading(true)
          setError('')
          setNotice('')
        }

        try {
          const detail =
            await getAdminReceivedNotificationDetail(
              id,
            )

          const normalized =
            normalizeNotificationDetail(
              detail,
              typeof notification ===
                'object'
                ? notification
                : null,
            )

          setSelectedNotification(
            normalized,
          )

          setAllNotifications(
            (current) =>
              current.map(
                (item) =>
                  String(
                    getNotificationId(
                      item,
                    ),
                  ) === String(id)
                    ? {
                        ...item,
                        ...normalized,
                        status: 'read',
                      }
                    : item,
              ),
          )

          await loadUnreadCount()

          if (!silent) {
            window.dispatchEvent(
              new CustomEvent(
                'admin-notification:changed',
                {
                  detail: {
                    source:
                      'received-notifications-page',
                  },
                },
              ),
            )
          }
        } catch (requestError) {
          setError(
            getErrorMessage(
              requestError,
              'Không mở được thông báo.',
            ),
          )
        } finally {
          if (!silent) {
            setDetailLoading(false)
          }
        }
      },
      [loadUnreadCount],
    )

  const fetchNotificationBucket =
    useCallback(
      async (filterValue) => {
        const collected = []
        let currentPage = 1
        let lastPage = 1

        do {
          const payload =
            await getAdminReceivedNotifications(
              currentPage,
              {
                notification_filter:
                  filterValue,
                per_page: 100,
              },
            )

          collected.push(
            ...getNotificationItems(
              payload,
            ),
          )

          lastPage =
            Math.max(
              1,
              getPagination(
                payload,
              ).lastPage,
            )

          currentPage += 1
        } while (
          currentPage <= lastPage
        )

        return collected
      },
      [],
    )

  const loadNotifications =
    useCallback(async () => {
      setLoading(true)
      setError('')

      try {
        /*
         * Gọi kho toàn bộ notification và danh sách
         * yêu cầu NVHT đang chờ xử lý.
         *
         * Kho "Thông báo" vẫn giữ cả notification đã xử lý.
         */
        const [
          allBucket,
          supportBucket,
        ] = await Promise.all([
          fetchNotificationBucket(
            'all',
          ),
          fetchNotificationBucket(
            'support_admin_request',
          ),
        ])

        const merged =
          deduplicateNotifications([
            ...allBucket,
            ...supportBucket,
          ])

        setAllNotifications(
          merged,
        )

        const queryTarget =
          queryNotificationId
            ? merged.find(
                (item) =>
                  String(
                    getNotificationId(
                      item,
                    ),
                  ) ===
                  String(
                    queryNotificationId,
                  ),
              )
            : querySupportRequestId
              ? merged.find(
                  (item) =>
                    String(
                      getSupportRequestId(
                        item,
                      ),
                    ) ===
                    String(
                      querySupportRequestId,
                    ),
                )
              : null

        if (queryTarget) {
          setNotificationFilter(
            isPendingSupportAdminRequestNotification(
              queryTarget,
            )
              ? 'support_admin_request'
              : 'all',
          )
        }
      } catch (requestError) {
        setAllNotifications([])
        setSelectedNotification(
          null,
        )

        setError(
          getErrorMessage(
            requestError,
            'Không tải được danh sách thông báo đã nhận.',
          ),
        )
      } finally {
        setLoading(false)
      }
    }, [
      fetchNotificationBucket,
      queryNotificationId,
      querySupportRequestId,
    ])

  useEffect(() => {
    void loadNotifications()
    void loadUnreadCount()
  }, [
    loadNotifications,
    loadUnreadCount,
  ])

  useEffect(() => {
    setPage(1)
    setSelectedNotification(
      null,
    )
  }, [notificationFilter])

  useEffect(() => {
    if (
      page !==
      pagination.currentPage
    ) {
      setPage(
        pagination.currentPage,
      )
    }
  }, [
    page,
    pagination.currentPage,
  ])

  useEffect(() => {
    const target =
      queryNotificationId
        ? filteredNotifications.find(
            (item) =>
              String(
                getNotificationId(
                  item,
                ),
              ) ===
              String(
                queryNotificationId,
              ),
          )
        : querySupportRequestId
          ? filteredNotifications.find(
              (item) =>
                String(
                  getSupportRequestId(
                    item,
                  ),
                ) ===
                String(
                  querySupportRequestId,
                ),
            )
          : notifications[0]

    if (!target) {
      setSelectedNotification(
        null,
      )
      return
    }

    const targetId =
      getNotificationId(target)

    const selectedId =
      getNotificationId(
        selectedNotification,
      )

    if (
      String(targetId) ===
      String(selectedId)
    ) {
      return
    }

    setSelectedNotification(
      target,
    )

    void openNotification(
      target,
      {
        silent: true,
      },
    )
  }, [
    filteredNotifications,
    notifications,
    openNotification,
    queryNotificationId,
    querySupportRequestId,
    selectedNotification,
  ])

  useEffect(() => {
    const handleFocus = () => {
      void loadNotifications()
      void loadUnreadCount()
    }

    window.addEventListener(
      'focus',
      handleFocus,
    )

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus,
      )
    }
  }, [
    loadNotifications,
    loadUnreadCount,
  ])

  async function processSupportRequest() {
    if (
      !selectedRequestId ||
      processing ||
      selectedIsProcessed
    ) {
      return
    }

    setProcessing(true)
    setError('')
    setNotice('')

    try {
      const response =
        await markSupportRequestProcessedByAdmin(
          selectedRequestId,
        )

      const processedTicket =
        response?.data ||
        response?.support_request ||
        {
          id:
            selectedRequestId,

          status: 'resolved',

          admin_request_status:
            'processed',
        }

      const selectedNotificationId =
        getNotificationId(
          selectedNotification,
        )

      const applyProcessedState =
        (notification) => {
          if (
            String(
              getNotificationId(
                notification,
              ),
            ) !==
            String(
              selectedNotificationId,
            )
          ) {
            return notification
          }

          const currentData =
            parseNotificationData(
              notification?.data,
            )

          return {
            ...notification,

            support_request_status:
              'resolved',

            admin_request_status:
              'processed',

            support_request_is_pending_admin:
              false,

            data: {
              ...currentData,

              support_request_status:
                'resolved',

              admin_request_status:
                'processed',

              support_request_is_pending_admin:
                false,
            },

            support_request: {
              ...(
                notification
                  ?.support_request ||
                {}
              ),

              ...processedTicket,

              status: 'resolved',

              admin_request_status:
                'processed',
            },
          }
        }

      /*
       * Cập nhật ngay trên giao diện:
       * - Tab yêu cầu NVHT: item biến mất.
       * - Tab Thông báo: notification vẫn được lưu.
       */
      setAllNotifications(
        (current) =>
          current.map(
            applyProcessedState,
          ),
      )

      setNotice(
        response?.message ||
          'Đã xác nhận xử lý xong yêu cầu hỗ trợ.',
      )

      if (
        notificationFilter ===
        'support_admin_request'
      ) {
        setSelectedNotification(
          null,
        )
      } else {
        setSelectedNotification(
          (current) =>
            current
              ? applyProcessedState(
                  current,
                )
              : current,
        )
      }

      await loadUnreadCount()

      /*
       * Đồng bộ lại dữ liệu server.
       * Backend sẽ không trả yêu cầu đã processed
       * trong bucket support_admin_request nữa.
       */
      await loadNotifications()

      window.dispatchEvent(
        new CustomEvent(
          'admin-notification:changed',
          {
            detail: {
              source:
                'received-notifications-page',
            },
          },
        ),
      )
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Không thể xác nhận yêu cầu đã xử lý.',
        ),
      )
    } finally {
      setProcessing(false)
    }
  }

  return (
    <section className="w-full max-w-none space-y-5 px-4 py-5 xl:px-6">
      <AdminPageHeader
        breadcrumb={[
          'ViVuGo',
          'Thông Báo Đã Nhận',
        ]}
        title="Thông Báo Đã Nhận"
        description="Theo dõi các thông báo gửi tới Admin và xử lý yêu cầu hỗ trợ."
        showNotificationBell
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">
            Tổng thông báo
          </span>
          <strong className="mt-2 block text-3xl font-black text-slate-900">
            {allNotifications.length}
          </strong>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase text-red-400">
            Chưa đọc
          </span>
          <strong className="mt-2 block text-3xl font-black text-red-600">
            {unreadCount}
          </strong>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase text-blue-400">
            Trang hiện tại
          </span>
          <strong className="mt-2 block text-3xl font-black text-blue-600">
            {pagination.currentPage}
          </strong>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="grid min-h-[640px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:grid-cols-[430px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200">
          <div className="border-b border-slate-100 px-4 py-4">
            <h2 className="font-black text-slate-900">
              Danh sách thông báo
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Thông báo lưu toàn bộ lịch sử; yêu cầu từ NVHT chỉ hiện các đơn đang chờ Admin xử lý.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {filterOptions.map(
                (item) => (
                  <button
                    key={
                      item.value
                    }
                    type="button"
                    onClick={() =>
                      setNotificationFilter(
                        item.value,
                      )
                    }
                    className={[
                      'rounded-full border px-3 py-2 text-[11px] font-black transition',
                      notificationFilter ===
                      item.value
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600',
                    ].join(' ')}
                  >
                    {
                      item.label
                    }
                    {' '}
                    (
                    {Number(
                      item.count || 0,
                    )}
                    )
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="max-h-[720px] overflow-y-auto">
            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">
                Đang tải thông báo...
              </div>
            ) : sortedNotifications.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">
                {notificationFilter ===
                'support_admin_request'
                  ? 'Chưa có yêu cầu xử lý nào từ NVHT.'
                  : 'Chưa có thông báo nào.'}
              </div>
            ) : (
              sortedNotifications.map(
                (notification) => {
                  const id =
                    getNotificationId(
                      notification,
                    )

                  const active =
                    String(
                      getNotificationId(
                        selectedNotification,
                      ),
                    ) ===
                    String(id)

                  const unread =
                    getReadStatus(
                      notification,
                    ) ===
                    'unread'

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        void openNotification(
                          notification,
                        )
                      }
                      className={[
                        'flex w-full gap-3 border-b border-slate-100 px-5 py-4 text-left transition',
                        active
                          ? 'bg-blue-50'
                          : 'hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                          unread
                            ? 'bg-red-500'
                            : 'bg-slate-300',
                        ].join(' ')}
                      />

                      <span className="min-w-0 flex-1">
                        <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={[
                              'rounded-full px-2 py-0.5 text-[9px] font-black',
                              getSender(
                                notification,
                              ).role ===
                              'guide'
                                ? 'bg-violet-50 text-violet-700'
                                : getSender(
                                      notification,
                                    ).role ===
                                    'support'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600',
                            ].join(' ')}
                          >
                            {
                              getSender(
                                notification,
                              )
                                .role_label
                            }
                          </span>

                          <span className="max-w-[190px] truncate text-[10px] font-bold text-slate-500">
                            {
                              getSender(
                                notification,
                              ).name
                            }
                          </span>
                        </span>

                        <strong className="block truncate text-sm text-slate-900">
                          {notification.title ||
                            'Thông báo'}
                        </strong>

                        <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">
                          {notification.message ||
                            'Không có nội dung.'}
                        </span>

                        <small className="mt-2 block text-[11px] text-slate-400">
                          {formatDateTime(
                            notification.created_at,
                          )}
                        </small>
                      </span>
                    </button>
                  )
                },
              )
            )}
          </div>

          <div className="flex items-center justify-center gap-3 border-t border-slate-200 p-4">
            <button
              type="button"
              disabled={
                pagination.currentPage <=
                  1 ||
                loading
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                )
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"
            >
              ←
            </button>

            <span className="text-sm font-bold text-slate-600">
              {pagination.currentPage} /{' '}
              {pagination.lastPage}
            </span>

            <button
              type="button"
              disabled={
                pagination.currentPage >=
                  pagination.lastPage ||
                loading
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.min(
                      pagination.lastPage,
                      current + 1,
                    ),
                )
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </aside>

        <main className="min-w-0 p-5 xl:p-7">
          {!selectedNotification ? (
            <div className="grid h-full min-h-[430px] place-items-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
              Chọn một thông báo để xem chi tiết.
            </div>
          ) : detailLoading ? (
            <div className="grid h-full min-h-[430px] place-items-center text-sm text-slate-500">
              Đang mở nội dung thông báo...
            </div>
          ) : (
            <article className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      Admin nhận
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {getReadStatus(
                        selectedNotification,
                      ) === 'unread'
                        ? 'Chưa đọc'
                        : 'Đã đọc'}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl font-black text-slate-950">
                    {selectedNotification.title ||
                      'Thông báo'}
                  </h2>

                  <time className="mt-2 block text-sm text-slate-500">
                    {formatDateTime(
                      selectedNotification.created_at,
                    )}
                  </time>
                </div>

                {getTicketCode(
                  selectedNotification,
                ) ? (
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
                    {getTicketCode(
                      selectedNotification,
                    )}
                  </span>
                ) : null}
              </div>

              <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                {getSender(
                  selectedNotification,
                ).avatar_url ? (
                  <img
                    src={
                      getSender(
                        selectedNotification,
                      ).avatar_url
                    }
                    alt={
                      getSender(
                        selectedNotification,
                      ).name
                    }
                    className="h-11 w-11 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-xs font-black text-blue-700">
                    {getInitials(
                      getSender(
                        selectedNotification,
                      ).name,
                    )}
                  </span>
                )}

                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Người gửi
                  </span>

                  <strong className="block truncate text-sm text-slate-900">
                    {
                      getSender(
                        selectedNotification,
                      ).name
                    }
                  </strong>

                  <small className="mt-0.5 block text-xs font-bold text-blue-600">
                    {
                      getSender(
                        selectedNotification,
                      ).role_label
                    }
                  </small>
                </div>
              </section>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                {selectedNotification.message ||
                  'Không có nội dung thông báo.'}
              </div>

              {selectedRequestId ? (
                <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                  <h3 className="font-black text-blue-950">
                    Yêu cầu hỗ trợ liên quan
                  </h3>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-bold uppercase text-blue-400">
                        Mã yêu cầu
                      </dt>
                      <dd className="mt-1 font-black text-blue-950">
                        {getTicketCode(
                          selectedNotification,
                        ) ||
                          `#${selectedRequestId}`}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase text-blue-400">
                        Trạng thái
                      </dt>
                      <dd className="mt-1 font-black text-blue-950">
                        {getRequestStatusLabel(
                          selectedRequest?.status,
                        )}
                      </dd>
                    </div>

                    <div className="sm:col-span-2">
                      <dt className="text-xs font-bold uppercase text-blue-400">
                        Nội dung NVHT gửi Admin
                      </dt>
                      <dd className="mt-2 rounded-xl border border-blue-100 bg-white p-4 text-sm leading-6 text-slate-700">
                        {selectedRequest
                          ?.admin_request_content ||
                          selectedNotification
                            ?.admin_request_content ||
                          selectedNotification
                            ?.data
                            ?.admin_request_content ||
                          'Chưa có nội dung chi tiết.'}
                      </dd>
                    </div>
                  </dl>

                  <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                          Đơn yêu cầu của khách hàng
                        </span>

                        <h4 className="mt-1 text-base font-black text-slate-900">
                          {selectedRequest
                            ?.subject ||
                            'Yêu cầu hỗ trợ'}
                        </h4>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                        {getSupportCategoryLabel(
                          selectedRequest
                            ?.category,
                        )}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-[10px] font-black uppercase text-slate-400">
                          Khách hàng
                        </dt>
                        <dd className="mt-1 font-bold text-slate-800">
                          {selectedRequest
                            ?.full_name ||
                            selectedRequest
                              ?.user
                              ?.full_name ||
                            '—'}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[10px] font-black uppercase text-slate-400">
                          Email
                        </dt>
                        <dd className="mt-1 break-all font-bold text-slate-800">
                          {selectedRequest
                            ?.email ||
                            selectedRequest
                              ?.user
                              ?.email ||
                            '—'}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[10px] font-black uppercase text-slate-400">
                          Số điện thoại
                        </dt>
                        <dd className="mt-1 font-bold text-slate-800">
                          {selectedRequest
                            ?.phone ||
                            selectedRequest
                              ?.user
                              ?.phone ||
                            '—'}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4">
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Nội dung khách yêu cầu
                      </span>

                      <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                        {selectedRequest
                          ?.description ||
                          'Khách hàng chưa nhập nội dung.'}
                      </p>
                    </div>

                    {getRequestAttachments(
                      selectedRequest,
                    ).length > 0 ? (
                      <div className="mt-5">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                          Ảnh và tệp khách đính kèm
                        </span>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {getRequestAttachments(
                            selectedRequest,
                          ).map(
                            (
                              attachment,
                            ) => {
                              const url =
                                getAttachmentUrl(
                                  attachment,
                                )

                              const name =
                                attachment
                                  ?.original_name ||
                                attachment
                                  ?.name ||
                                'Tệp đính kèm'

                              return (
                                <a
                                  key={
                                    attachment
                                      ?.id ||
                                    `${name}-${url}`
                                  }
                                  href={
                                    url ||
                                    undefined
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-blue-300 hover:shadow-sm"
                                >
                                  {isImageAttachment(
                                    attachment,
                                  ) &&
                                  url ? (
                                    <img
                                      src={
                                        url
                                      }
                                      alt={
                                        name
                                      }
                                      className="h-36 w-full object-cover transition group-hover:scale-[1.02]"
                                    />
                                  ) : (
                                    <div className="grid h-24 place-items-center bg-slate-100 text-3xl">
                                      📎
                                    </div>
                                  )}

                                  <div className="p-3">
                                    <strong className="block truncate text-xs text-slate-800">
                                      {
                                        name
                                      }
                                    </strong>

                                    <small className="mt-1 block text-[10px] text-slate-400">
                                      {formatFileSize(
                                        attachment
                                          ?.size ||
                                        attachment
                                          ?.size_bytes,
                                      ) ||
                                        attachment
                                          ?.mime_type ||
                                        'Tệp đính kèm'}
                                    </small>
                                  </div>
                                </a>
                              )
                            },
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-400">
                        Khách hàng không gửi ảnh hoặc tệp đính kèm.
                      </p>
                    )}
                  </section>

                  <button
                    type="button"
                    onClick={
                      processSupportRequest
                    }
                    disabled={
                      processing ||
                      selectedIsProcessed
                    }
                    className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {selectedIsProcessed
                      ? 'Yêu cầu đã được xử lý'
                      : processing
                        ? 'Đang xác nhận...'
                        : 'Đã xử lý xong'}
                  </button>
                </section>
              ) : null}
            </article>
          )}
        </main>
      </div>
    </section>
  )
}

export default AdminReceivedNotificationsPage