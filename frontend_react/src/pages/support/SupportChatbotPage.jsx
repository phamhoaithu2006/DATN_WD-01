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
    <section className="support-chat-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Nhân viên hỗ trợ', 'Chatbot AI']}
        title="Chat trực tiếp với khách hàng"
        description="Tiếp nhận và trả lời các yêu cầu khách hàng chuyển giao từ AI."
      />

      <div className="support-chat-layout">
        <div className="support-chat-list-pane">
          <div className="support-chat-tabs">
            <button type="button" onClick={() => setTab('pending')} className={tab === 'pending' ? 'is-active' : ''}>
              Đang chờ ({pendingList.length})
            </button>
            <button type="button" onClick={() => setTab('mine')} className={tab === 'mine' ? 'is-active' : ''}>
              Đang xử lý ({mineList.length})
            </button>
          </div>

          {listError ? <div className="support-toast error"><p>{listError}</p></div> : null}

          {loadingList ? (
            <p>Đang tải danh sách...</p>
          ) : displayList.length === 0 ? (
            <p>{tab === 'pending' ? 'Không có yêu cầu nào đang chờ.' : 'Bạn chưa xử lý cuộc trò chuyện nào.'}</p>
          ) : (
            <div className="support-chat-list">
              {displayList.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`support-chat-list-item ${activeConversation?.id === conversation.id ? 'is-active' : ''}`}
                >
                  <strong>{conversation.session_id}</strong>
                  <p>{conversation.last_message || 'Chưa có tin nhắn'}</p>
                  <small>{formatTime(conversation.handoff_requested_at)}</small>
                  <br />
                  {tab === 'pending' ? (
                    <button type="button" onClick={() => handleAccept(conversation)} disabled={acceptingId === conversation.id}>
                      {acceptingId === conversation.id ? 'Đang tiếp nhận...' : 'Tiếp nhận'}
                    </button>
                  ) : (
                    <button type="button" onClick={() => openConversation(conversation)}>Mở hội thoại</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="support-chat-panel">
          {!activeConversation ? (
            <div className="support-chat-empty-state">Chọn một cuộc trò chuyện để bắt đầu hỗ trợ.</div>
          ) : (
            <>
              <div className="support-chat-panel-header">
                <strong>{activeConversation.session_id}</strong>
                <button type="button" onClick={handleClose}>Đóng phiên</button>
              </div>

              <div className="support-chat-messages">
                {chatLoading ? (
                  <p>Đang tải hội thoại...</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`support-chat-msg-row role-${message.role}`}>
                      <div className="support-chat-bubble">
                        {message.attachment_url ? (
                          <img
                            src={message.attachment_url}
                            alt="Ảnh đính kèm"
                            className="support-chat-image"
                          />
                        ) : null}
                        {message.content ? <span>{message.content}</span> : null}
                      </div>
                      <div className="support-chat-msg-meta">
                        {message.role === 'user' ? 'Khách' : message.role === 'staff' ? 'Bạn' : 'AI'} · {formatTime(message.created_at)}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {chatError ? <div className="support-toast error"><p>{chatError}</p></div> : null}

              {/* Nút bật/tắt bảng tin nhắn mẫu */}
              <div className="support-quick-reply-bar">
                <button
                  type="button"
                  className="support-quick-reply-toggle"
                  onClick={() => setQuickPanelOpen((current) => !current)}
                >
                  ⚡ Tin nhắn mẫu {quickPanelOpen ? '▲' : '▼'}
                </button>

                {quickPanelOpen ? (
                  <div className="support-quick-reply-panel">
                    {quickReplies.map((template, index) => (
                      <div key={template.id} className="support-quick-reply-row">
                        <button
                          type="button"
                          className="support-quick-reply-item"
                          onClick={() => insertQuickReply(template)}
                        >
                          <span className="support-quick-reply-shortcut">
                            {index < 9 ? `Ctrl+${index + 1}` : ''}
                          </span>
                          <span className="support-quick-reply-label">{template.label}</span>
                          <span className="support-quick-reply-preview">{template.content}</span>
                        </button>
                        <div className="support-quick-reply-actions">
                          <button type="button" onClick={() => openEditReplyForm(template)}>Sửa</button>
                          <button type="button" onClick={() => deleteReply(template.id)}>Xóa</button>
                        </div>
                      </div>
                    ))}

                    <div className="support-quick-reply-form">
                      <input
                        placeholder="Tên gợi nhớ (VD: Chào hỏi)"
                        value={draftLabel}
                        onChange={(event) => setDraftLabel(event.target.value)}
                      />
                      <textarea
                        placeholder="Nội dung tin nhắn mẫu..."
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        rows={2}
                      />
                      <div className="support-quick-reply-form-actions">
                        {editingReply ? (
                          <button type="button" onClick={openAddReplyForm}>Hủy sửa</button>
                        ) : null}
                        <button type="button" onClick={saveReplyDraft} disabled={!draftLabel.trim() || !draftContent.trim()}>
                          {editingReply ? 'Lưu thay đổi' : '+ Thêm mẫu mới'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {imagePreview ? (
                <div className="support-chat-image-preview">
                  <img src={imagePreview} alt="Xem trước" />
                  <button type="button" onClick={clearSelectedImage}>Bỏ ảnh</button>
                </div>
              ) : null}

              <form className="support-chat-reply-form" onSubmit={handleSendReply}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="support-chat-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Gửi ảnh"
                >
                  📎
                </button>
                <input
                  ref={replyInputRef}
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Nhập câu trả lời cho khách..."
                  disabled={sending}
                />
                <button type="submit" disabled={sending || (!replyText.trim() && !imageFile)}>
                  {sending ? 'Đang gửi...' : 'Gửi'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default SupportChatbotPage