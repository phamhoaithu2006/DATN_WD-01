import { Navigate, useNavigate, useParams } from 'react-router-dom'

import CustomerHistoryPanel from './schedule/CustomerHistoryPanel'
import CustomerNotesPanel from './schedule/CustomerNotesPanel'
import ScheduleAttendancePanel from './schedule/ScheduleAttendancePanel'
import ScheduleItineraryPanel from './schedule/ScheduleItineraryPanel'
import ScheduleTourDetail from './schedule/ScheduleTourDetail'
import { useGuideSchedule } from './schedule/useGuideSchedule'
import { mediaUrl } from '../../utils/mediaUrl'
import {
  formatDate,
  getDestination,
  getTourRuntime,
  getTourTitle,
  TOUR_GROUPS,
} from './schedule/scheduleUtils'

const TOUR_ACTIONS = [
  {
    key: 'itinerary',
    label: 'Xem lịch trình',
    hint: 'Lịch trình tour',
    title: 'Lịch trình tour',
  },
  {
    key: 'attendance',
    label: 'Check-in khách hàng',
    hint: 'Điểm danh theo ngày',
    title: 'Check-in khách hàng',
  },
  {
    key: 'notes',
    label: 'Ghi chú khách hàng',
    hint: 'Yêu cầu riêng',
    title: 'Ghi chú khách hàng',
  },
]

function getTourImage(item) {
  return mediaUrl(
    item?.tour?.thumbnail?.image_url ||
      item?.tour?.thumbnail_url ||
      item?.tour?.image_url ||
      item?.tour?.image ||
      '',
  )
}

function TourListCard({ item, onClick }) {
  const runtime = getTourRuntime(item)
  const image = getTourImage(item)
  const title = getTourTitle(item)

  return (
    <button
      type="button"
      className={`guide-my-tour-card state-${runtime}`}
      onClick={onClick}
    >
      <div className="guide-my-tour-thumb">
        {image ? <img src={image} alt={title} /> : <span>{title.slice(0, 2).toUpperCase()}</span>}
      </div>

      <div className="guide-my-tour-main">
        <div className="guide-my-tour-head">
          <div>
            <strong>{title}</strong>
            <em>
              {formatDate(item.departure_date)} · {formatDate(item.return_date || item.departure_date)}
            </em>
          </div>

          <span className={`guide-schedule-runtime runtime-${runtime}`}>
            {TOUR_GROUPS[runtime]?.label || 'Tour'}
          </span>
        </div>

        <small className="guide-my-tour-destination">{getDestination(item)}</small>
      </div>
    </button>
  )
}

function GuideSchedulePage() {
  const { tourId, feature } = useParams()
  const navigate = useNavigate()
  const schedule = useGuideSchedule(tourId ? Number(tourId) : null)
  const activeAction = TOUR_ACTIONS.find((action) => action.key === feature) || null
  const visibleTours = [...schedule.tourGroups.ongoing, ...schedule.tourGroups.upcoming]

  if (feature && !activeAction) {
    return <Navigate to={tourId ? `/guide/schedule/${tourId}` : '/guide/schedule'} replace />
  }

  function renderFeaturePage() {
    if (!activeAction) return null

    if (activeAction.key === 'itinerary') {
      return (
        <ScheduleItineraryPanel
          loadingDetail={schedule.loadingDetail}
          selectedStage={schedule.selectedStage}
          setSelectedStageId={schedule.setSelectedStageId}
          stages={schedule.stages}
        />
      )
    }

    if (activeAction.key === 'attendance') {
      return (
        <ScheduleAttendancePanel
          activeSessionId={schedule.activeSessionId}
          busyCustomerId={schedule.busyCustomerId}
          canOperate={schedule.canOperate}
          createSessionForStage={schedule.createSessionForStage}
          customers={schedule.customers}
          handleAttendanceAction={schedule.handleAttendanceAction}
          openCustomerHistory={schedule.openCustomerHistory}
          runtime={schedule.runtime}
          selectedStage={schedule.selectedStage}
          setSelectedSessionId={schedule.setSelectedSessionId}
          setSelectedStageId={schedule.setSelectedStageId}
          stageSessions={schedule.stageSessions}
          stages={schedule.stages}
          statistics={schedule.statistics}
        />
      )
    }

    return (
      <CustomerNotesPanel
        customers={schedule.customers}
        openCustomerHistory={schedule.openCustomerHistory}
      />
    )
  }

  return (
    <div className="guide-schedule-page">
      <section className="guide-schedule-header simple">
        <div>
          <span>Tour của tôi</span>
          <h1>
            {!tourId
              ? 'Các tour sẽ dẫn'
              : activeAction
                ? activeAction.title
                : 'Chi tiết tour phụ trách'}
          </h1>
        </div>

        {tourId ? (
          <button
            type="button"
            className="guide-schedule-back-btn"
            onClick={() => navigate('/guide/schedule')}
          >
            Quay lại danh sách tour
          </button>
        ) : null}
      </section>

      {(schedule.error || schedule.message) && (
        <div className={schedule.error ? 'guide-profile-alert is-error' : 'guide-profile-alert'}>
          {schedule.error || schedule.message}
        </div>
      )}

      {!tourId ? (
        <section className="guide-my-tour-list-page">
          <div className="guide-my-tour-list-head">
            <div>
              <span>{visibleTours.length} tour</span>
              <h2>Danh sách tour được phân công</h2>
            </div>
          </div>

          {schedule.loadingTours ? (
            <div className="guide-schedule-empty large">Đang tải tour...</div>
          ) : visibleTours.length > 0 ? (
            <div className="guide-my-tour-grid">
              {visibleTours.map((item) => (
                <TourListCard
                  key={item.id}
                  item={item}
                  onClick={() => navigate(`/guide/schedule/${item.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="guide-schedule-empty large">Chưa có tour sắp dẫn.</div>
          )}
        </section>
      ) : (
        <main className="guide-schedule-content">
          {!schedule.selectedTour && !schedule.loadingTours ? (
            <div className="guide-schedule-empty large">Không tìm thấy tour được phân công.</div>
          ) : (
            <>
              <ScheduleTourDetail
                detail={schedule.detail}
                loadingDetail={schedule.loadingDetail}
                runtime={schedule.runtime}
                selectedTour={schedule.selectedTour}
              />

              {!activeAction ? (
                <div className="guide-schedule-action-tabs" aria-label="Chức năng trong tour">
                  {TOUR_ACTIONS.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => navigate(`/guide/schedule/${tourId}/${action.key}`)}
                    >
                      <strong>{action.label}</strong>
                      <span>{action.hint}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="guide-schedule-function-head">
                  <div>
                    <span>Chức năng</span>
                    <h2>{activeAction.label}</h2>
                  </div>
                  <button type="button" onClick={() => navigate(`/guide/schedule/${tourId}`)}>
                    Đổi chức năng
                  </button>
                </div>
              )}

              <section className="guide-schedule-panels one-column">
                {activeAction ? renderFeaturePage() : (
                  <div className="guide-schedule-feature-empty">
                    Chọn một chức năng để thao tác với tour này.
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      )}

      <CustomerHistoryPanel
        detail={schedule.historyDetail}
        loading={schedule.historyLoading}
        onClose={() => schedule.setHistoryDetail(null)}
      />
    </div>
  )
}

export default GuideSchedulePage
