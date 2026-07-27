import { useEffect, useRef, useState } from "react";
import {
  askTravelAssistant,
  fetchChatMessages,
  normalizeRecommendedTours,
} from "../../services/customerApi";
import "../../styles/chatbot.css";
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

  useEffect(() => {
    const chatContent = chatContentRef.current;
    if (!open || !chatContent || !shouldStickToBottomRef.current) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      chatContent.scrollTo({
        top: chatContent.scrollHeight,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [loading, messages, open]);

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

  function handleChatScroll(event) {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    shouldStickToBottomRef.current =
      scrollHeight - scrollTop - clientHeight < 80;
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
            <QuickTourPrompts onSelect={sendMessage} />
          ) : null}

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
