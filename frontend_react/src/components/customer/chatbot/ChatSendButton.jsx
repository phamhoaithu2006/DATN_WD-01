import Icon from "../Icon";

function ChatSendButton() {
  return (
    <button
      type="submit"
      className="vg-send-btn"
      aria-label="Gửi tin nhắn"
      title="Gửi"
    >
      <Icon name="send" />
    </button>
  );
}

export default ChatSendButton;
