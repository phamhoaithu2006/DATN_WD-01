const apiOrigin = (() => {
  try {
    return new URL(import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api").origin;
  } catch {
    return "";
  }
})();

export function mediaUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) return "";
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;

  if (raw.startsWith("/storage/")) {
    return apiOrigin ? `${apiOrigin}${raw}` : raw;
  }

  if (raw.startsWith("storage/")) {
    return apiOrigin ? `${apiOrigin}/${raw}` : `/${raw}`;
  }

  try {
    const url = new URL(raw);

    if (url.pathname.startsWith("/storage/") && apiOrigin) {
      return `${apiOrigin}${url.pathname}${url.search}${url.hash}`;
    }

    return raw;
  } catch {
    return raw;
  }
}
