const TOUR_PROMPTS = [
  "Gợi ý tour biển",
  "Tour dưới 10 triệu",
  "Đi đâu tháng này?",
];

function QuickTourPrompts({ onSelect }) {
  return (
    <div className="vg-quick-prompts">
      {TOUR_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={(event) => onSelect(event, prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}

export default QuickTourPrompts;
