import { useEffect, useRef, useState } from "react";
import {
  askTravelAssistant,
  closeChatSession,
  fetchChatMessages,
  normalizeRecommendedTours,
} from "../../services/customerApi";
import "../../styles/chatbot.css";
import FaqBrowser from "./faq/FaqBrowser";
import Icon from "./Icon";
import ChatInput from "./chatbot/ChatInput";
import ChatMessage, {
  ChatTypingIndicator,
} from "./chatbot/ChatMessage";
import { ChatTourRecommendations } from "./chatbot/ChatTourRecommendations";
import {
  getDefaultChatMessages,
  getOrCreateChatSessionId,
  storeChatSessionId,
} from "./chatbot/chatStorage";

const POLL_INTERVAL = 15000;
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

function ChatBox({ userId = null }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [activeView, setActiveView] = useState("chat");
  const [endingSupport, setEndingSupport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [compactViewport, setCompactViewport] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(getDefaultChatMessages);
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
  const historyLoadedRef = useRef(false);
  const pollRequestRef = useRef(false);

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
      setChatStarted(false);
      setActiveView("chat");
      setText("");
      setLoading(false);
      setHistoryLoading(false);
      setMode("ai");
      setQueuePosition(null);
      setStaffInfo({ name: "", avatar: "" });
      setImageFile(null);
      setImagePreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      shouldStickToBottomRef.current = true;
      lastMessageIdRef.current = 0;
      historyLoadedRef.current = false;
    }

    window.addEventListener("vivugo-chat-reset", handleReset);

    return () => {
      window.removeEventListener("vivugo-chat-reset", handleReset);
    };
  }, []);

  // Lịch sử luôn lấy từ server theo identity hiện tại. Không render cache của
  // identity trước trong lúc đổi tài khoản.
  useEffect(() => {
    let active = true;
    const sessionId = getOrCreateChatSessionId(userId);

    void fetchChatMessages(sessionId)
      .then((response) => {
        if (!active) return;

        const serverMessages = (response?.messages || []).map(mapServerMessage);

        if (serverMessages.length > 0) {
          setMessages(serverMessages);
          lastMessageIdRef.current = serverMessages[serverMessages.length - 1].id;
        } else {
          setMessages(getDefaultChatMessages());
          lastMessageIdRef.current = 0;
        }

        storeChatSessionId(userId, response?.session_id);
        if (response?.mode) {
          setMode(response.mode);
          if (response.mode !== "ai") setChatStarted(true);
        }
      })
      .catch(() => {
        if (active) {
          setMessages(getDefaultChatMessages());
          setMode("ai");
          lastMessageIdRef.current = 0;
        }
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

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
    const shouldPoll =
      open &&
      mode !== "ai" &&
      document.visibilityState === "visible";

    if (!shouldPoll) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }

      return undefined;
    }

    async function poll() {
      if (
        pollRequestRef.current ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      pollRequestRef.current = true;

      try {
        const sessionId = getOrCreateChatSessionId(userId);
        const response = await fetchChatMessages(sessionId);
        const serverMessages = (response?.messages || []).map(mapServerMessage);

        if (serverMessages.length > 0) {
          const lastId =
            serverMessages[serverMessages.length - 1].id;

          if (lastId !== lastMessageIdRef.current) {
            lastMessageIdRef.current = lastId;
            setMessages(serverMessages);
          }
        }

        if (response?.mode) setMode(response.mode);
        storeChatSessionId(userId, response?.session_id);
        if (typeof response?.queue_position === "number") {
          setQueuePosition(response.queue_position);
        }

        if (
          response?.assigned_staff_name ||
          response?.assigned_staff_avatar
        ) {
          setStaffInfo({
            name: response.assigned_staff_name || "",
            avatar: response.assigned_staff_avatar || "",
          });
        }
      } catch {
        // Bỏ qua lỗi polling tạm thời.
      } finally {
        pollRequestRef.current = false;
      }
    }

    void poll();

    pollRef.current = window.setInterval(
      poll,
      POLL_INTERVAL,
    );

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }

      pollRequestRef.current = false;
    };
  }, [mode, open, userId]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        open &&
        mode !== "ai"
      ) {
        /*
         * Thay đổi nhẹ mode state để effect polling được khởi động lại
         * sau khi tab trở lại trạng thái hiển thị.
         */
        setMode((current) => current);
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [mode, open, userId]);

  function handleImageSelect(event) {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

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

    if ((!message && !imageFile) || loading || historyLoading) {
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
      const sessionId = getOrCreateChatSessionId(userId);
      const response = await askTravelAssistant(
        message,
        sessionId,
        requestHuman,
        sentImage
      );

      storeChatSessionId(userId, response?.session_id);
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
    return sendMessage(null, "", true);
  }

  async function handleEndConversation() {
    if (endingSupport) return;
    setEndingSupport(true);

    try {
      const sessionId = getOrCreateChatSessionId(userId);
      const response = await closeChatSession(sessionId);

      if (response?.mode) setMode(response.mode);
      setQueuePosition(null);
      setStaffInfo({ name: "", avatar: "" });

      if (response?.reply) {
        setMessages((current) => [
          ...current,
          { from: "ai", text: response.reply },
        ]);
      }
    } catch {
      // Nếu server chưa có phiên chat, giao diện vẫn có thể trở về màn hình chào.
    } finally {
      setText("");
      clearSelectedImage();
      setChatStarted(false);
      setActiveView("chat");
      setEndingSupport(false);
    }
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
        className={`vg-chat-panel${open ? " is-open" : ""}${expanded ? " is-expanded" : ""}`}
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
          <div className="vg-chat-header-actions">
            <button
              type="button"
              className="vg-chat-resize-btn"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? "Thu nhỏ cửa sổ trò chuyện" : "Phóng to cửa sổ trò chuyện"}
              title={expanded ? "Thu nhỏ" : "Phóng to"}
              aria-pressed={expanded}
            >
              <Icon name={expanded ? "minimize" : "maximize"} size={18} />
            </button>
            <button
              type="button"
              className="vg-chat-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Đóng cửa sổ trò chuyện"
              title="Đóng"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </header>

          {!chatStarted ? (
            <div className="vg-chat-welcome">
              <div className="vg-chat-welcome-avatar" aria-hidden="true">
                <Icon name="sparkle" size={34} />
                <span>AI</span>
              </div>
              <div className="vg-chat-welcome-copy">
                <h2>Trợ lý ViVuGo AI</h2>
                <p>Xin chào! Mình có thể giúp gì cho chuyến đi của bạn?</p>
              </div>
              <button
                type="button"
                className="vg-chat-start-btn"
                onClick={() => {
                  setChatStarted(true);
                  setActiveView("chat");
                }}
                disabled={historyLoading}
              >
                {historyLoading ? "Đang chuẩn bị..." : "Bắt đầu trò chuyện"}
              </button>
            </div>
          ) : activeView === "faq" ? (
            <div className="vg-chat-faq-view">
              <FaqBrowser
                compact
                onBack={() => setActiveView("chat")}
              />
            </div>
          ) : (
            <>
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

              <ChatInput
                fileInputRef={fileInputRef}
                imagePreview={imagePreview}
                loading={loading || historyLoading || endingSupport}
                mode={mode}
                text={text}
                onClearImage={clearSelectedImage}
                onEndConversation={handleEndConversation}
                onImageSelect={handleImageSelect}
                onOpenFaq={() => setActiveView("faq")}
                onRequestHuman={handleRequestHuman}
                onStartConversation={() => setActiveView("chat")}
                onSubmit={sendMessage}
                onTextChange={(event) => setText(event.target.value)}
              />
              <small className="vg-chat-note">
                ViVuGo AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
              </small>
            </>
          )}
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
