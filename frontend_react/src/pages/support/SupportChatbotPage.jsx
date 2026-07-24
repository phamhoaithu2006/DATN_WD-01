import { useCallback, useEffect, useRef, useState } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import supportChatApi from '../../services/supportChatApi'

function formatTime(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

const POLL_INTERVAL = 4000
const QUICK_REPLY_STORAGE_KEY = 'vivugo_support_quick_replies'

const DEFAULT_QUICK_REPLIES = [
  { id: 'default-1', label: 'Chào hỏi', content: 'Chào bạn, mình là nhân viên hỗ trợ của ViVuGo. Mình có thể giúp gì cho bạn?' },
  { id: 'default-2', label: 'Xin đợi', content: 'Bạn vui lòng chờ mình một chút để kiểm tra thông tin nhé.' },
  { id: 'default-3', label: 'Xin thông tin đơn', content: 'Bạn cho mình xin mã đơn hàng hoặc số điện thoại đặt tour để mình tra cứu nhanh hơn nhé.' },
  { id: 'default-4', label: 'Xác nhận đã xử lý', content: 'Mình đã xử lý xong yêu cầu này rồi ạ. Bạn kiểm tra lại giúp mình nhé.' },
  { id: 'default-5', label: 'Hướng dẫn thanh toán', content: 'Bạn có thể thanh toán qua VNPay hoặc chuyển khoản trực tiếp. Mình gửi hướng dẫn chi tiết cho bạn nhé.' },
  { id: 'default-6', label: 'Xin lỗi vì chậm trễ', content: 'Mình xin lỗi vì đã để bạn chờ lâu. Mình sẽ hỗ trợ bạn ngay bây giờ.' },
  { id: 'default-7', label: 'Cảm ơn & kết thúc', content: 'Cảm ơn bạn đã liên hệ ViVuGo. Nếu cần hỗ trợ thêm, bạn cứ nhắn cho mình nhé!' },
]

function loadQuickReplies() {
  try {
    const raw = localStorage.getItem(QUICK_REPLY_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUICK_REPLIES
  } catch {
    return DEFAULT_QUICK_REPLIES
  }
}

function saveQuickReplies(list) {
  localStorage.setItem(QUICK_REPLY_STORAGE_KEY, JSON.stringify(list))
}

function SupportChatbotPage() {
  const [tab, setTab] = useState('pending')
  const [pendingList, setPendingList] = useState([])
  const [mineList, setMineList] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState('')
  const [acceptingId, setAcceptingId] = useState(null)

  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState('')

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  const [quickReplies, setQuickReplies] = useState(loadQuickReplies)
  const [quickPanelOpen, setQuickPanelOpen] = useState(false)
  const [editingReply, setEditingReply] = useState(null) // {id, label, content} hoặc null khi thêm mới
  const [draftLabel, setDraftLabel] = useState('')
  const [draftContent, setDraftContent] = useState('')

  const messagesEndRef = useRef(null)
  const pollRef = useRef(null)
  const replyInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const loadLists = useCallback(async () => {
    try {
      const [pending, mine] = await Promise.all([
        supportChatApi.pendingList(),
        supportChatApi.myActiveList(),
      ])
      setPendingList(pending)
      setMineList(mine)
      setListError('')
    } catch (error) {
      setListError(error?.response?.data?.message || 'Không tải được danh sách chat.')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void loadLists()
    const intervalId = window.setInterval(() => void loadLists(), 8000)
    return () => window.clearInterval(intervalId)
  }, [loadLists])

  const loadConversation = useCallback(async (conversationId) => {
    try {
      const response = await supportChatApi.show(conversationId)
      setMessages(response?.messages || [])
    } catch (error) {
      setChatError(error?.response?.data?.message || 'Không tải được nội dung hội thoại.')
    }
  }, [])

  useEffect(() => {
    if (!activeConversation) {
      if (pollRef.current) window.clearInterval(pollRef.current)
      return undefined
    }
    void loadConversation(activeConversation.id)
    pollRef.current = window.setInterval(() => void loadConversation(activeConversation.id), POLL_INTERVAL)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [activeConversation, loadConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Ctrl+1..Ctrl+9 điền nhanh theo đúng thứ tự đang hiển thị trong danh sách hiện tại (kể cả mẫu tự thêm)
  useEffect(() => {
    function handleKeyDown(event) {
      if (!event.ctrlKey || !activeConversation) return
      const index = Number(event.key) - 1
      if (index >= 0 && index < quickReplies.length) {
        event.preventDefault()
        setReplyText(quickReplies[index].content)
        replyInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeConversation, quickReplies])

  function insertQuickReply(template) {
    setReplyText(template.content)
    setQuickPanelOpen(false)
    replyInputRef.current?.focus()
  }

  function openAddReplyForm() {
    setEditingReply(null)
    setDraftLabel('')
    setDraftContent('')
  }

  function openEditReplyForm(template) {
    setEditingReply(template)
    setDraftLabel(template.label)
    setDraftContent(template.content)
  }

  function saveReplyDraft() {
    const label = draftLabel.trim()
    const content = draftContent.trim()
    if (!label || !content) return

    let next
    if (editingReply) {
      next = quickReplies.map((item) =>
        item.id === editingReply.id ? { ...item, label, content } : item,
      )
    } else {
      next = [...quickReplies, { id: `custom-${Date.now()}`, label, content }]
    }

    setQuickReplies(next)
    saveQuickReplies(next)
    setEditingReply(null)
    setDraftLabel('')
    setDraftContent('')
  }

  function deleteReply(id) {
    if (!window.confirm('Xóa mẫu tin nhắn này?')) return
    const next = quickReplies.filter((item) => item.id !== id)
    setQuickReplies(next)
    saveQuickReplies(next)
  }

  async function handleAccept(conversation) {
    if (acceptingId) return
    setAcceptingId(conversation.id)
    setListError('')
    try {
      await supportChatApi.accept(conversation.id)
      await loadLists()
      setTab('mine')
      setActiveConversation(conversation)
      setChatLoading(true)
      await loadConversation(conversation.id)
      setChatLoading(false)
    } catch (error) {
      setListError(error?.response?.data?.message || 'Không tiếp nhận được.')
      await loadLists()
    } finally {
      setAcceptingId(null)
    }
  }

  function openConversation(conversation) {
    setActiveConversation(conversation)
    setChatError('')
    setChatLoading(true)
    loadConversation(conversation.id).finally(() => setChatLoading(false))
  }

  function handleImageSelect(event) {
    const file = event.target.files?.[0] || null
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setChatError('Chỉ được chọn file ảnh.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setChatError('Ảnh không được vượt quá 5MB.')
      return
    }

    setChatError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearSelectedImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSendReply(event) {
    event.preventDefault()
    const content = replyText.trim()
    if ((!content && !imageFile) || !activeConversation || sending) return

    setSending(true)
    setChatError('')
    try {
      await supportChatApi.reply(activeConversation.id, { content, imageFile })
      setReplyText('')
      clearSelectedImage()
      await loadConversation(activeConversation.id)
    } catch (error) {
      setChatError(error?.response?.data?.message || 'Không gửi được tin nhắn.')
    } finally {
      setSending(false)
    }
  }

  function handleReplyKeyDown(event) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  async function handleClose() {
    if (!activeConversation) return
    if (!window.confirm('Đóng phiên hỗ trợ này và trả lại cho AI xử lý?')) return
    try {
      await supportChatApi.close(activeConversation.id)
      setActiveConversation(null)
      setMessages([])
      await loadLists()
    } catch (error) {
      setChatError(error?.response?.data?.message || 'Không đóng được phiên hỗ trợ.')
    }
  }

  const displayList = tab === 'pending' ? pendingList : mineList

  return (
    <section className="support-chat-page space-y-5">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Nhân viên hỗ trợ', 'Chatbot AI']}
        title="Chat trực tiếp với khách hàng"
        description="Tiếp nhận và trả lời các yêu cầu khách hàng chuyển giao từ AI."
      />

      <div className="support-chat-layout grid min-w-0 gap-4 lg:h-[calc(100svh-210px)] lg:min-h-[620px] lg:max-h-[860px] lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="support-chat-list-pane flex h-[420px] min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] sm:h-[460px] lg:h-auto">
          <div className="border-b border-slate-100 bg-white/90 px-4 pb-3 pt-4 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Hộp thư hỗ trợ
                </h2>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Cập nhật tự động theo thời gian thực
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Trực tuyến
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTab('pending')}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                  tab === 'pending'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
                }`}
              >
                <span className="truncate">Đang chờ</span>
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${
                    tab === 'pending'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {pendingList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTab('mine')}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                  tab === 'mine'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
                }`}
              >
                <span className="truncate">Đang xử lý</span>
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${
                    tab === 'mine'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {mineList.length}
                </span>
              </button>
            </div>
          </div>

          {listError ? (
            <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-rose-700">
              <svg
                viewBox="0 0 24 24"
                className="mt-0.5 h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              <p className="text-xs font-semibold leading-5">{listError}</p>
            </div>
          ) : null}

          <div className="support-chat-list min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 lg:pr-2">
            {loadingList ? (
              <div className="space-y-2" aria-label="Đang tải danh sách hội thoại">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-2xl border border-slate-100 p-3.5"
                  >
                    <div className="flex gap-3">
                      <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-200" />
                      <div className="min-w-0 flex-1 space-y-2.5">
                        <div className="flex justify-between gap-4">
                          <div className="h-3.5 w-28 rounded-full bg-slate-200" />
                          <div className="h-3 w-12 rounded-full bg-slate-100" />
                        </div>
                        <div className="h-3 w-full rounded-full bg-slate-100" />
                        <div className="h-3 w-2/3 rounded-full bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : displayList.length === 0 ? (
              <div className="flex h-full min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                    <path d="M8 9h8M8 13h5" />
                  </svg>
                </div>
                <h3 className="mt-4 text-sm font-extrabold text-slate-800">
                  {tab === 'pending'
                    ? 'Đã xử lý hết yêu cầu'
                    : 'Chưa có hội thoại đang xử lý'}
                </h3>
                <p className="mt-1.5 max-w-56 text-xs font-medium leading-5 text-slate-500">
                  {tab === 'pending'
                    ? 'Các yêu cầu mới từ chatbot sẽ xuất hiện tại đây.'
                    : 'Tiếp nhận một yêu cầu đang chờ để bắt đầu hỗ trợ.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayList.map((conversation) => {
                  const isActive =
                    activeConversation?.id === conversation.id

                  return (
                    <article
                      key={conversation.id}
                      className={`group relative overflow-hidden rounded-2xl border p-3.5 transition-all duration-200 ${
                        isActive
                          ? 'border-blue-200 bg-blue-50/70 shadow-sm ring-1 ring-blue-100'
                          : 'border-transparent bg-white hover:-translate-y-0.5 hover:border-slate-200 hover:bg-slate-50/80 hover:shadow-sm'
                      }`}
                    >
                      {isActive ? (
                        <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-blue-500" />
                      ) : null}

                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-black shadow-sm ring-1 ${
                              isActive
                                ? 'bg-blue-600 text-white ring-blue-600'
                                : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 ring-blue-100'
                            }`}
                          >
                            KH
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-emerald-500" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <strong
                              className="truncate text-sm font-extrabold text-slate-900"
                              title={conversation.session_id}
                            >
                              {conversation.session_id}
                            </strong>
                            <time className="shrink-0 text-[10px] font-semibold text-slate-400">
                              {formatTime(conversation.handoff_requested_at)}
                            </time>
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
                            {conversation.last_message || 'Chưa có tin nhắn'}
                          </p>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            {tab === 'pending' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-extrabold text-amber-700 ring-1 ring-inset ring-amber-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Mới
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Đang hỗ trợ
                              </span>
                            )}

                            {tab === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => handleAccept(conversation)}
                                disabled={acceptingId === conversation.id}
                                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-blue-300"
                              >
                                {acceptingId === conversation.id ? (
                                  <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    Đang nhận
                                  </>
                                ) : (
                                  <>
                                    Tiếp nhận
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="m9 18 6-6-6-6" />
                                    </svg>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openConversation(conversation)}
                                className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-bold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                                  isActive
                                    ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                                    : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-200 hover:text-blue-700'
                                }`}
                              >
                                {isActive ? 'Đang mở' : 'Mở chat'}
                                <svg
                                  viewBox="0 0 24 24"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="m9 18 6-6-6-6" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        <div className="support-chat-panel flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.4)] lg:min-h-0">
          {!activeConversation ? (
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50/70 to-white px-6 py-16 text-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(203,213,225,0.45)_1px,transparent_0)] bg-[length:24px_24px] opacity-50" />
              <div className="relative max-w-sm">
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-100 bg-white text-blue-600 shadow-[0_18px_45px_-22px_rgba(37,99,235,0.55)]">
                  <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md ring-4 ring-white">
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-9 w-9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                    <path d="M8 9h8M8 13h5" />
                  </svg>
                </div>
                <h2 className="mt-6 text-lg font-black tracking-tight text-slate-900">
                  Chọn một cuộc trò chuyện
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  Mở hội thoại ở danh sách bên trái để xem lịch sử và bắt đầu
                  hỗ trợ khách hàng.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm backdrop-blur">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Hội thoại được đồng bộ tự động
                </div>
              </div>
            </div>
          ) : (
            <>
              <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-black text-white shadow-sm">
                      KH
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong
                        className="truncate text-sm font-extrabold text-slate-900 sm:text-[15px]"
                        title={activeConversation.session_id}
                      >
                        {activeConversation.session_id}
                      </strong>
                      <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 sm:inline-flex">
                        Đang hoạt động
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Khách hàng đang kết nối
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100 sm:px-4"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 5l14 14M19 5 5 19" />
                  </svg>
                  <span className="hidden sm:inline">Đóng phiên</span>
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/60 px-3 py-5 sm:px-5 sm:py-6">
                {chatLoading ? (
                  <div
                    className="space-y-5"
                    aria-label="Đang tải nội dung hội thoại"
                  >
                    <div className="flex animate-pulse items-end gap-2.5">
                      <div className="h-8 w-8 shrink-0 rounded-xl bg-slate-200" />
                      <div className="space-y-2">
                        <div className="h-16 w-64 max-w-[70vw] rounded-2xl rounded-bl-md bg-slate-200" />
                        <div className="h-2.5 w-20 rounded-full bg-slate-200" />
                      </div>
                    </div>
                    <div className="flex animate-pulse flex-row-reverse items-end gap-2.5">
                      <div className="h-8 w-8 shrink-0 rounded-xl bg-blue-200" />
                      <div className="flex flex-col items-end space-y-2">
                        <div className="h-12 w-52 max-w-[65vw] rounded-2xl rounded-br-md bg-blue-200" />
                        <div className="h-2.5 w-16 rounded-full bg-slate-200" />
                      </div>
                    </div>
                    <div className="flex animate-pulse items-end gap-2.5">
                      <div className="h-8 w-8 shrink-0 rounded-xl bg-blue-100" />
                      <div className="space-y-2">
                        <div className="h-20 w-72 max-w-[72vw] rounded-2xl rounded-bl-md bg-blue-100" />
                        <div className="h-2.5 w-24 rounded-full bg-slate-200" />
                      </div>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full min-h-64 items-center justify-center text-center">
                    <div>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="M4 4h16v12H7l-3 3V4Z" />
                        </svg>
                      </div>
                      <p className="mt-3 text-sm font-bold text-slate-700">
                        Chưa có tin nhắn
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {messages.map((message) => {
                      const isStaff = message.role === 'staff'
                      const isUser = message.role === 'user'
                      const senderLabel = isStaff
                        ? 'Bạn'
                        : isUser
                          ? 'Khách hàng'
                          : 'Trợ lý AI'

                      return (
                        <div
                          key={message.id}
                          className={`flex items-end gap-2.5 ${
                            isStaff ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[9px] font-black shadow-sm ring-1 ${
                              isStaff
                                ? 'bg-blue-600 text-white ring-blue-600'
                                : isUser
                                  ? 'bg-white text-slate-600 ring-slate-200'
                                  : 'bg-indigo-50 text-indigo-600 ring-indigo-100'
                            }`}
                          >
                            {isStaff ? 'BẠN' : isUser ? 'KH' : 'AI'}
                          </div>

                          <div
                            className={`flex max-w-[82%] flex-col sm:max-w-[72%] ${
                              isStaff ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div
                              className={`whitespace-pre-wrap break-words px-4 py-3 text-sm font-medium leading-6 shadow-sm ${
                                isStaff
                                  ? 'rounded-2xl rounded-br-md bg-blue-600 text-white shadow-blue-600/10'
                                  : isUser
                                    ? 'rounded-2xl rounded-bl-md border border-slate-200 bg-white text-slate-700'
                                    : 'rounded-2xl rounded-bl-md border border-indigo-100 bg-indigo-50/90 text-slate-700'
                              }`}
                            >
                              {message.content}
                            </div>
                            <div
                              className={`mt-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold text-slate-400 ${
                                isStaff ? 'flex-row-reverse' : ''
                              }`}
                            >
                              <span>{senderLabel}</span>
                              <span aria-hidden="true">·</span>
                              <time>{formatTime(message.created_at)}</time>
                              {isStaff ? (
                                <svg
                                  viewBox="0 0 24 24"
                                  className="h-3 w-3 text-blue-500"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-label="Đã gửi"
                                >
                                  <path d="m4 12 4 4L18 6" />
                                  <path d="m10 15 2 2 8-9" />
                                </svg>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {sending ? (
                  <div
                    className="mt-5 flex flex-row-reverse items-end gap-2.5"
                    aria-live="polite"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-[9px] font-black text-white shadow-sm">
                      BẠN
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 rounded-2xl rounded-br-md bg-blue-100 px-4 py-3">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
                      </div>
                      <span className="mt-1.5 px-1 text-[10px] font-semibold text-slate-400">
                        Đang gửi phản hồi...
                      </span>
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>

              {chatError ? (
                <div
                  className="mx-4 mb-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-rose-700 sm:mx-5"
                  role="alert"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16h.01" />
                  </svg>
                  <p className="text-xs font-semibold leading-5">{chatError}</p>
                </div>
              ) : null}

              <form
                onSubmit={handleSendReply}
                className="border-t border-slate-200/80 bg-white p-3 sm:p-4"
              >
                <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2 shadow-inner transition-colors duration-200 focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100/70">
                  <textarea
                    rows="1"
                    maxLength={1000}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    onKeyDown={handleReplyKeyDown}
                    placeholder="Nhập câu trả lời cho khách..."
                    className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium leading-6 text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={sending}
                    aria-label="Nội dung trả lời"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    aria-label={sending ? 'Đang gửi tin nhắn' : 'Gửi tin nhắn'}
                    title="Gửi tin nhắn"
                  >
                    {sending ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4.5 w-4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 px-1">
                  <p className="text-[10px] font-medium text-slate-400">
                    <kbd className="font-sans font-bold text-slate-500">Enter</kbd>{' '}
                    để gửi ·{' '}
                    <kbd className="font-sans font-bold text-slate-500">
                      Shift + Enter
                    </kbd>{' '}
                    để xuống dòng
                  </p>
                  <span
                    className={`text-[10px] font-semibold ${
                      replyText.length > 900 ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  >
                    {replyText.length}/1000
                  </span>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default SupportChatbotPage
