import ChatSendButton from "./ChatSendButton";

function ChatInput({
  fileInputRef,
  imagePreview,
  mode,
  text,
  onClearImage,
  onImageSelect,
  onSubmit,
  onTextChange,
}) {
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

      <form onSubmit={onSubmit}>
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
          📎
        </button>
        <input
          type="text"
          value={text}
          onChange={onTextChange}
          placeholder={
            mode === "pending_human"
              ? "Đang chờ nhân viên phản hồi..."
              : "Nhập câu hỏi của bạn..."
          }
        />
        <ChatSendButton />
      </form>
    </>
  );
}

export default ChatInput;
