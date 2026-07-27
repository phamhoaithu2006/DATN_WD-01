function normalizeReplyText(rawText) {
  if (!rawText) return "";

  return rawText.replace(/\s\*\s(?=\*\*)/g, "\n").trim();
}

function ChatReplyContent({ text: rawText }) {
  const lines = normalizeReplyText(rawText)
    .split("\n")
    .filter((line) => line.trim() !== "");

  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

    return (
      <p key={lineIndex} className="vg-message-line">
        {parts.map((part, partIndex) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={partIndex}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={partIndex}>{part}</span>
          ),
        )}
      </p>
    );
  });
}

export default ChatReplyContent;
