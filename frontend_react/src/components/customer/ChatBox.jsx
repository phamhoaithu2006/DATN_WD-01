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

// Chuyển messages từ backend (role: user/assistant/staff) sang định dạng UI (from: user/ai)
function mapServerMessage(message) {
  return {
    id: message.id,
    from: message.role === "user" ? "user" : "ai",
    text: message.content,
    isStaff: message.role === "staff",
  };
}

function ChatBox() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(loadStoredMessages);
  const [mode, setMode] = useState("ai"); // 'ai' | 'pending_human' | 'human'

  const lastMessageIdRef = useRef(0);
  const pollRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch {
      // bỏ qua nếu sessionStorage lỗi
    }
  }, [messages]);

  // Polling: chỉ chạy khi đang chờ hoặc đang được nhân viên xử lý,
  // để nhận tin nhắn mới của nhân viên mà không cần khách tự gõ gì thêm
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

        if (response?.mode) {
          setMode(response.mode);
        }
      } catch {
        // im lặng bỏ qua lỗi polling, không làm phiền khách
      }
    }

    void poll();
    pollRef.current = window.setInterval(poll, POLL_INTERVAL);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [mode]);

  async function sendMessage(event, quickText = "", requestHuman = false) {
    event?.preventDefault();
    const message = requestHuman
      ? "Tôi muốn gặp nhân viên hỗ trợ"
      : (quickText || text).trim();

    if ((!message || loading) && !requestHuman) return;

    setMessages((current) => [...current, { from: "user", text: message }]);
    setText("");
    setLoading(true);

    try {
      const sessionId = getOrCreateSessionId();
      const response = await askTravelAssistant(message, sessionId, requestHuman);

      if (response?.mode) {
        setMode(response.mode);
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
              <strong>Trợ lý ViVuGo AI</strong>
              <span>
                <i />
                {mode === "human"
                  ? " Đang chat với nhân viên"
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
                className={`vg-message ${message.from}${message.isStaff ? " staff" : ""}`}
              >
                {message.from === "ai"
                  ? renderMessageText(message.text)
                  : message.text}
              </div>
            ))}
            {loading ? (
              <div className="vg-message ai vg-typing">
                <i />
                <i />
                <i />
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

          <form onSubmit={sendMessage}>
            <input
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
          <>
            <Icon name="sparkle" size={25} />
          </>
        )}
      </button>
    </div>
  );
}

export default ChatBox;