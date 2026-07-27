import { useEffect, useRef, useState } from "react";
import { askTravelAssistant, closeChatSession, fetchChatMessages } from "../../services/customerApi";
import Icon from "./Icon";

const CHAT_HISTORY_KEY = "vivugo_chat_history";
const POLL_INTERVAL = 5000;

const defaultGreeting = {
  from: "ai",
  text: "Xin chào! Mình là trợ lý du lịch ViVuGo. Bạn muốn đi đâu, ngân sách bao nhiêu và dự định đi mấy ngày?",
};

// Kho câu hỏi gợi ý - giống dạng Shopee, hiện random 3 câu, có nút "Đổi câu hỏi"
const SUGGESTED_QUESTION_POOL = [
  "Tour nào đang giảm giá nhiều nhất?",
  "Có tour nào phù hợp gia đình có trẻ nhỏ không?",
  "Làm sao để hủy đơn đặt tour đã thanh toán?",
  "Chính sách hoàn tiền khi hủy tour như thế nào?",
  "Tour dưới 5 triệu hiện có những gì?",
  "Thanh toán tour bằng cách nào?",
  "Tour đi biển 3 ngày 2 đêm giá bao nhiêu?",
  "Tôi cần mang theo giấy tờ gì khi đi tour?",
  "Có thể đổi ngày khởi hành sau khi đặt không?",
  "Tour nào đang có nhiều chỗ trống nhất?",
];

function pickRandomQuestions(count = 3) {
  const shuffled = [...SUGGESTED_QUESTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getOrCreateSessionId() {
  let sessionId = localStorage.getItem("vivugo_chat_session_id");
  if (!sessionId) {
    sessionId = "session-" + crypto.randomUUID();
    localStorage.setItem("vivugo_chat_session_id", sessionId);
  }
  return sessionId;
}

function loadStoredMessages() {
  try {
    const raw = sessionStorage.getItem(CHAT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [defaultGreeting];
  } catch {
    return [defaultGreeting];
  }
}

// Gọi hàm này ở nơi xử lý đăng nhập/đăng xuất thành công để bắt đầu 1 phiên chat hoàn toàn mới
export function resetChatSession() {
  localStorage.removeItem("vivugo_chat_session_id");
  sessionStorage.removeItem(CHAT_HISTORY_KEY);
  window.dispatchEvent(new Event("vivugo-chat-reset"));
}

function normalizeReplyText(raw) {
  if (!raw) return "";
  return raw.replace(/\s\*\s(?=\*\*)/g, "\n").trim();
}

function renderMessageText(rawText) {
  const text = normalizeReplyText(rawText);
  const lines = text.split("\n").filter((line) => line.trim() !== "");

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

    return (
      <p key={lineIndex} className="vg-message-line">
        {parts.map((part, partIndex) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={partIndex}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={partIndex}>{part}</span>
          ),
        )}
      </p>
    );
  });
}

function mapServerMessage(message) {
  return {
    id: message.id,
    from: message.role === "user" ? "user" : "ai",
    text: message.content,
    isStaff: message.role === "staff",
    attachmentUrl: message.attachment_url || null,
  };
}

function DefaultStaffAvatar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <circle cx="12" cy="8" r="4" fill="#fff" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="#fff" />
    </svg>
  );
}

function MessageAvatar({ isStaff, staffAvatarUrl }) {
  if (isStaff) {
    return (
      <span className="vg-msg-avatar staff-avatar">
        {staffAvatarUrl ? (
          <img src={staffAvatarUrl} alt="Nhân viên hỗ trợ" />
        ) : (
          <DefaultStaffAvatar />
        )}
      </span>
    );
  }

  return (
    <span className="vg-msg-avatar ai-avatar">
      <Icon name="sparkle" size={14} />
    </span>
  );
}

function ChatBox() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(loadStoredMessages);
  const [mode, setMode] = useState("ai");
  const [queuePosition, setQueuePosition] = useState(null);
  const [staffInfo, setStaffInfo] = useState({ name: "", avatar: "" });
  const [suggestedQuestions, setSuggestedQuestions] = useState(() => pickRandomQuestions());
  const [ending, setEnding] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  const lastMessageIdRef = useRef(0);
  const pollRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Lắng nghe sự kiện reset (gọi khi đăng nhập/đăng xuất) để làm sạch khung chat ngay lập tức
  useEffect(() => {
    function handleReset() {
      setMessages([defaultGreeting]);
      setMode("ai");
      setQueuePosition(null);
      setStaffInfo({ name: "", avatar: "" });
      setSuggestedQuestions(pickRandomQuestions());
      lastMessageIdRef.current = 0;
    }
    window.addEventListener("vivugo-chat-reset", handleReset);
    return () => window.removeEventListener("vivugo-chat-reset", handleReset);
  }, []);

  // Tự đồng bộ lịch sử THẬT từ server khi mở trang
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    fetchChatMessages(sessionId)
      .then((response) => {
        const serverMessages = (response?.messages || []).map(mapServerMessage);
        if (serverMessages.length > 0) {
          setMessages(serverMessages);
          lastMessageIdRef.current = serverMessages[serverMessages.length - 1].id;
        }
        if (response?.mode) setMode(response.mode);
      })
      .catch(() => {
        // im lặng bỏ qua lỗi mạng, giữ nguyên lịch sử tạm đang có
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cho phép mở khung chat từ bất kỳ đâu trong trang bằng cách phát sự kiện "open-vivugo-chatbox"
  useEffect(() => {
    function handleCustomOpen() {
      setOpen(true);
    }
    window.addEventListener("open-vivugo-chatbox", handleCustomOpen);
    return () => {
      window.removeEventListener("open-vivugo-chatbox", handleCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (mode === "ai") {
      if (pollRef.current) window.clearInterval(pollRef.current);
      return undefined;
    }

    async function poll() {
      try {
        const sessionId = getOrCreateSessionId();
        const response = await fetchChatMessages(sessionId);
        const serverMessages = (response?.messages || []).map(mapServerMessage);

        if (serverMessages.length > 0) {
          const lastId = serverMessages[serverMessages.length - 1].id;
          if (lastId !== lastMessageIdRef.current) {
            lastMessageIdRef.current = lastId;
            setMessages(serverMessages);
          }
        }

        if (response?.mode) setMode(response.mode);
        if (typeof response?.queue_position === "number") {
          setQueuePosition(response.queue_position);
        }
        if (response?.assigned_staff_name || response?.assigned_staff_avatar) {
          setStaffInfo({
            name: response.assigned_staff_name || "",
            avatar: response.assigned_staff_avatar || "",
          });
        }
      } catch {
        // ignore
      }
    }

    void poll();
    pollRef.current = window.setInterval(poll, POLL_INTERVAL);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [mode]);

  function handleImageSelect(event) {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearSelectedImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendMessage(event, quickText = "", requestHuman = false) {
    event?.preventDefault();
    const message = requestHuman
      ? "Tôi muốn gặp nhân viên hỗ trợ"
      : (quickText || text).trim();

    if ((!message && !imageFile) || loading) {
      if (!requestHuman) return;
    }

    setMessages((current) => [
      ...current,
      { from: "user", text: message, attachmentUrl: imagePreview || null },
    ]);
    setText("");

    const sentImage = imageFile;
    clearSelectedImage();
    setLoading(true);

    try {
      const sessionId = getOrCreateSessionId();
      const response = await askTravelAssistant(
        message,
        sessionId,
        requestHuman,
        sentImage
      );

      if (response?.mode) setMode(response.mode);
      if (typeof response?.queue_position === "number") {
        setQueuePosition(response.queue_position);
      }

      if (response?.reply) {
        setMessages((current) => [
          ...current,
          { from: "ai", text: response.reply },
        ]);
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          from: "ai",
          text: "Mình gợi ý bạn xem các tour nổi bật hoặc cho mình biết điểm đến, thời gian và ngân sách để tư vấn chính xác hơn nhé.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleRequestHuman() {
    sendMessage(null, "", true);
  }

  function handleShuffleQuestions() {
    setSuggestedQuestions(pickRandomQuestions());
  }

  // Khách tự kết thúc phiên đang chờ/đang chat với nhân viên (giống nút "Hủy lượt chờ" của Shopee)
  async function handleEndSession() {
    if (ending) return;
    setEnding(true);
    try {
      const sessionId = getOrCreateSessionId();
      const response = await closeChatSession(sessionId);
      if (response?.mode) setMode(response.mode);
      if (response?.reply) {
        setMessages((current) => [...current, { from: "ai", text: response.reply }]);
      }
      setQueuePosition(null);
      setStaffInfo({ name: "", avatar: "" });
      setSuggestedQuestions(pickRandomQuestions());
    } catch {
      // im lặng bỏ qua lỗi mạng
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className="vg-chat">
      {open ? (
        <section className="vg-chat-panel" aria-label="Trợ lý du lịch ViVuGo">
          <header className="vg-chat-header">
            <div className="vg-ai-avatar">
              <Icon name="sparkle" />
            </div>
            <div className="vg-chat-header-info">
              <strong>
                {mode === "human" && staffInfo.name ? staffInfo.name : "Trợ lý ViVuGo AI"}
              </strong>
              <span>
                <i />
                {mode === "human"
                  ? " Nhân viên đang hỗ trợ"
                  : mode === "pending_human"
                  ? " Đang chờ nhân viên..."
                  : " Đang trực tuyến"}
              </span>
            </div>
            <button
              type="button"
              className="vg-chat-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
            >
              <Icon name="close" />
            </button>
          </header>

          <div className="vg-chat-content">
            <p className="vg-chat-date">Hôm nay</p>

            {messages.map((message, index) => (
              <div
                key={message.id || `${message.from}-${index}`}
                className={`vg-message-row ${message.from === "user" ? "is-user" : "is-ai"}`}
              >
                {message.from !== "user" ? (
                  <MessageAvatar isStaff={Boolean(message.isStaff)} staffAvatarUrl={staffInfo.avatar} />
                ) : null}

                <div className={`vg-message ${message.from}${message.isStaff ? " staff" : ""}`}>
                  {message.attachmentUrl ? (
                    <img src={message.attachmentUrl} alt="Ảnh đính kèm" className="vg-message-image" />
                  ) : null}
                  {message.from === "ai" ? renderMessageText(message.text) : message.text}
                </div>
              </div>
            ))}

            {mode === "pending_human" && queuePosition ? (
              <div className="vg-queue-banner">
                <span className="vg-queue-dots">•••</span>
                Hàng đợi của bạn là <strong>#{queuePosition}</strong>. Bạn vui lòng chờ thêm xíu nhé.
              </div>
            ) : null}

            {loading ? (
              <div className="vg-message-row is-ai">
                <MessageAvatar isStaff={false} />
                <div className="vg-message ai vg-typing">
                  <i /><i /><i />
                </div>
              </div>
            ) : null}

            {/* Bảng câu hỏi gợi ý kiểu Shopee - chỉ hiện khi đang chat với AI */}
            {mode === "ai" ? (
              <div className="vg-suggested-card">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="vg-suggested-question"
                    onClick={(event) => sendMessage(event, question)}
                  >
                    {question}
                  </button>
                ))}
                <button type="button" className="vg-suggested-shuffle" onClick={handleShuffleQuestions}>
                  ⟳ Đổi câu hỏi
                </button>
              </div>
            ) : null}
          </div>

          {mode === "ai" ? (
            <div className="vg-human-request-bar">
              <button
                type="button"
                className="vg-request-human-btn"
                onClick={handleRequestHuman}
                disabled={loading}
              >
                Gặp nhân viên hỗ trợ
              </button>
            </div>
          ) : (
            <div className="vg-human-request-bar">
              <button
                type="button"
                className="vg-end-session-btn"
                onClick={handleEndSession}
                disabled={ending}
              >
                {ending ? "Đang kết thúc..." : "Kết thúc trò chuyện"}
              </button>
            </div>
          )}

          {imagePreview ? (
            <div className="vg-image-preview-bar">
              <img src={imagePreview} alt="Xem trước" />
              <button type="button" onClick={clearSelectedImage}>Bỏ ảnh</button>
            </div>
          ) : null}

          <form className="vg-chat-form" onSubmit={sendMessage}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="vg-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Đính kèm ảnh"
            >
              📎
            </button>
            <input
              className="vg-chat-input"
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={mode === "pending_human" ? "Đang chờ phản hồi..." : "Nhập câu hỏi..."}
            />
            <button type="submit" className="vg-send-btn" title="Gửi">
              <Icon name="send" />
            </button>
          </form>

          <small className="vg-chat-note">ViVuGo AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.</small>
        </section>
      ) : null}

      <button className="vg-chat-fab" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? <Icon name="close" /> : <Icon name="sparkle" size={25} />}
      </button>
    </div>
  );
}

export default ChatBox;