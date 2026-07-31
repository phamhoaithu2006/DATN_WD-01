import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import ChatSendButton from "./ChatSendButton";

const MAX_INPUT_HEIGHT = 96;

function resizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_INPUT_HEIGHT)}px`;
}

function ChatInput({
  fileInputRef,
  imagePreview,
  loading,
  mode,
  text,
  onClearImage,
  onEndConversation,
  onImageSelect,
  onOpenFaq,
  onRequestHuman,
  onStartConversation,
  onSubmit,
  onTextChange,
}) {
  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isSendDisabled = loading || (!text.trim() && !imagePreview);

  useEffect(() => {
    if (textareaRef.current) resizeTextarea(textareaRef.current);
  }, [text]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function handleTextChange(event) {
    resizeTextarea(event.currentTarget);
    onTextChange(event);
  }

  function handleKeyDown(event) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    if (isSendDisabled) return;
    event.currentTarget.form?.requestSubmit();
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleStartConversation() {
    closeMenu();
    onStartConversation();
  }

  function handleOpenFaq() {
    closeMenu();
    onOpenFaq();
  }

  function handleRequestHuman() {
    closeMenu();
    onRequestHuman();
  }

  function handleEndConversation() {
    closeMenu();
    onEndConversation();
  }

  return (
    <>
      {imagePreview ? (
        <div className="vg-image-preview-bar">
          <img src={imagePreview} alt="Xem trước" />
          <button type="button" onClick={onClearImage}>
            Bỏ ảnh
          </button>
        </div>
      ) : null}

      <form className="vg-chat-form" onSubmit={onSubmit}>
        <input
          ref={fileInputRef}
          className="vg-file-input"
          type="file"
          accept="image/*"
          onChange={onImageSelect}
        />
        <div className="vg-chat-menu-shell" ref={menuRef}>
          <button
            type="button"
            className={`vg-chat-menu-btn${menuOpen ? " is-open" : ""}`}
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Mở menu hỗ trợ"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="Menu hỗ trợ"
          >
            <Icon name="menu" size={20} />
          </button>

          {menuOpen ? (
            <div className="vg-chat-menu" role="menu">
              <button
                type="button"
                className="vg-chat-menu-item"
                onClick={handleStartConversation}
                role="menuitem"
              >
                <Icon name="sparkle" size={19} />
                <span>Bắt đầu cuộc trò chuyện</span>
              </button>
              <button
                type="button"
                className="vg-chat-menu-item"
                onClick={handleOpenFaq}
                role="menuitem"
              >
                <Icon name="alertCircle" size={19} />
                <span>Câu hỏi thường gặp</span>
              </button>
              <button
                type="button"
                className="vg-chat-menu-item"
                onClick={handleRequestHuman}
                disabled={loading || mode !== "ai"}
                role="menuitem"
              >
                <Icon name="headset" size={19} />
                <span>Gặp nhân viên hỗ trợ</span>
              </button>

              <button
                type="button"
                className="vg-chat-menu-item is-end"
                onClick={handleEndConversation}
                disabled={loading}
                role="menuitem"
              >
                <Icon name="xCircle" size={19} />
                <span>Kết thúc trò chuyện</span>
              </button>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="vg-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Gửi ảnh"
          title="Gửi ảnh"
        >
          <Icon name="paperclip" size={19} />
        </button>
        <textarea
          ref={textareaRef}
          className="vg-chat-input"
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          aria-label="Nội dung tin nhắn"
          placeholder={
            mode === "pending_human"
              ? "Đang chờ nhân viên phản hồi..."
              : "Nhập câu hỏi của bạn..."
          }
        />
        <ChatSendButton disabled={isSendDisabled} loading={loading} />
      </form>
      <small className="vg-chat-input-hint">
        Enter để gửi · Shift + Enter để xuống dòng
      </small>
    </>
  );
}

export default ChatInput;
