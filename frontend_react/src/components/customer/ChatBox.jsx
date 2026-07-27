import { useEffect, useRef, useState } from "react";
import { askTravelAssistant, closeChatSession, fetchChatMessages } from "../../services/customerApi";
import { readToken } from "../../services/authStorage";
import Icon from "./Icon";
import ChatInput from "./chatbot/ChatInput";
import ChatMessage, {
  ChatTypingIndicator,
} from "./chatbot/ChatMessage";
import { ChatTourRecommendations } from "./chatbot/ChatTourRecommendations";
import QuickTourPrompts from "./chatbot/QuickTourPrompts";
import {
  getDefaultChatMessages,
  getOrCreateChatSessionId,
  loadStoredChatMessages,
  storeChatMessages,
} from "./chatbot/chatStorage";

const POLL_INTERVAL = 5000;

const defaultGreeting = {
  from: "ai",
  text: "Xin chào! Mình là trợ lý du lịch ViVuGo. Bạn muốn đi đâu, ngân sách bao nhiêu và dự định đi mấy ngày?",
};

// Kho câu hỏi gợi ý - giống dạng Shopee, hiện random 3 câu, có nút "Đổi câu hỏi"
const SUGGESTED_QUESTION_POOL = [
  "Tour nào đang giảm giá?",
  "Tour phù hợp gia đình có trẻ nhỏ?",
  "Cách hủy tour đã thanh toán?",
  "Chính sách hoàn tiền ra sao?",
  "Tour dưới 5 triệu có gì?",
  "Thanh toán bằng cách nào?",
  "Tour biển 3 ngày 2 đêm giá bao nhiêu?",
  "Cần mang giấy tờ gì khi đi tour?",
  "Đổi ngày khởi hành được không?",
  "Tour nào còn nhiều chỗ trống?",
];

function pickRandomQuestions(count = 3) {
  const shuffled = [...SUGGESTED_QUESTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getOrCreateSessionId() {
  const storage = readToken() ? localStorage : sessionStorage;
  let sessionId = storage.getItem("vivugo_chat_session_id");
  if (!sessionId) {
    sessionId = "session-" + crypto.randomUUID();
    storage.setItem("vivugo_chat_session_id", sessionId);
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
  sessionStorage.removeItem("vivugo_chat_session_id");
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
    recommendedTours: normalizeRecommendedTours(message.recommended_tours),
  };
}

function ChatBox() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(loadStoredChatMessages);
  const [mode, setMode] = useState("ai");
  const [queuePosition, setQueuePosition] = useState(null);
  const [staffInfo, setStaffInfo] = useState({ name: "", avatar: "" });
  const [suggestedQuestions, setSuggestedQuestions] = useState(() => pickRandomQuestions());
  const [ending, setEnding] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const chatRootRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatContentRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const lastMessageIdRef = useRef(0);
  const pollRef = useRef(null);

  useEffect(() => {
    try {
      storeChatMessages(messages);
    } catch {
      // Bỏ qua nếu sessionStorage lỗi.
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
    const visualViewport = window.visualViewport;

    function updateViewportBounds() {
      const chatRoot = chatRootRef.current;
      if (!chatRoot) return;

      const viewportHeight = visualViewport?.height || window.innerHeight;
      const viewportTop = visualViewport?.offsetTop || 0;
      const coveredBottom = Math.max(
        0,
        window.innerHeight - viewportHeight - viewportTop,
      );

      chatRoot.style.setProperty(
        "--vg-chat-viewport-height",
        `${Math.round(viewportHeight)}px`,
      );
      chatRoot.style.setProperty(
        "--vg-chat-keyboard-offset",
        `${Math.round(coveredBottom)}px`,
      );
      setCompactViewport(viewportHeight < 500);
    }

    updateViewportBounds();
    window.addEventListener("resize", updateViewportBounds);
    visualViewport?.addEventListener("resize", updateViewportBounds);
    visualViewport?.addEventListener("scroll", updateViewportBounds);

    return () => {
      window.removeEventListener("resize", updateViewportBounds);
      visualViewport?.removeEventListener("resize", updateViewportBounds);
      visualViewport?.removeEventListener("scroll", updateViewportBounds);
    };
  }, []);

  useEffect(() => {
    function handleReset() {
      setMessages(getDefaultChatMessages());
      setMode("ai");
      setQueuePosition(null);
      setStaffInfo({ name: "", avatar: "" });
      shouldStickToBottomRef.current = true;
      lastMessageIdRef.current = 0;
    }

    window.addEventListener("vivugo-chat-reset", handleReset);

    return () => {
      window.removeEventListener("vivugo-chat-reset", handleReset);
    };
  }, []);

  // Đồng bộ lịch sử thật từ server khi mở trang, kể cả khi sessionStorage đã bị xóa.
  useEffect(() => {
    const sessionId = getOrCreateChatSessionId();

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
        // Giữ nguyên lịch sử tạm nếu không thể đồng bộ từ server.
      });
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
        const sessionId = getOrCreateChatSessionId();
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

    shouldStickToBottomRef.current = true;
    setMessages((current) => [
      ...current,
      { from: "user", text: message, attachmentUrl: imagePreview || null },
    ]);
    setText("");

    const sentImage = imageFile;
    clearSelectedImage();
    setLoading(true);

    try {
      const sessionId = getOrCreateChatSessionId();
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
          {
            from: "ai",
            text: response.reply,
            recommendedTours: response.recommended_tours,
          },
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
    <div
      ref={chatRootRef}
      className={`vg-chat${open ? " is-open" : ""}${
        compactViewport ? " is-compact-height" : ""
      }`}
    >
      <section
        id="vivugo-chat-panel"
        className={`vg-chat-panel${open ? " is-open" : ""}`}
        aria-label="Trợ lý du lịch ViVuGo"
        aria-hidden={!open}
        inert={!open}
      >
        <header className="vg-chat-header">
          <div className="vg-ai-avatar" aria-hidden="true">
            <Icon name="sparkle" size={22} />
            <span className="vg-ai-badge">AI</span>
          </div>
          <div className="vg-chat-header-info">
            <strong className="vg-chat-assistant-name">
              {mode === "human" && staffInfo.name ? staffInfo.name : "Trợ lý ViVuGo AI"}
            </strong>
            <span
              className={`vg-chat-status is-${mode}`}
              role="status"
              aria-live="polite"
            >
              <i className="vg-chat-status-dot" aria-hidden="true" />
              {mode === "human"
                ? "Nhân viên đang hỗ trợ"
                : mode === "pending_human"
                ? "Đang chờ nhân viên..."
                : "Đang hoạt động"}
            </span>
          </div>
          <button
            type="button"
            className="vg-chat-close-btn"
            onClick={() => setOpen(false)}
            aria-label="Đóng cửa sổ trò chuyện"
            title="Đóng"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

          <div
            ref={chatContentRef}
            className="vg-chat-content"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            onScroll={handleChatScroll}
          >
            <p className="vg-chat-date">Hôm nay</p>

            {messages.map((message, index) => (
              <ChatMessage
                key={message.id || `${message.from}-${index}`}
                message={message}
                staffAvatarUrl={staffInfo.avatar}
                onTourNavigate={() => setOpen(false)}
              />
            ))}

            {mode === "pending_human" && queuePosition ? (
              <div className="vg-queue-banner">
                <span className="vg-queue-dots">•••</span>
                Hàng đợi của bạn là <strong>#{queuePosition}</strong>. Bạn vui lòng chờ thêm xíu nhé.
              </div>
            ) : null}

            {loading ? (
              <>
                <ChatTypingIndicator />
                <ChatTourRecommendations loading />
              </>
            ) : null}

            {/* Bảng câu hỏi gợi ý kiểu Shopee - chỉ hiện khi đang chat với AI */}
            {mode === "ai" ? (
  <div className="vg-suggested-card">
    <p className="vg-suggested-title">Bạn muốn hỏi về:</p>
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
      <span className="vg-shuffle-icon">⟳</span> Đổi câu hỏi
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

          <ChatInput
            fileInputRef={fileInputRef}
            imagePreview={imagePreview}
            loading={loading}
            mode={mode}
            text={text}
            onClearImage={clearSelectedImage}
            onImageSelect={handleImageSelect}
            onSubmit={sendMessage}
            onTextChange={(event) => setText(event.target.value)}
          />
          <small className="vg-chat-note">
            ViVuGo AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
          </small>
      </section>

      <button
        className="vg-chat-fab"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-controls="vivugo-chat-panel"
        aria-expanded={open}
      >
        {open ? <Icon name="close" /> : <Icon name="sparkle" size={25} />}
      </button>
    </div>
  );
}

export default ChatBox;