import { useEffect, useRef, useState } from "react";
import { askTravelAssistant, fetchChatMessages } from "../../services/customerApi";
import Icon from "./Icon";

const CHAT_HISTORY_KEY = "vivugo_chat_history";
const POLL_INTERVAL = 4000;

const defaultGreeting = {
  from: "ai",
  text: "Xin chào! Mình là trợ lý du lịch ViVuGo. Bạn muốn đi đâu, ngân sách bao nhiêu và dự định đi mấy ngày?",
};

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

export function clearChatHistory() {
  sessionStorage.removeItem(CHAT_HISTORY_KEY);
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

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  const lastMessageIdRef = useRef(0);
  const pollRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch {
      // bỏ qua nếu sessionStorage lỗi
    }
  }, [messages]);

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
        // bỏ qua lỗi polling
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
        sentImage,
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

  return (
    <div className="vg-chat">
      {open ? (
        <section className="vg-chat-panel" aria-label="Trợ lý du lịch ViVuGo">
          <header>
            <div className="vg-ai-avatar">
              <Icon name="sparkle" />
            </div>
            <div>
              <strong>
                {mode === "human" && staffInfo.name
                  ? staffInfo.name
                  : "Trợ lý ViVuGo AI"}
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
              onClick={() => setOpen(false)}
              aria-label="Đóng trò chuyện"
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
                  <MessageAvatar
                    isStaff={Boolean(message.isStaff)}
                    staffAvatarUrl={staffInfo.avatar}
                  />
                ) : null}

                <div
                  className={`vg-message ${message.from}${message.isStaff ? " staff" : ""}`}
                >
                  {message.attachmentUrl ? (
                    <img
                      src={message.attachmentUrl}
                      alt="Ảnh đính kèm"
                      className="vg-message-image"
                    />
                  ) : null}
                  {message.from === "ai"
                    ? renderMessageText(message.text)
                    : message.text}
                </div>
              </div>
            ))}

            {mode === "pending_human" && queuePosition ? (
              <div className="vg-queue-banner">
                <span className="vg-queue-dots">•••</span>
                Hàng đợi của bạn là <strong>#{queuePosition}</strong>. Bạn vui
                lòng chờ thêm xíu nhé.
              </div>
            ) : null}

            {loading ? (
              <div className="vg-message-row is-ai">
                <MessageAvatar isStaff={false} />
                <div className="vg-message ai vg-typing">
                  <i />
                  <i />
                  <i />
                </div>
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
          ) : null}

          {messages.length === 1 && mode === "ai" ? (
            <div className="vg-quick-prompts">
              {[
                "Gợi ý tour biển",
                "Tour dưới 10 triệu",
                "Đi đâu tháng này?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={(event) => sendMessage(event, prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          {imagePreview ? (
            <div className="vg-image-preview-bar">
              <img src={imagePreview} alt="Xem trước" />
              <button type="button" onClick={clearSelectedImage}>
                Bỏ ảnh
              </button>
            </div>
          ) : null}

          <form onSubmit={sendMessage}>
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
              aria-label="Gửi ảnh"
              title="Gửi ảnh"
            >
              📎
            </button>
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={
                mode === "pending_human"
                  ? "Đang chờ nhân viên phản hồi..."
                  : "Nhập câu hỏi của bạn..."
              }
            />
            <button type="submit" aria-label="Gửi tin nhắn">
              <Icon name="send" />
            </button>
          </form>
          <small className="vg-chat-note">
            ViVuGo AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
          </small>
        </section>
      ) : null}
      <button
        className="vg-chat-fab"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mở trợ lý ViVuGo"
      >
        {open ? (
          <Icon name="close" />
        ) : (
          <Icon name="sparkle" size={25} />
        )}
      </button>
    </div>
  );
}

export default ChatBox;