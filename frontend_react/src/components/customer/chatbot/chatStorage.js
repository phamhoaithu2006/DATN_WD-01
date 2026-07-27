const CHAT_HISTORY_KEY = "vivugo_chat_history";
const CHAT_SESSION_KEY = "vivugo_chat_session_id";

const defaultGreeting = {
  from: "ai",
  text: "Xin chào! Mình là trợ lý du lịch ViVuGo. Bạn muốn đi đâu, ngân sách bao nhiêu và dự định đi mấy ngày?",
};

export function getOrCreateChatSessionId() {
  let sessionId = localStorage.getItem(CHAT_SESSION_KEY);

  if (!sessionId) {
    sessionId = `session-${crypto.randomUUID()}`;
    localStorage.setItem(CHAT_SESSION_KEY, sessionId);
  }

  return sessionId;
}

export function loadStoredChatMessages() {
  try {
    const raw = sessionStorage.getItem(CHAT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [defaultGreeting];
  } catch {
    return [defaultGreeting];
  }
}

export function storeChatMessages(messages) {
  sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
}

export function clearChatHistory() {
  sessionStorage.removeItem(CHAT_HISTORY_KEY);
}
