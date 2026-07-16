import { useState } from 'react'

import { formatDate, getDestination, getTourTitle, TOUR_GROUPS } from './scheduleUtils'

function getTourNote(detail, selectedTour) {
  return (
    detail?.tour?.note ||
    detail?.tour?.special_note ||
    detail?.note ||
    selectedTour?.note ||
    selectedTour?.special_note ||
    ''
  )
}

function ScheduleTourDetail({ detail, loadingDetail, runtime, selectedTour }) {
  const [showDetail, setShowDetail] = useState(false)
  const duration = `${formatDate(selectedTour?.departure_date)} - ${formatDate(
    selectedTour?.return_date || selectedTour?.departure_date,
  )}`

  return (
    <section className={`guide-schedule-panel compact guide-schedule-tour-detail-card state-${runtime}`}>
      <div className="guide-schedule-tour-detail-head">
        <div className="guide-schedule-tour-detail-summary-head">
          <span className={`guide-schedule-runtime runtime-${runtime}`}>
            {TOUR_GROUPS[runtime]?.label || 'Tour'}
          </span>
          <h3>{loadingDetail ? 'Đang tải...' : getTourTitle(selectedTour)}</h3>
          <p>{getDestination(selectedTour)}</p>
        </div>

        <button
          type="button"
          className={`guide-schedule-tour-detail-action ${showDetail ? 'is-open' : ''}`}
          onClick={() => setShowDetail((current) => !current)}
        >
          <span>{showDetail ? 'Ẩn chi tiết tour' : 'Chi tiết tour'}</span>
          <strong>{duration}</strong>
        </button>
      </div>

      {showDetail ? (
        <div className="guide-schedule-tour-detail-body">
          <div className="guide-schedule-tour-detail-summary">
            <span>Chi tiết tour</span>
            <h4>{detail?.tour?.title || getTourTitle(selectedTour)}</h4>
            <p>{detail?.tour?.summary || 'Chưa có mô tả chi tiết.'}</p>
          </div>

          <div className="guide-schedule-tour-detail-note">
            <span>Ghi chú</span>
            <div className="guide-schedule-tour-detail-note-box">
              <p>{getTourNote(detail, selectedTour) || 'Không có ghi chú đặc biệt.'}</p>
            </div>
          </div>

          <dl className="guide-schedule-tour-detail-meta">
            <div>
              <dt>Loại tour</dt>
              <dd>{detail?.tour?.category?.name || 'Tour du lịch'}</dd>
            </div>
            <div>
              <dt>Số khách</dt>
              <dd>
                {selectedTour?.booked_slots || 0}/{selectedTour?.total_slots || 0}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  )
}

export default ScheduleTourDetail
