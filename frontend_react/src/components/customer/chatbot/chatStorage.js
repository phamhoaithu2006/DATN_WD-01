const CHAT_SESSION_KEY_PREFIX = "vivugo_chat_session_id";
const GUEST_SCOPE_KEY = "vivugo_chat_guest_scope";
const LEGACY_CHAT_HISTORY_KEY = "vivugo_chat_history";
const LEGACY_CHAT_SESSION_KEY = "vivugo_chat_session_id";

const defaultGreeting = {
  from: "ai",
  text: "Xin chào! Mình là trợ lý du lịch ViVuGo. Bạn muốn đi đâu, ngân sách bao nhiêu và dự định đi mấy ngày?",
};

function createChatUuid() {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  );

  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function normalizedUserId(userId) {
  if (userId === null || userId === undefined || userId === "") return null;

  return String(userId);
}

function clearLegacyChatStorage() {
  localStorage.removeItem(LEGACY_CHAT_SESSION_KEY);
  sessionStorage.removeItem(LEGACY_CHAT_HISTORY_KEY);
}

function getOrCreateGuestScope() {
  let guestScope = sessionStorage.getItem(GUEST_SCOPE_KEY);

  if (!guestScope) {
    guestScope = createChatUuid();
    sessionStorage.setItem(GUEST_SCOPE_KEY, guestScope);
  }

  return guestScope;
}

function getSessionStorageDetails(userId) {
  const scopedUserId = normalizedUserId(userId);

  if (scopedUserId) {
    return {
      storage: localStorage,
      key: `${CHAT_SESSION_KEY_PREFIX}:user:${encodeURIComponent(scopedUserId)}`,
      sessionPrefix: `user-${scopedUserId}`,
    };
  }

  const guestScope = getOrCreateGuestScope();

  return {
    storage: sessionStorage,
    key: `${CHAT_SESSION_KEY_PREFIX}:guest:${guestScope}`,
    sessionPrefix: "guest",
  };
}

export function getDefaultChatMessages() {
  return [{ ...defaultGreeting }];
}

export function getOrCreateChatSessionId(userId = null) {
  clearLegacyChatStorage();

  const { storage, key, sessionPrefix } = getSessionStorageDetails(userId);
  let sessionId = storage.getItem(key);

  if (!sessionId) {
    sessionId = `${sessionPrefix}-${createChatUuid()}`;
    storage.setItem(key, sessionId);
  }

  return sessionId;
}

export function storeChatSessionId(userId, sessionId) {
  if (!sessionId) return;

  clearLegacyChatStorage();

  const { storage, key } = getSessionStorageDetails(userId);
  storage.setItem(key, sessionId);
}

export function resetChatSession(userId = null) {
  clearLegacyChatStorage();

  const scopedUserId = normalizedUserId(userId);

  if (scopedUserId) {
    localStorage.removeItem(
      `${CHAT_SESSION_KEY_PREFIX}:user:${encodeURIComponent(scopedUserId)}`,
    );
  } else {
    const guestScope = sessionStorage.getItem(GUEST_SCOPE_KEY);

    if (guestScope) {
      sessionStorage.removeItem(
        `${CHAT_SESSION_KEY_PREFIX}:guest:${guestScope}`,
      );
    }

    sessionStorage.removeItem(GUEST_SCOPE_KEY);
  }

  window.dispatchEvent(new Event("vivugo-chat-reset"));
}
