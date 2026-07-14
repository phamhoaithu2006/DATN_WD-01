import { formatDate, getDestination, getTourTitle, TOUR_GROUPS } from './scheduleUtils'

function ScheduleTourDetail({ detail, loadingDetail, runtime, selectedTour }) {
  return (
    <>
      <section className="guide-schedule-detail-head">
        <div>
          <span className={`guide-schedule-runtime runtime-${runtime}`}>
            {TOUR_GROUPS[runtime]?.label || 'Tour'}
          </span>
          <h2>{loadingDetail ? 'Đang tải...' : getTourTitle(selectedTour)}</h2>
          <p>{getDestination(selectedTour)}</p>
        </div>
        <div className="guide-schedule-date-box">
          <span>Thời gian</span>
          <strong>{formatDate(selectedTour?.departure_date)}</strong>
          <small>Về: {formatDate(selectedTour?.return_date || selectedTour?.departure_date)}</small>
        </div>
      </section>

      <div className="guide-schedule-panel compact">
        <span>Chi tiết tour</span>
        <h3>{detail?.tour?.title || getTourTitle(selectedTour)}</h3>
        <p>{detail?.tour?.summary || 'Chưa có mô tả chi tiết.'}</p>
        <dl>
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
    </>
  )
}

export default ScheduleTourDetail
