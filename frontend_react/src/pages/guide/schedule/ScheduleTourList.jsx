import {
  formatDate,
  getDestination,
  getTourRuntime,
  getTourTitle,
  TOUR_GROUPS,
} from './scheduleUtils'

function ScheduleTourCard({ item, active, onClick }) {
  const runtime = getTourRuntime(item)

  return (
    <button
      type="button"
      className={`guide-schedule-tour-card state-${runtime} ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <span className="guide-schedule-tour-date">{formatDate(item.departure_date)}</span>
      <strong>{getTourTitle(item)}</strong>
      <small>{getDestination(item)}</small>
      <em>
        {formatDate(item.departure_date)} - {formatDate(item.return_date || item.departure_date)}
      </em>
    </button>
  )
}

function ScheduleTourList({
  activeGroup,
  loadingTours,
  onGroupChange,
  onTourSelect,
  selectedTourId,
  totals,
  tourGroups,
}) {
  return (
    <aside className="guide-schedule-sidebar">
      <div className="guide-schedule-tabs">
        {Object.entries(TOUR_GROUPS).map(([key, config]) => (
          <button
            key={key}
            type="button"
            data-group={key}
            className={activeGroup === key ? 'is-active' : ''}
            onClick={() => onGroupChange(key)}
          >
            <div className="guide-schedule-tab-copy">
              <strong>{config.label}</strong>
              <small>{config.hint}</small>
            </div>
            <span>{totals[key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="guide-schedule-tour-list">
        {loadingTours ? (
          <div className="guide-schedule-empty">Đang tải tour...</div>
        ) : tourGroups[activeGroup]?.length > 0 ? (
          tourGroups[activeGroup].map((item) => (
            <ScheduleTourCard
              key={item.id}
              item={item}
              active={item.id === selectedTourId}
              onClick={() => onTourSelect(item, activeGroup)}
            />
          ))
        ) : (
          <div className="guide-schedule-empty">{TOUR_GROUPS[activeGroup].empty}</div>
        )}
      </div>
    </aside>
  )
}

export default ScheduleTourList
