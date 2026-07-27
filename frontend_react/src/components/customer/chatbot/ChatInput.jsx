import { useEffect, useRef } from "react";
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
  onImageSelect,
  onSubmit,
  onTextChange,
}) {
  const textareaRef = useRef(null);
  const isSendDisabled = loading || (!text.trim() && !imagePreview);

  useEffect(() => {
    if (textareaRef.current) resizeTextarea(textareaRef.current);
  }, [text]);

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
