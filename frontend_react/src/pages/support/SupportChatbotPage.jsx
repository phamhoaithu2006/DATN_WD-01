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

  const messagesEndRef = useRef(null)
  const pollRef = useRef(null)

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
      setListError(
        error?.response?.data?.message || 'Không tải được danh sách chat.',
      )
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void loadLists()
    const intervalId = window.setInterval(() => {
      void loadLists()
    }, 8000)
    return () => window.clearInterval(intervalId)
  }, [loadLists])

  const loadConversation = useCallback(async (conversationId) => {
    try {
      const response = await supportChatApi.show(conversationId)
      setMessages(response?.messages || [])
    } catch (error) {
      setChatError(
        error?.response?.data?.message ||
          'Không tải được nội dung hội thoại.',
      )
    }
  }, [])

  useEffect(() => {
    if (!activeConversation) {
      if (pollRef.current) window.clearInterval(pollRef.current)
      return undefined
    }

    void loadConversation(activeConversation.id)

    pollRef.current = window.setInterval(() => {
      void loadConversation(activeConversation.id)
    }, POLL_INTERVAL)

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [activeConversation, loadConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleAccept(conversation) {
    if (acceptingId) return // đang có 1 request tiếp nhận khác chạy, chặn bấm thêm

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
      setListError(
        error?.response?.data?.message ||
          'Không tiếp nhận được (có thể nhân viên khác đã nhận trước).',
      )
      await loadLists() // đồng bộ lại danh sách với server ngay khi lỗi
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

  async function handleSendReply(event) {
    event.preventDefault()
    const content = replyText.trim()
    if (!content || !activeConversation || sending) return

    setSending(true)
    setChatError('')
    try {
      await supportChatApi.reply(activeConversation.id, content)
      setReplyText('')
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
      setChatError(
        error?.response?.data?.message || 'Không đóng được phiên hỗ trợ.',
      )
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

      <div
        className="support-chat-layout"
        style={{ display: 'flex', gap: 16, marginTop: 16 }}
      >
        <div className="support-chat-list-pane" style={{ width: 320, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setTab('pending')}
              className={tab === 'pending' ? 'is-active' : ''}
            >
              Đang chờ ({pendingList.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('mine')}
              className={tab === 'mine' ? 'is-active' : ''}
            >
              Đang xử lý ({mineList.length})
            </button>
          </div>

          {listError ? (
            <div className="support-toast error">
              <p>{listError}</p>
            </div>
          ) : null}

          {loadingList ? (
            <p>Đang tải danh sách...</p>
          ) : displayList.length === 0 ? (
            <p>
              {tab === 'pending'
                ? 'Không có yêu cầu nào đang chờ.'
                : 'Bạn chưa xử lý cuộc trò chuyện nào.'}
            </p>
          ) : (
            <div className="support-chat-list">
              {displayList.map((conversation) => (
                <div
                  key={conversation.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    background:
                      activeConversation?.id === conversation.id
                        ? '#eff6ff'
                        : '#fff',
                  }}
                >
                  <strong>{conversation.session_id}</strong>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0' }}>
                    {conversation.last_message || 'Chưa có tin nhắn'}
                  </p>
                  <small>{formatTime(conversation.handoff_requested_at)}</small>
                  <br />

                  {tab === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => handleAccept(conversation)}
                      disabled={acceptingId === conversation.id}
                      style={{ marginTop: 8 }}
                    >
                      {acceptingId === conversation.id
                        ? 'Đang tiếp nhận...'
                        : 'Tiếp nhận'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openConversation(conversation)}
                      style={{ marginTop: 8 }}
                    >
                      Mở hội thoại
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="support-chat-panel"
          style={{
            flex: 1,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 480,
          }}
        >
          {!activeConversation ? (
            <div style={{ margin: 'auto', color: '#94a3b8' }}>
              Chọn một cuộc trò chuyện để bắt đầu hỗ trợ.
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: 12,
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <strong>{activeConversation.session_id}</strong>
                <button type="button" onClick={handleClose}>
                  Đóng phiên
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {chatLoading ? (
                  <p>Đang tải hội thoại...</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        marginBottom: 10,
                        textAlign: message.role === 'staff' ? 'right' : 'left',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '8px 12px',
                          borderRadius: 10,
                          maxWidth: '75%',
                          background:
                            message.role === 'user'
                              ? '#f1f5f9'
                              : message.role === 'staff'
                                ? '#2563eb'
                                : '#e0f2fe',
                          color: message.role === 'staff' ? '#fff' : '#0f172a',
                        }}
                      >
                        {message.content}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {message.role === 'user'
                          ? 'Khách'
                          : message.role === 'staff'
                            ? 'Bạn'
                            : 'AI'}{' '}
                        · {formatTime(message.created_at)}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {chatError ? (
                <div className="support-toast error">
                  <p>{chatError}</p>
                </div>
              ) : null}

              <form
                onSubmit={handleSendReply}
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: 12,
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <input
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Nhập câu trả lời cho khách..."
                  style={{ flex: 1 }}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !replyText.trim()}>
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