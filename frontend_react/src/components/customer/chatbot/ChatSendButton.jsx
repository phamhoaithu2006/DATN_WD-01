import Icon from "../Icon";

function ChatSendButton({ disabled, loading }) {
  return (
    <button
      type="submit"
      className="vg-send-btn"
      disabled={disabled}
      aria-label={loading ? "Đang gửi tin nhắn" : "Gửi tin nhắn"}
      aria-busy={loading}
      title={loading ? "Đang gửi..." : "Gửi"}
    >
      <Icon name="send" size={18} />
    </button>
  );
}

export default ChatSendButton;
