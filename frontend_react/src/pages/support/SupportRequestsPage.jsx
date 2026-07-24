import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import {
  getSupportRequestAssignees,
  getSupportRequestDetail,
  getSupportRequestHistory,
  getSupportRequestMessages,
  getSupportRequests,
  getSupportStaffOptions,
  releaseSupportRequest,
  sendSupportRequestMessage,
  transferSupportRequest,
} from '../../services/supportRequestApi'
import {
  claimSupportRequest,
  requestCustomerMoreInfo,
  sendSupportRequestToAdmin,
} from '../../services/supportWorkflowApi'

const STATUS_LABELS = {
  pending: 'Chưa hỗ trợ',
  in_progress: 'Đang hỗ trợ',
  cancelled: 'Đã hủy',
  resolved: 'Đã hỗ trợ',
}

const CATEGORY_LABELS = {
  technical: 'Lỗi kỹ thuật',
  payment: 'Thanh toán',
  account: 'Tài khoản',
  booking: 'Đặt tour',
  cancellation: 'Hoàn hủy',
  feedback: 'Góp ý',
  general: 'Câu hỏi chung',
  other: 'Khác',
}

const STATUS_STYLES = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  in_progress: 'border-blue-200 bg-blue-50 text-blue-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

function getSupportDisplayStatus(item) {
  if (item?.status === 'pending' && item?.needs_more_info) {
    return {
      label: 'Cần bổ sung',
      className: 'border-red-200 bg-red-50 text-red-700',
    }
  }

  return {
    label:
      STATUS_LABELS[item?.status] ||
      item?.status ||
      'Không xác định',
    className:
      STATUS_STYLES[item?.status] ||
      'border-slate-200 bg-slate-50 text-slate-600',
  }
}

const DEFAULT_MORE_INFO_MESSAGE =
  'Vui lòng mô tả chi tiết vấn đề bạn đang gặp phải và cung cấp ảnh chụp màn hình/tài liệu liên quan để chúng tôi kiểm tra.'

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(String(value).replace(' ', 'T'))

  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDuration(start, end) {
  if (!start) return 'Chưa tiếp nhận'

  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return '—'
  }

  const diff = Math.max(endDate.getTime() - startDate.getTime(), 0)
  const minutes = Math.floor(diff / 60000)

  if (minutes < 60) return `${minutes} phút`

  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60

  if (hours < 24) {
    return `${hours} giờ ${remainMinutes} phút`
  }

  const days = Math.floor(hours / 24)
  const remainHours = hours % 24

  return `${days} ngày ${remainHours} giờ`
}

function getInitials(name) {
  return String(name || 'NV')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getAssignedStaff(item) {
  if (!item) return null

  if (item.assigned_staff) {
    return item.assigned_staff
  }

  if (item.assigned_to && typeof item.assigned_to === 'object') {
    return item.assigned_to
  }

  return null
}

function getStaffCode(staff) {
  if (!staff) return ''

  return String(
    staff.staff_code ||
      staff.employee_code ||
      staff.code ||
      `NVHT-${String(staff.id || '').padStart(4, '0')}`,
  )
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

function getAttachmentUrl(file) {
  return (
    file?.url ||
    file?.file_url ||
    file?.path ||
    file?.file_path ||
    '#'
  )
}

function StaffAvatar({
  staff,
  size = 'h-9 w-9',
}) {
  if (staff?.avatar_url) {
    return (
      <img
        src={staff.avatar_url}
        alt={staff.full_name || 'Nhân viên hỗ trợ'}
        className={`${size} shrink-0 rounded-full border-2 border-white object-cover shadow-sm`}
      />
    )
  }

  return (
    <span
      className={`${size} inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-[10px] font-black text-blue-700 shadow-sm`}
    >
      {getInitials(staff?.full_name)}
    </span>
  )
}

export default function SupportRequestsPage() {
  const [searchParams] = useSearchParams()
  const ticketFromNotification =
    searchParams.get('ticket') || ''

  const supportRequestIdFromNotification =
    searchParams.get('supportRequestId') || ''

  const openedTicketRef = useRef('')
  const chatBottomRef = useRef(null)
  const historyScrollRef = useRef(null)

  const [requests, setRequests] = useState([])
  const [assignees, setAssignees] = useState([])
  const [staffOptions, setStaffOptions] = useState([])

  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [histories, setHistories] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('pending')
  const [category, setCategory] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [ownershipScope, setOwnershipScope] = useState('all')

  const [counts, setCounts] = useState({
    pending: 0,
    needs_more_info: 0,
    in_progress: 0,
    resolved: 0,
  })

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [sendingAdminRequest, setSendingAdminRequest] =
    useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState([])

  const [moreInfoOpen, setMoreInfoOpen] = useState(false)
  const [moreInfoMessage, setMoreInfoMessage] = useState(
    DEFAULT_MORE_INFO_MESSAGE,
  )

  const [transferOpen, setTransferOpen] = useState(false)
  const [transferStaffId, setTransferStaffId] = useState('')
  const [transferSearch, setTransferSearch] = useState('')
  const [transferReason, setTransferReason] = useState('')

  const [adminRequestContent, setAdminRequestContent] =
    useState('')

  const showOwnershipTabs =
    status === 'in_progress' ||
    status === 'resolved' ||
    status === 'needs_more_info'

  const showAssigneeFilter =
    showOwnershipTabs && ownershipScope === 'all'

  const selectedStaff = useMemo(
    () => getAssignedStaff(selected),
    [selected],
  )

  const filteredTransferStaffOptions = useMemo(() => {
    const keyword =
      transferSearch
        .trim()
        .toLowerCase()

    return staffOptions
      .filter(
        (staff) =>
          String(staff.id) !==
          String(selectedStaff?.id || ''),
      )
      .filter((staff) => {
        if (!keyword) {
          return true
        }

        const searchableText = [
          staff.full_name,
          staff.email,
          getStaffCode(staff),
          staff.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return searchableText.includes(
          keyword,
        )
      })
  }, [
    staffOptions,
    selectedStaff,
    transferSearch,
  ])

  const selectedTransferStaff = useMemo(
    () =>
      staffOptions.find(
        (staff) =>
          String(staff.id) ===
          String(transferStaffId),
      ) || null,
    [
      staffOptions,
      transferStaffId,
    ],
  )

  const processingDuration = useMemo(() => {
    if (!selected) return '—'

    return formatDuration(
      selected.started_at,
      selected.resolved_at,
    )
  }, [selected])

  const canReply = Boolean(
    selected?.can_reply ||
      (
        selected?.status === 'in_progress' &&
        selected?.is_mine
      ),
  )

  const adminPending =
    selected?.admin_request_status === 'pending'

  const adminProcessed =
    selected?.admin_request_status === 'processed'

  async function loadAssignees() {
    try {
      const data =
        await getSupportRequestAssignees()

      setAssignees(
        normalizeArray(data),
      )
    } catch (requestError) {
      console.error(
        'Không thể tải danh sách NVHT:',
        requestError,
      )

      setAssignees([])
    }
  }

  async function loadStaffOptions() {
    try {
      const data =
        await getSupportStaffOptions()

      setStaffOptions(
        normalizeArray(data),
      )
    } catch (requestError) {
      console.error(
        'Không thể tải danh sách chuyển NVHT:',
        requestError,
      )

      setStaffOptions([])
    }
  }

  async function loadRequests() {
    setLoading(true)

    try {
      const payload =
        await getSupportRequests({
          search:
            search ||
            undefined,

          status:
            status === 'needs_more_info'
              ? 'pending'
              : status ||
                undefined,

          needs_more_info:
            status === 'needs_more_info'
              ? 1
              : status === 'pending'
                ? 0
                : undefined,

          category:
            category ||
            undefined,

          scope:
            showOwnershipTabs
              ? ownershipScope
              : undefined,

          assigned_to:
            showAssigneeFilter &&
            assignedTo
              ? assignedTo
              : undefined,
        })

      setRequests(
        normalizeArray(
          payload?.items,
        ),
      )

      setCounts(
        payload?.counts || {
          pending: 0,
          needs_more_info: 0,
          in_progress: 0,
          resolved: 0,
        },
      )
    } catch (requestError) {
      console.error(
        'Không thể tải yêu cầu hỗ trợ:',
        requestError,
      )

      setError(
        requestError?.response?.data?.message ||
          'Không thể tải danh sách yêu cầu hỗ trợ.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadConversation(
    ticketId,
  ) {
    /*
     * messages/history hiện tại có thể trả 500 ở backend.
     * Không dùng Promise.all vì chỉ một API lỗi cũng làm
     * toàn bộ phần mở chi tiết ticket thất bại.
     */
    const [
      messageResult,
      historyResult,
    ] =
      await Promise.allSettled([
        getSupportRequestMessages(
          ticketId,
        ),

        getSupportRequestHistory(
          ticketId,
        ),
      ])

    if (
      messageResult.status ===
      'fulfilled'
    ) {
      setMessages(
        normalizeArray(
          messageResult.value,
        ),
      )
    } else {
      console.error(
        'Không thể tải messages:',
        messageResult.reason,
      )

      setMessages([])
    }

    if (
      historyResult.status ===
      'fulfilled'
    ) {
      setHistories(
        normalizeArray(
          historyResult.value,
        ),
      )
    } else {
      console.error(
        'Không thể tải history:',
        historyResult.reason,
      )

      setHistories([])
    }
  }

  async function openDetail(item) {
    if (!item?.id) return

    setDetailLoading(true)
    setError('')
    setNotice('')
    setHistoryOpen(false)

    try {
      const detail =
        await getSupportRequestDetail(
          item.id,
        )

      setSelected(detail)
      setAdminRequestContent('')

      await loadConversation(
        item.id,
      )
    } catch (requestError) {
      console.error(
        'Không thể mở ticket:',
        requestError,
      )

      setError(
        requestError?.response?.data?.message ||
          'Không thể mở chi tiết yêu cầu.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  async function refreshSelected(id) {
    try {
      const detail =
        await getSupportRequestDetail(
          id,
        )

      setSelected(detail)

      await loadConversation(id)
    } catch (requestError) {
      console.error(
        'Không thể làm mới ticket:',
        requestError,
      )
    }
  }

  async function refreshEverything(id) {
    await Promise.allSettled([
      loadRequests(),
      loadAssignees(),
      loadStaffOptions(),
    ])

    if (id) {
      await refreshSelected(id)
    }

    window.dispatchEvent(
      new Event(
        'support-request-count-changed',
      ),
    )
  }

  useEffect(() => {
    void Promise.allSettled([
      loadAssignees(),
      loadStaffOptions(),
    ])
  }, [])

  useEffect(() => {
    if (showOwnershipTabs) {
      setOwnershipScope('mine')
    } else {
      setOwnershipScope('all')
    }
  }, [status])

  useEffect(() => {
    if (!showAssigneeFilter) {
      setAssignedTo('')
    }
  }, [showAssigneeFilter])

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadRequests()
      }, 250)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    search,
    status,
    category,
    assignedTo,
    ownershipScope,
  ])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadRequests()
    }, 30000)

    function handleSupportNotificationChanged() {
      void loadRequests()
    }

    window.addEventListener(
      'support-notification-changed',
      handleSupportNotificationChanged,
    )

    return () => {
      window.clearInterval(intervalId)

      window.removeEventListener(
        'support-notification-changed',
        handleSupportNotificationChanged,
      )
    }
  }, [
    search,
    status,
    category,
    assignedTo,
    ownershipScope,
  ])

  useEffect(() => {
    if (!supportRequestIdFromNotification) {
      return
    }

    const openKey =
      `id:${supportRequestIdFromNotification}`

    if (
      openedTicketRef.current ===
      openKey
    ) {
      return
    }

    openedTicketRef.current =
      openKey

    void openDetail({
      id:
        supportRequestIdFromNotification,
    })
  }, [
    supportRequestIdFromNotification,
  ])

  useEffect(() => {
    if (
      ticketFromNotification
    ) {
      setSearch(
        ticketFromNotification,
      )
    }
  }, [
    ticketFromNotification,
  ])

  useEffect(() => {
    if (
      supportRequestIdFromNotification
      ||
      !ticketFromNotification
    ) {
      return
    }

    if (
      openedTicketRef.current ===
      ticketFromNotification
    ) {
      return
    }

    const target =
      requests.find(
        (item) =>
          String(
            item.ticket_code ||
              '',
          ).toUpperCase() ===
          ticketFromNotification.toUpperCase(),
      )

    if (!target) return

    openedTicketRef.current =
      ticketFromNotification

    void openDetail(target)
  }, [
    requests,
    ticketFromNotification,
    supportRequestIdFromNotification,
  ])

  useEffect(() => {
    chatBottomRef.current
      ?.scrollIntoView({
        behavior: 'smooth',
      })
  }, [messages])

  useEffect(() => {
    if (!historyOpen) {
      return
    }

    const frameId =
      window.requestAnimationFrame(() => {
        const element =
          historyScrollRef.current

        if (!element) {
          return
        }

        /*
         * Mặc định mở ở cuối danh sách để NVHT thấy
         * lịch sử mới nhất trước.
         */
        element.scrollTop =
          element.scrollHeight
      })

    return () => {
      window.cancelAnimationFrame(
        frameId,
      )
    }
  }, [
    historyOpen,
    histories,
  ])

  async function handleClaim(item) {
    if (
      !item?.id ||
      actionLoading
    ) {
      return
    }

    setActionLoading(true)
    setError('')
    setNotice('')

    try {
      const response =
        await claimSupportRequest(
          item.id,
        )

      setNotice(
        response?.message ||
          'Đã tiếp nhận yêu cầu.',
      )

      await refreshEverything(
        item.id,
      )
    } catch (requestError) {
      console.error(
        requestError,
      )

      setError(
        requestError?.response?.data?.message ||
          'Không thể tiếp nhận yêu cầu.',
      )

      await loadRequests()
    } finally {
      setActionLoading(false)
    }
  }

  function openMoreInfoModal(item) {
    if (!item?.id) return

    setSelected(item)

    setMoreInfoMessage(
      DEFAULT_MORE_INFO_MESSAGE,
    )

    setMoreInfoOpen(true)
  }

  async function confirmRequestMoreInfo() {
    if (
      !selected?.id ||
      actionLoading ||
      !moreInfoMessage.trim()
    ) {
      return
    }

    setActionLoading(true)
    setError('')
    setNotice('')

    try {
      const response =
        await requestCustomerMoreInfo(
          selected.id,
          moreInfoMessage.trim(),
        )

      setNotice(
        response?.message ||
          'Đã gửi yêu cầu bổ sung thông tin cho khách hàng.',
      )

      setMoreInfoOpen(false)

      await refreshEverything(
        selected.id,
      )

      window.dispatchEvent(
        new Event(
          'support-notification-changed',
        ),
      )
    } catch (requestError) {
      console.error(
        requestError,
      )

      setError(
        requestError?.response?.data?.message ||
          'Không thể yêu cầu khách hàng bổ sung thông tin.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRelease() {
    if (
      !selected?.id ||
      actionLoading
    ) {
      return
    }

    setActionLoading(true)
    setError('')
    setNotice('')

    try {
      const response =
        await releaseSupportRequest(
          selected.id,
        )

      setNotice(
        response?.message ||
          'Đã trả yêu cầu về kho chưa hỗ trợ.',
      )

      await refreshEverything(
        selected.id,
      )
    } catch (requestError) {
      console.error(
        requestError,
      )

      setError(
        requestError?.response?.data?.message ||
          'Không thể trả yêu cầu về kho.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  function openTransferModal() {
    setTransferStaffId('')
    setTransferSearch('')
    setTransferReason('')
    setTransferOpen(true)
  }

  async function confirmTransfer() {
    if (
      !selected?.id ||
      !transferStaffId ||
      !transferReason.trim()
    ) {
      setError(
        'Vui lòng chọn nhân viên và nhập lý do chuyển.',
      )

      return
    }

    setActionLoading(true)
    setError('')
    setNotice('')

    try {
      const response =
        await transferSupportRequest(
          selected.id,
          {
            assigned_to:
              Number(
                transferStaffId,
              ),

            reason:
              transferReason.trim(),
          },
        )

      setTransferOpen(false)
      setTransferStaffId('')
      setTransferSearch('')
      setTransferReason('')

      setNotice(
        response?.message ||
          'Đã chuyển nhân viên hỗ trợ.',
      )

      await refreshEverything(
        selected.id,
      )
    } catch (requestError) {
      console.error(
        requestError,
      )

      setError(
        requestError?.response?.data?.message ||
          'Không thể chuyển nhân viên hỗ trợ.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSendReply(
    event,
  ) {
    event.preventDefault()

    if (
      !selected?.id ||
      sendingReply
    ) {
      return
    }

    if (
      !replyText.trim() &&
      replyFiles.length === 0
    ) {
      return
    }

    setSendingReply(true)
    setError('')
    setNotice('')

    try {
      await sendSupportRequestMessage(
        selected.id,
        {
          message:
            replyText.trim(),

          attachments:
            replyFiles,
        },
      )

      setReplyText('')
      setReplyFiles([])

      await loadConversation(
        selected.id,
      )
    } catch (requestError) {
      console.error(
        requestError,
      )

      setError(
        requestError?.response?.data?.message ||
          'Không thể gửi phản hồi.',
      )
    } finally {
      setSendingReply(false)
    }
  }

  async function handleSendToAdmin() {
    if (
      !selected?.id ||
      sendingAdminRequest ||
      !adminRequestContent.trim()
    ) {
      return
    }

    setSendingAdminRequest(true)
    setError('')
    setNotice('')

    try {
      const response =
        await sendSupportRequestToAdmin(
          selected.id,
          adminRequestContent.trim(),
        )

      setNotice(
        response?.message ||
          'Đã gửi yêu cầu xử lý đến Admin.',
      )

      setAdminRequestContent('')

      await refreshEverything(
        selected.id,
      )

      window.dispatchEvent(
        new Event(
          'admin-notification:changed',
        ),
      )
    } catch (requestError) {
      console.error(
        requestError,
      )

      setError(
        requestError?.response?.data?.message ||
          'Không thể gửi yêu cầu đến Admin.',
      )
    } finally {
      setSendingAdminRequest(false)
    }
  }

  function toggleStatusFilter(
    nextStatus,
  ) {
    /*
     * Luôn giữ một trạng thái đang chọn.
     * Khi vào trang mặc định là "Chưa hỗ trợ".
     */
    setStatus(nextStatus)
  }

  return (
    <section className="min-h-screen space-y-6 pb-10">
      <AdminPageHeader
        breadcrumb={[
          'ViVuGo',
          'Nhân viên hỗ trợ',
          'Yêu cầu hỗ trợ',
        ]}
        title="Yêu cầu hỗ trợ"
        description="Tiếp nhận, yêu cầu khách bổ sung thông tin và gửi yêu cầu cần Admin xử lý."
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [
            'pending',
            'Chưa hỗ trợ',
            counts.pending,
          ],
          [
            'needs_more_info',
            'Cần bổ sung',
            counts.needs_more_info,
          ],
          [
            'in_progress',
            'Đang hỗ trợ',
            counts.in_progress,
          ],
          [
            'resolved',
            'Đã hỗ trợ',
            counts.resolved,
          ],
        ].map(
          ([
            value,
            label,
            count,
          ]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                toggleStatusFilter(
                  value,
                )
              }
              className={`rounded-3xl border p-5 text-left shadow-sm transition ${
                status === value
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-blue-200'
              }`}
            >
              <p className="text-sm font-bold text-slate-500">
                {label}
              </p>

              <strong className="mt-2 block text-3xl font-black text-slate-900">
                {Number(
                  count || 0,
                )}
              </strong>
            </button>
          ),
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          className={`grid gap-3 ${
            showAssigneeFilter
              ? 'lg:grid-cols-[1.3fr_1fr_1fr_1fr]'
              : 'lg:grid-cols-[1.3fr_1fr_1fr]'
          }`}
        >
          <input
            value={search}
            onChange={(
              event,
            ) =>
              setSearch(
                event.target
                  .value,
              )
            }
            placeholder="Tìm tên, email, SĐT, mã ticket..."
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400"
          />

          <select
            value={category}
            onChange={(
              event,
            ) =>
              setCategory(
                event.target
                  .value,
              )
            }
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400"
          >
            <option value="">
              Tất cả danh mục
            </option>

            {Object.entries(
              CATEGORY_LABELS,
            ).map(
              ([
                key,
                label,
              ]) => (
                <option
                  key={key}
                  value={key}
                >
                  {label}
                </option>
              ),
            )}
          </select>

          {showAssigneeFilter ? (
            <select
              value={assignedTo}
              onChange={(
                event,
              ) =>
                setAssignedTo(
                  event.target
                    .value,
                )
              }
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400"
            >
              <option value="">
                Tất cả NVHT
              </option>

              {assignees.map(
                (staff) => (
                  <option
                    key={
                      staff.id
                    }
                    value={
                      staff.id
                    }
                  >
                    {
                      staff.full_name
                    }
                  </option>
                ),
              )}
            </select>
          ) : null}

          <select
            value={status}
            onChange={(
              event,
            ) =>
              setStatus(
                event.target
                  .value,
              )
            }
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400"
          >
            <option value="">
              Tất cả trạng thái
            </option>

            <option value="pending">
              Chưa hỗ trợ
            </option>

            <option value="needs_more_info">
              Cần bổ sung
            </option>

            <option value="in_progress">
              Đang hỗ trợ
            </option>

            <option value="resolved">
              Đã hỗ trợ
            </option>
          </select>
        </div>
      </div>

      {showOwnershipTabs ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setOwnershipScope('mine')}
              className={`rounded-xl px-5 py-2.5 text-sm font-black transition ${
                ownershipScope === 'mine'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              Của tôi
            </button>

            <button
              type="button"
              onClick={() => setOwnershipScope('all')}
              className={`rounded-xl px-5 py-2.5 text-sm font-black transition ${
                ownershipScope === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              Tất cả
            </button>
          </div>

          <p className="text-xs font-semibold text-slate-400 md:text-sm">
            {ownershipScope === 'mine'
              ? 'Chỉ hiển thị yêu cầu do bạn phụ trách.'
              : 'Hiển thị yêu cầu của tất cả nhân viên hỗ trợ.'}
          </p>
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              Đang tải...
            </div>
          ) : requests.length ===
            0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              Không có yêu cầu phù hợp.
            </div>
          ) : (
            requests.map(
              (item) => {
                const staff =
                  getAssignedStaff(
                    item,
                  )

                const displayStatus =
                  getSupportDisplayStatus(
                    item,
                  )

                return (
                  <article
                    key={
                      item.id
                    }
                    onClick={() =>
                      openDetail(
                        item,
                      )
                    }
                    className={`cursor-pointer rounded-3xl border bg-white p-5 shadow-sm transition hover:border-blue-300 ${
                      selected?.id ===
                      item.id
                        ? 'border-blue-400 ring-2 ring-blue-100'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900">
                            {
                              item.subject
                            }
                          </h3>

                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                            {
                              item.ticket_code
                            }
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {
                            item.full_name
                          }{' '}
                          ·{' '}
                          {
                            item.email
                          }

                          {item.phone
                            ? ` · ${item.phone}`
                            : ''}
                        </p>

                        {item.needs_more_info ? (
                          <p className="mt-2 text-xs font-bold text-red-600">
                            ⚠ Cần khách hàng bổ sung thông tin
                          </p>
                        ) : null}
                      </div>

                      <span
                        className={`h-fit shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${displayStatus.className}`}
                      >
                        {item.needs_more_info ? '⚠ ' : ''}
                        {displayStatus.label}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>
                          {CATEGORY_LABELS[
                            item
                              .category
                          ] ||
                            item.category}
                        </span>

                        <span>
                          {formatDateTime(
                            item.created_at,
                          )}
                        </span>
                      </div>

                      {item.status ===
                      'pending' ? (
                        item.needs_more_info ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                              Cần bổ sung
                            </span>

                            {staff ? (
                              <div className="flex items-center gap-2 rounded-full bg-blue-50 py-1 pl-1 pr-3">
                                <StaffAvatar
                                  staff={staff}
                                />

                                <div>
                                  <small className="block text-[10px] text-blue-400">
                                    NVHT đã tiếp nhận
                                  </small>

                                  <strong className="text-xs text-blue-800">
                                    {staff.full_name}
                                  </strong>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              actionLoading
                            }
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation()

                              void handleClaim(
                                item,
                              )
                            }}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                          >
                            Tiếp nhận
                          </button>
                        )
                      ) : item.status === 'in_progress' &&
                        item.is_mine ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {staff ? (
                            <div className="flex items-center gap-2 rounded-full bg-blue-50 py-1 pl-1 pr-3">
                              <StaffAvatar
                                staff={
                                  staff
                                }
                              />

                              <div>
                                <small className="block text-[10px] text-blue-400">
                                  Đang hỗ trợ
                                </small>

                                <strong className="text-xs text-blue-800">
                                  {
                                    staff.full_name
                                  }
                                </strong>
                              </div>
                            </div>
                          ) : null}

                          {item.admin_request_status !== 'pending' ? (
                            <button
                              type="button"
                              disabled={
                                actionLoading
                              }
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation()

                                openMoreInfoModal(
                                  item,
                                )
                              }}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 disabled:opacity-50"
                            >
                              Yêu cầu bổ sung
                            </button>
                          ) : null}
                        </div>
                      ) : staff ? (
                        <div className="flex items-center gap-2 rounded-full bg-blue-50 py-1 pl-1 pr-3">
                          <StaffAvatar
                            staff={
                              staff
                            }
                          />

                          <div>
                            <small className="block text-[10px] text-blue-400">
                              {item.status ===
                              'resolved'
                                ? 'Đã hỗ trợ bởi'
                                : 'Đang hỗ trợ'}
                            </small>

                            <strong className="text-xs text-blue-800">
                              {
                                staff.full_name
                              }
                            </strong>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              },
            )
          )}
        </div>

        <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24">
          {!selected ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Chọn một yêu cầu để xem chi tiết.
            </div>
          ) : detailLoading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Đang tải chi tiết...
            </div>
          ) : (
            <>
              <header className="border-b border-slate-200 bg-slate-50 p-5">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-black text-blue-600">
                      {
                        selected.ticket_code
                      }
                    </span>

                    <h2 className="mt-2 text-xl font-black text-slate-900">
                      {
                        selected.subject
                      }
                    </h2>
                  </div>

                  <span
                    className={`h-fit shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getSupportDisplayStatus(selected).className}`}
                  >
                    {selected.needs_more_info ? '⚠ ' : ''}
                    {getSupportDisplayStatus(selected).label}
                  </span>
                </div>
              </header>

              <div className="max-h-[calc(100vh-180px)] space-y-6 overflow-y-auto p-5">
                <section>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Khách hàng
                  </p>

                  <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm">
                    <strong className="text-slate-900">
                      {
                        selected.full_name
                      }
                    </strong>

                    <p className="mt-1 text-slate-500">
                      {
                        selected.email
                      }
                    </p>

                    <p className="text-slate-500">
                      {selected.phone ||
                        'Không có SĐT'}
                    </p>
                  </div>
                </section>

                <section>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Thông tin yêu cầu
                  </p>

                  <div className="mt-2 grid gap-2 rounded-2xl border border-slate-200 p-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">
                        Danh mục
                      </span>

                      <strong>
                        {CATEGORY_LABELS[
                          selected
                            .category
                        ] ||
                          selected.category}
                      </strong>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">
                        Khách gửi
                      </span>

                      <strong>
                        {formatDateTime(
                          selected.created_at,
                        )}
                      </strong>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">
                        Tiếp nhận
                      </span>

                      <strong>
                        {formatDateTime(
                          selected.started_at,
                        )}
                      </strong>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">
                        Thời gian xử lý
                      </span>

                      <strong>
                        {
                          processingDuration
                        }
                      </strong>
                    </div>
                  </div>
                </section>

                {selectedStaff ? (
                  <section>
                    <p className="text-xs font-black uppercase text-slate-400">
                      {selected.status ===
                      'resolved'
                        ? 'Nhân viên đã hỗ trợ'
                        : 'Nhân viên đang hỗ trợ'}
                    </p>

                    <div className="mt-2 flex items-center gap-3 rounded-2xl bg-blue-50 p-4">
                      <StaffAvatar
                        staff={
                          selectedStaff
                        }
                        size="h-11 w-11"
                      />

                      <div>
                        <strong className="text-sm text-blue-900">
                          {
                            selectedStaff.full_name
                          }
                        </strong>

                        <p className="text-xs text-blue-600">
                          {
                            selectedStaff.email
                          }
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}

                <section>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Nội dung yêu cầu
                  </p>

                  <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
                    {
                      selected.description
                    }
                  </div>
                </section>

                {normalizeArray(
                  selected.attachments,
                ).length >
                0 ? (
                  <section>
                    <p className="text-xs font-black uppercase text-slate-400">
                      Tệp khách đính kèm
                    </p>

                    <div className="mt-3 space-y-2">
                      {normalizeArray(
                        selected.attachments,
                      ).map(
                        (
                          file,
                        ) => (
                          <a
                            key={
                              file.id ||
                              file.original_name ||
                              file.filename
                            }
                            href={getAttachmentUrl(
                              file,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-600"
                          >
                            📎{' '}
                            {file.original_name ||
                              file.filename ||
                              'Tệp đính kèm'}
                          </a>
                        ),
                      )}
                    </div>
                  </section>
                ) : null}

                {selected.needs_more_info ? (
                  <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="font-black text-red-800">
                      ⚠ Cần khách hàng bổ sung thông tin
                    </p>

                    {selectedStaff ? (
                      <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/80 p-3">
                        <StaffAvatar
                          staff={selectedStaff}
                          size="h-10 w-10"
                        />

                        <div>
                          <small className="block text-[10px] font-bold uppercase text-slate-400">
                            NVHT đã tiếp nhận
                          </small>

                          <strong className="text-sm text-slate-800">
                            {selectedStaff.full_name}
                          </strong>
                        </div>
                      </div>
                    ) : null}

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-red-700">
                      {
                        selected.info_request_message
                      }
                    </p>
                  </section>
                ) : null}

                <section>
                  <p className="text-xs font-black uppercase text-slate-400">
                    Lịch sử trao đổi
                  </p>

                  <div className="mt-3 max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3">
                    {messages.length ===
                    0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">
                        Chưa có trao đổi nào.
                      </p>
                    ) : (
                      messages.map(
                        (
                          message,
                        ) => {
                          const isStaff =
                            [
                              'support_staff',
                              'support',
                              'staff',
                            ].includes(
                              message.sender_type,
                            )

                          return (
                            <div
                              key={
                                message.id
                              }
                              className={`flex ${
                                isStaff
                                  ? 'justify-end'
                                  : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                  isStaff
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-slate-200 bg-white text-slate-700'
                                }`}
                              >
                                <div className="mb-1 flex justify-between gap-4 text-[10px] opacity-80">
                                  <strong>
                                    {isStaff
                                      ? message.sender?.full_name ||
                                        'NVHT'
                                      : 'Khách hàng'}
                                  </strong>

                                  <span>
                                    {formatDateTime(
                                      message.created_at,
                                    )}
                                  </span>
                                </div>

                                {message.message ? (
                                  <p className="whitespace-pre-wrap text-sm">
                                    {
                                      message.message
                                    }
                                  </p>
                                ) : null}

                                {normalizeArray(
                                  message.attachments,
                                ).length >
                                0 ? (
                                  <div className="mt-2 space-y-1">
                                    {normalizeArray(
                                      message.attachments,
                                    ).map(
                                      (
                                        file,
                                      ) => (
                                        <a
                                          key={
                                            file.id ||
                                            file.original_name
                                          }
                                          href={getAttachmentUrl(
                                            file,
                                          )}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block text-xs underline"
                                        >
                                          📎{' '}
                                          {file.original_name ||
                                            file.filename ||
                                            'Tệp đính kèm'}
                                        </a>
                                      ),
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          )
                        },
                      )
                    )}

                    <div ref={chatBottomRef} />
                  </div>

                  {canReply ? (
                    <form
                      onSubmit={
                        handleSendReply
                      }
                      className="mt-3 space-y-2"
                    >
                      <textarea
                        value={replyText}
                        onChange={(
                          event,
                        ) =>
                          setReplyText(
                            event
                              .target
                              .value,
                          )
                        }
                        rows="3"
                        placeholder="Nhập nội dung phản hồi..."
                        className="w-full resize-none rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"
                      />

                      {replyFiles.length >
                      0 ? (
                        <div className="space-y-1 text-xs text-slate-500">
                          {replyFiles.map(
                            (
                              file,
                            ) => (
                              <p
                                key={`${file.name}-${file.size}`}
                              >
                                📎{' '}
                                {
                                  file.name
                                }
                              </p>
                            ),
                          )}
                        </div>
                      ) : null}

                      <div className="flex justify-between gap-3">
                        <label className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
                          📎 Đính kèm

                          <input
                            type="file"
                            multiple
                            hidden
                            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                            onChange={(
                              event,
                            ) =>
                              setReplyFiles(
                                Array.from(
                                  event
                                    .target
                                    .files ||
                                    [],
                                ),
                              )
                            }
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={
                            sendingReply ||
                            (
                              !replyText.trim() &&
                              replyFiles.length ===
                                0
                            )
                          }
                          className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-black text-white disabled:opacity-50"
                        >
                          {sendingReply
                            ? 'Đang gửi...'
                            : 'Gửi'}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryOpen(
                        (current) =>
                          !current,
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        Lịch sử xử lý
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {histories.length > 0
                          ? `${histories.length} hoạt động`
                          : 'Chưa có hoạt động'}
                      </p>
                    </div>

                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-black text-slate-500 transition-transform ${
                        historyOpen
                          ? 'rotate-180'
                          : ''
                      }`}
                    >
                      ↓
                    </span>
                  </button>

                  {historyOpen ? (
                    <div className="border-t border-slate-200 bg-slate-50/60 p-3">
                      <div
                        ref={
                          historyScrollRef
                        }
                        className="max-h-[280px] overflow-y-auto scroll-smooth rounded-xl bg-white p-4 pr-3"
                      >
                        {histories.length ===
                        0 ? (
                          <p className="py-6 text-center text-xs text-slate-400">
                            Chưa có lịch sử xử lý.
                          </p>
                        ) : (
                          <div className="space-y-4 border-l-2 border-slate-200 pl-4">
                            {histories.map(
                              (
                                history,
                              ) => (
                                <div
                                  key={
                                    history.id
                                  }
                                  className="relative"
                                >
                                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500" />

                                  <strong className="block text-xs leading-5 text-slate-700">
                                    {history.description ||
                                      history.action}
                                  </strong>

                                  <small className="mt-1 block text-[11px] text-slate-400">
                                    {formatDateTime(
                                      history.created_at,
                                    )}
                                  </small>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      {histories.length >
                      0 ? (
                        <p className="mt-2 text-center text-[10px] font-semibold text-slate-400">
                          Đang hiển thị hoạt động mới nhất ở cuối danh sách. Kéo lên để xem lịch sử cũ hơn.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                {selected.status ===
                  'in_progress' &&
                selected.is_mine ? (
                  <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-violet-500">
                      Yêu cầu Admin xử lý
                    </p>

                    <h3 className="mt-1 font-black text-violet-950">
                      Gửi vấn đề cần Admin can thiệp
                    </h3>

                    {adminPending ? (
                      <div className="mt-4 rounded-2xl border border-violet-200 bg-white p-4">
                        <p className="font-bold text-violet-800">
                          Đã gửi yêu cầu đến Admin
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {
                            selected.admin_request_content
                          }
                        </p>

                        <p className="mt-3 text-xs font-bold text-amber-600">
                          Đang chờ Admin xử lý...
                        </p>
                      </div>
                    ) : adminProcessed ? (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                        Admin đã xử lý yêu cầu này.
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={
                            adminRequestContent
                          }
                          onChange={(
                            event,
                          ) =>
                            setAdminRequestContent(
                              event
                                .target
                                .value,
                            )
                          }
                          rows="5"
                          placeholder="Mô tả vấn đề cần Admin xử lý..."
                          className="mt-4 w-full resize-none rounded-2xl border border-violet-200 bg-white p-4 text-sm outline-none focus:border-violet-500"
                        />

                        <button
                          type="button"
                          disabled={
                            sendingAdminRequest ||
                            !adminRequestContent.trim()
                          }
                          onClick={() =>
                            void handleSendToAdmin()
                          }
                          className="mt-3 w-full rounded-2xl bg-violet-600 px-5 py-3 font-black text-white disabled:opacity-50"
                        >
                          {sendingAdminRequest
                            ? 'Đang gửi...'
                            : 'Gửi yêu cầu xử lý đến Admin'}
                        </button>
                      </>
                    )}
                  </section>
                ) : null}

                <section className="space-y-3 border-t border-slate-200 pt-5">
                  {selected.status ===
                  'pending' ? (
                    selected.needs_more_info ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                        Cần khách hàng bổ sung thông tin. Sau khi khách gửi lại, ticket sẽ tự trở về Chưa hỗ trợ.
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          actionLoading
                        }
                        onClick={() =>
                          void handleClaim(
                            selected,
                          )
                        }
                        className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-50"
                      >
                        {actionLoading
                          ? 'Đang xử lý...'
                          : 'Tiếp nhận'}
                      </button>
                    )
                  ) : null}

                  {selected.status ===
                    'in_progress' &&
                  selected.is_mine ? (
                    adminPending ? (
                      <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-700">
                        Ticket đang chờ Admin xử lý. Không thể trả về kho hoặc chuyển NVHT.
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={
                            actionLoading
                          }
                          onClick={() =>
                            openMoreInfoModal(
                              selected,
                            )
                          }
                          className="w-full rounded-2xl border border-red-200 bg-red-50 py-3 text-sm font-black text-red-700 disabled:opacity-50"
                        >
                          Yêu cầu khách bổ sung thông tin
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionLoading
                          }
                          onClick={
                            openTransferModal
                          }
                          className="w-full rounded-2xl border border-blue-200 bg-blue-50 py-3 text-sm font-black text-blue-700 disabled:opacity-50"
                        >
                          Chuyển nhân viên hỗ trợ
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionLoading
                          }
                          onClick={() =>
                            void handleRelease()
                          }
                          className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 disabled:opacity-50"
                        >
                          Trả về kho chưa hỗ trợ
                        </button>
                      </>
                    )
                  ) : null}

                  {selected.status ===
                    'in_progress' &&
                  !selected.is_mine ? (
                    <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
                      Yêu cầu đang được{' '}
                      <strong>
                        {selectedStaff?.full_name ||
                          'NVHT khác'}
                      </strong>{' '}
                      xử lý.
                    </div>
                  ) : null}

                  {selected.status ===
                  'resolved' ? (
                    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
                      Yêu cầu đã được Admin xác nhận xử lý xong.
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          )}
        </aside>
      </div>

      {moreInfoOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-950">
              Yêu cầu bổ sung thông tin
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Ticket{' '}
              <strong>
                {
                  selected?.ticket_code
                }
              </strong>
            </p>

            <label className="mt-5 block text-sm font-bold text-slate-700">
              Nội dung gửi khách

              <textarea
                value={
                  moreInfoMessage
                }
                onChange={(
                  event,
                ) =>
                  setMoreInfoMessage(
                    event.target
                      .value,
                  )
                }
                rows="6"
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none focus:border-blue-500"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setMoreInfoOpen(
                    false,
                  )
                }
                className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={
                  actionLoading ||
                  !moreInfoMessage.trim()
                }
                onClick={() =>
                  void confirmRequestMoreInfo()
                }
                className="rounded-xl bg-blue-600 px-4 py-2 font-black text-white disabled:opacity-50"
              >
                {actionLoading
                  ? 'Đang gửi...'
                  : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {transferOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black text-slate-950">
              Chuyển nhân viên hỗ trợ
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ticket{' '}
              <strong>
                {
                  selected?.ticket_code
                }
              </strong>
            </p>

            <div className="mt-5">
              <label className="block text-sm font-bold text-slate-700">
                Chuyển cho *
              </label>

              <div className="relative mt-2">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-slate-400"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="8"
                  />
                  <path d="m21 21-4.35-4.35" />
                </svg>

                <input
                  type="text"
                  value={transferSearch}
                  onChange={(event) =>
                    setTransferSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Tìm theo tên hoặc mã NVHT..."
                  className="h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {selectedTransferStaff ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <StaffAvatar
                      staff={
                        selectedTransferStaff
                      }
                      size="h-11 w-11"
                    />

                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-blue-950">
                        {
                          selectedTransferStaff.full_name
                        }
                      </strong>

                      <p className="mt-0.5 text-xs font-bold text-blue-600">
                        Mã NVHT:{' '}
                        {getStaffCode(
                          selectedTransferStaff,
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setTransferStaffId('')
                    }
                    className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-600"
                  >
                    Bỏ chọn
                  </button>
                </div>
              ) : null}

              <div className="mt-3 h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
                {filteredTransferStaffOptions.length ===
                0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    Không tìm thấy nhân viên hỗ trợ phù hợp.
                  </div>
                ) : (
                  filteredTransferStaffOptions.map(
                    (staff) => {
                      const isSelected =
                        String(
                          transferStaffId,
                        ) ===
                        String(staff.id)

                      return (
                        <button
                          key={
                            staff.id
                          }
                          type="button"
                          onClick={() =>
                            setTransferStaffId(
                              String(
                                staff.id,
                              ),
                            )
                          }
                          className={`mb-1 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition last:mb-0 ${
                            isSelected
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <StaffAvatar
                            staff={
                              staff
                            }
                            size="h-11 w-11"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="truncate text-sm text-slate-900">
                                {
                                  staff.full_name
                                }
                              </strong>

                              {isSelected ? (
                                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">
                                  Đã chọn
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 text-xs font-bold text-blue-600">
                              Mã NVHT:{' '}
                              {getStaffCode(
                                staff,
                              )}
                            </p>

                          </div>
                        </button>
                      )
                    },
                  )
                )}
              </div>
            </div>

            <label className="mt-4 block text-sm font-bold text-slate-700">
              Lý do chuyển *

              <textarea
                value={
                  transferReason
                }
                onChange={(
                  event,
                ) =>
                  setTransferReason(
                    event.target
                      .value,
                  )
                }
                rows="4"
                className="mt-2 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-500"
                placeholder="Nhập lý do chuyển..."
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setTransferOpen(
                    false,
                  )
                }
                className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={
                  actionLoading ||
                  !transferStaffId ||
                  !transferReason.trim()
                }
                onClick={() =>
                  void confirmTransfer()
                }
                className="rounded-xl bg-blue-600 px-4 py-2 font-black text-white disabled:opacity-50"
              >
                {actionLoading
                  ? 'Đang chuyển...'
                  : 'Xác nhận chuyển'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}