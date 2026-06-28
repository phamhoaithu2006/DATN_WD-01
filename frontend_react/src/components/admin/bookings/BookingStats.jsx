function BookingStats({ cards, activeStatus, onStatusChange }) {
  return (
    <div className="booking-stat-cards">
      {cards.map((card) => (
        <button
          className={`booking-stat-card ${card.className} ${activeStatus === card.key ? 'active' : ''}`}
          key={card.key}
          type="button"
          onClick={() => onStatusChange(card.key === 'total' ? '' : card.key)}
        >
          <strong>{card.value}</strong>
          <span>{card.label}</span>
        </button>
      ))}
    </div>
  )
}

export default BookingStats