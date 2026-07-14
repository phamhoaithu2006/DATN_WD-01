import CustomerHistoryPanel from './schedule/CustomerHistoryPanel'
import ScheduleAttendancePanel from './schedule/ScheduleAttendancePanel'
import ScheduleTourDetail from './schedule/ScheduleTourDetail'
import ScheduleTourList from './schedule/ScheduleTourList'
import { useGuideSchedule } from './schedule/useGuideSchedule'

function GuideSchedulePage() {
  const schedule = useGuideSchedule()

  return (
    <div className="guide-schedule-page">
      <section className="guide-schedule-header simple">
        <div>
          <span>Lịch làm việc</span>
          <h1>Tour và check-in khách theo lịch trình</h1>
        </div>
      </section>

      {(schedule.error || schedule.message) && (
        <div className={schedule.error ? 'guide-profile-alert is-error' : 'guide-profile-alert'}>
          {schedule.error || schedule.message}
        </div>
      )}

      <div className="guide-schedule-layout">
        <ScheduleTourList
          activeGroup={schedule.activeGroup}
          loadingTours={schedule.loadingTours}
          onGroupChange={schedule.setActiveGroup}
          onTourSelect={schedule.selectTour}
          selectedTourId={schedule.selectedTour?.id}
          totals={schedule.totals}
          tourGroups={schedule.tourGroups}
        />

        <main className="guide-schedule-content">
          {!schedule.selectedTour ? (
            <div className="guide-schedule-empty large">Chọn tour để xem chi tiết.</div>
          ) : (
            <>
              <ScheduleTourDetail
                detail={schedule.detail}
                loadingDetail={schedule.loadingDetail}
                runtime={schedule.runtime}
                selectedTour={schedule.selectedTour}
              />

              <section className="guide-schedule-panels one-column">
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
              </section>
            </>
          )}
        </main>
      </div>

      <CustomerHistoryPanel
        detail={schedule.historyDetail}
        loading={schedule.historyLoading}
        onClose={() => schedule.setHistoryDetail(null)}
      />
    </div>
  )
}

export default GuideSchedulePage
