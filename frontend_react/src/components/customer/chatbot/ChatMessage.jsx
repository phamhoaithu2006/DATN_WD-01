import { Link } from "react-router-dom";
import Icon from "../Icon";
import ChatReplyContent from "./ChatReplyContent";

function DefaultStaffAvatar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <circle cx="12" cy="8" r="4" fill="#fff" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="#fff" />
    </svg>
  );
}

function MessageAvatar({ isStaff, staffAvatarUrl }) {
  if (isStaff) {
    return (
      <span className="vg-msg-avatar staff-avatar">
        {staffAvatarUrl ? (
          <img src={staffAvatarUrl} alt="Nhân viên hỗ trợ" />
        ) : (
          <DefaultStaffAvatar />
        )}
      </span>
    );
  }

  return (
    <span className="vg-msg-avatar ai-avatar">
      <Icon name="sparkle" size={14} />
    </span>
  );
}

function ChatMessage({ message, staffAvatarUrl, onTourNavigate }) {
  const isUser = message.from === "user";
  const recommendedTours = isUser ? [] : message.recommendedTours || [];
  const senderLabel = isUser
    ? "Tin nhắn của bạn"
    : message.isStaff
    ? "Tin nhắn của nhân viên hỗ trợ"
    : "Tin nhắn của Trợ lý ViVuGo AI";

  return (
    <article
      className={`vg-message-row ${isUser ? "is-user" : "is-ai"}`}
      aria-label={senderLabel}
    >
      {!isUser ? (
        <MessageAvatar
          isStaff={Boolean(message.isStaff)}
          staffAvatarUrl={staffAvatarUrl}
        />
      ) : null}

      <div
        className={`vg-message ${message.from}${message.isStaff ? " staff" : ""}`}
      >
        {message.attachmentUrl ? (
          <img
            src={message.attachmentUrl}
            alt="Ảnh đính kèm"
            className="vg-message-image"
          />
        ) : null}
        {isUser ? (
          <span className="vg-message-text">{message.text}</span>
        ) : (
          <ChatReplyContent text={message.text} />
        )}

        {recommendedTours.length > 0 ? (
          <div
            className="vg-chat-tour-links"
            aria-label="Tour được đề xuất"
          >
            {recommendedTours.map((tour) => (
              <div className="vg-chat-tour-link-item" key={tour.id}>
                <span>{tour.title}</span>
                <Link
                  to={`/tours/${encodeURIComponent(tour.slug)}`}
                  onClick={onTourNavigate}
                >
                  Xem chi tiết
                  <Icon name="arrowRight" size={14} />
                </Link>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ChatTypingIndicator() {
  return (
    <div className="vg-message-row is-ai">
      <MessageAvatar isStaff={false} />
      <div className="vg-message ai vg-typing">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export default ChatMessage;
