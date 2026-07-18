import { useEffect, useState } from "react";
import { askTravelAssistant } from "../../services/customerApi";
import Icon from "./Icon";

const CHAT_HISTORY_KEY = "vivugo_chat_history";

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

// Xuất ra để CustomerPage.jsx gọi khi logout
export function clearChatHistory() {
  sessionStorage.removeItem(CHAT_HISTORY_KEY);
}

// Chuẩn hóa: nếu AI lỡ dùng " * " làm gạch đầu dòng thay vì xuống dòng thật, tự thêm xuống dòng
function normalizeReplyText(raw) {
  if (!raw) return "";
  return raw.replace(/\s\*\s(?=\*\*)/g, "\n").trim();
}

// Render text có markdown đơn giản: xuống dòng thật + **in đậm**
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

function ChatBox() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(loadStoredMessages);

  // Mỗi khi messages đổi, tự lưu lại vào sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch {
      // sessionStorage đầy hoặc bị chặn -> bỏ qua, không crash app
    }
  }, [messages]);

  async function sendMessage(event, quickText = "") {
    event?.preventDefault();
    const message = (quickText || text).trim();
    if (!message || loading) return;
    setMessages((current) => [...current, { from: "user", text: message }]);
    setText("");
    setLoading(true);
    try {
      const sessionId = getOrCreateSessionId();
      const response = await askTravelAssistant(message, sessionId);
      setMessages((current) => [
        ...current,
        { from: "ai", text: response.reply },
      ]);
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
                <i /> Đang trực tuyến
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
                key={`${message.from}-${index}`}
                className={`vg-message ${message.from}`}
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
          {messages.length === 1 ? (
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
              placeholder="Nhập câu hỏi của bạn..."
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