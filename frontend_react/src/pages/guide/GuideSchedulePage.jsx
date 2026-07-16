import { Navigate, useNavigate, useParams } from 'react-router-dom'

import CustomerHistoryPanel from './schedule/CustomerHistoryPanel'
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

function getTourImage(item) {
  return mediaUrl(
    item?.tour?.thumbnail?.image_url ||
      item?.tour?.thumbnail_url ||
      item?.tour?.image_url ||
      item?.tour?.image ||
      '',
  )
}

function TourListCard({ item, mode, onClick }) {
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
              {formatDate(item.departure_date)} - {formatDate(item.return_date || item.departure_date)}
            </em>
          </div>

          <span className={`guide-schedule-runtime runtime-${runtime}`}>
            {mode === 'attendance' ? 'Điểm danh' : TOUR_GROUPS[runtime]?.label || 'Tour'}
          </span>
        </div>

        <small className="guide-my-tour-destination">{getDestination(item)}</small>
      </div>
    </button>
  )
}

function CustomerNoteModal({
  customer,
  noteSaving,
  noteValue,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!customer) return null

  return (
    <div className="guide-note-modal-backdrop" role="presentation" onClick={onClose}>
      <form className="guide-note-modal" onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="guide-note-modal-close" onClick={onClose} disabled={noteSaving}>
          ×
        </button>
        <div className="guide-note-modal-head">
          <span>Ghi chú khách hàng</span>
          <h3>{customer.full_name || 'Khách hàng'}</h3>
          <p>{customer.booking_code || 'Chưa có mã booking'}</p>
        </div>

        <label className="guide-note-modal-field">
          <span>Nội dung cần lưu ý</span>
          <textarea
            value={noteValue}
            onChange={(event) => onChange(event.target.value)}
            rows={6}
            maxLength={1000}
            disabled={noteSaving}
            placeholder="Ví dụ: khách ăn chay, say xe, cần hỗ trợ riêng, yêu cầu giờ đón..."
          />
        </label>

        <div className="guide-note-modal-actions">
          <button type="button" onClick={onClose} disabled={noteSaving}>
            Hủy
          </button>
          <button type="submit" disabled={noteSaving}>
            {noteSaving ? 'Đang lưu...' : 'Lưu ghi chú'}
          </button>
        </div>
      </form>
    </div>
  )
}

function GuideSchedulePage({ mode = 'tours' }) {
  const { tourId, feature } = useParams()
  const navigate = useNavigate()
  const schedule = useGuideSchedule(tourId ? Number(tourId) : null)
  const isAttendanceMode = mode === 'attendance'
  const basePath = isAttendanceMode ? '/guide/attendance' : '/guide/schedule'
  const visibleTours = isAttendanceMode
    ? [...schedule.tourGroups.ongoing, ...schedule.tourGroups.upcoming]
    : [...schedule.tourGroups.ongoing, ...schedule.tourGroups.upcoming, ...schedule.tourGroups.completed]

  if (!isAttendanceMode && feature && feature !== 'itinerary') {
    return <Navigate to={tourId ? `/guide/schedule/${tourId}` : '/guide/schedule'} replace />
  }

  function renderMainPanel() {
    if (isAttendanceMode) {
      return (
        <ScheduleAttendancePanel
          activeSessionId={schedule.activeSessionId}
          busyCustomerId={schedule.busyCustomerId}
          canOperate={schedule.canOperate}
          createSessionForStage={schedule.createSessionForStage}
          customers={schedule.customers}
          handleAttendanceAction={schedule.handleAttendanceAction}
          openCustomerHistory={schedule.openCustomerHistory}
          openCustomerNote={schedule.openCustomerNote}
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
      <ScheduleItineraryPanel
        loadingDetail={schedule.loadingDetail}
        selectedStage={schedule.selectedStage}
        setSelectedStageId={schedule.setSelectedStageId}
        stages={schedule.stages}
      />
    )
  }

  return (
    <div className="guide-schedule-page">
      <section className="guide-schedule-header simple">
        <div>
          <span>{isAttendanceMode ? 'Điểm danh' : 'Tour của tôi'}</span>
          <h1>
            {!tourId
              ? isAttendanceMode
                ? 'Chọn tour để điểm danh'
                : 'Danh sách tour của tôi'
              : isAttendanceMode
                ? 'Điểm danh khách hàng'
                : 'Chi tiết tour phụ trách'}
          </h1>
        </div>

        {tourId ? (
          <button
            type="button"
            className="guide-schedule-back-btn"
            onClick={() => navigate(basePath)}
          >
            Quay lại danh sách
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
              <h2>{isAttendanceMode ? 'Tour có thể điểm danh' : 'Tour được phân công'}</h2>
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
                  mode={mode}
                  onClick={() => navigate(`${basePath}/${item.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="guide-schedule-empty large">
              {isAttendanceMode ? 'Chưa có tour để điểm danh.' : 'Chưa có tour được phân công.'}
            </div>
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

              <section className="guide-schedule-panels one-column">
                {renderMainPanel()}
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

      {isAttendanceMode ? (
        <CustomerNoteModal
          customer={schedule.noteTarget}
          noteSaving={schedule.noteSaving}
          noteValue={schedule.noteValue}
          onChange={schedule.setNoteValue}
          onClose={schedule.closeCustomerNote}
          onSubmit={schedule.saveCustomerNote}
        />
      ) : null}
    </div>
  )
}

export default GuideSchedulePage
