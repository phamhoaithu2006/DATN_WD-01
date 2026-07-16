import { getStageLabel } from './scheduleUtils'

function ScheduleItineraryPanel({ loadingDetail, selectedStage, setSelectedStageId, stages }) {
  return (
    <div className="guide-schedule-panel guide-schedule-itinerary-panel">
      <div className="guide-schedule-panel-head">
        <div>
          <span>Lịch trình tour</span>
          <h3>{selectedStage ? getStageLabel(selectedStage) : 'Chưa có lịch trình'}</h3>
        </div>
      </div>

      {loadingDetail ? (
        <div className="guide-schedule-empty">Đang tải lịch trình...</div>
      ) : stages.length > 0 ? (
        <div className="guide-schedule-itinerary-timeline">
          {stages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              className={stage.id === selectedStage?.id ? 'is-active' : ''}
              onClick={() => setSelectedStageId(stage.id)}
            >
              <span>Ngày {stage.day_number}</span>
              <strong>{stage.title || 'Lịch trình'}</strong>
              <p>{stage.description || stage.content || 'Chưa có mô tả chi tiết cho ngày này.'}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="guide-schedule-empty">Tour này chưa có lịch trình chi tiết.</div>
      )}
    </div>
  )
}

export default ScheduleItineraryPanel
