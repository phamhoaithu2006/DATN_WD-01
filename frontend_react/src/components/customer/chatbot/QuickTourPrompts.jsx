const TOUR_PROMPTS = [
  "Gợi ý tour biển",
  "Tour dưới 10 triệu",
  "Đi đâu tháng này?",
];

function QuickTourPrompts({ onSelect }) {
  return (
    <div
      className="vg-chat-faq"
      role="group"
      aria-label="Câu hỏi thường gặp"
    >
      {TOUR_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          className="vg-chat-faq-button"
          onClick={(event) => onSelect(event, prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

export default QuickTourPrompts;
