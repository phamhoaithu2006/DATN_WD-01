import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import CustomerHistoryPanel from './schedule/CustomerHistoryPanel'
import ScheduleAttendancePanel from './schedule/ScheduleAttendancePanel'
import { useGuideSchedule } from './schedule/useGuideSchedule'
import { mediaUrl } from '../../utils/mediaUrl'
import {
  formatDate,
  getDestination,
  getTourRuntime,
  getTourTitle,
} from './schedule/scheduleUtils'

function formatNumber(value) {
  const number = Number(value || 0)
  return new Intl.NumberFormat('vi-VN').format(Number.isFinite(number) ? number : 0)
}

function getTourImage(item) {
  return mediaUrl(
    item?.tour?.thumbnail?.image_url ||
      item?.tour?.thumbnail_url ||
      item?.tour?.image_url ||
      item?.tour?.image ||
      '',
  )
}

function getStatusLabel(runtime) {
  if (runtime === 'upcoming') return 'Sap dien ra'
  if (runtime === 'ongoing') return 'Dang dien ra'
  if (runtime === 'completed') return 'Hoan thanh'
  return 'Da phan cong'
}

function GuideAttendancePage() {
  const navigate = useNavigate()
  const schedule = useGuideSchedule()

  const selectableTours = useMemo(
    () => [
      ...schedule.tourGroups.ongoing.map((item) => ({ item, groupKey: 'ongoing' })),
      ...schedule.tourGroups.upcoming.map((item) => ({ item, groupKey: 'upcoming' })),
    ],
    [schedule.tourGroups],
  )

  useEffect(() => {
    if (schedule.loadingTours || schedule.selectedTour || selectableTours.length === 0) return

    const firstOngoing = selectableTours.find(({ groupKey }) => groupKey === 'ongoing')
    const nextTour = firstOngoing || selectableTours[0]
    schedule.selectTour(nextTour.item, nextTour.groupKey)
  }, [schedule, selectableTours])

  const selectedTitle = getTourTitle(schedule.selectedTour)
  const selectedImage = getTourImage(schedule.selectedTour)
  const uncheckedCustomers = schedule.customers.filter((customer) => !customer.attendance?.checked_in_at)
  const totalCustomers = schedule.statistics?.total_customers ?? schedule.customers.length
  const checkedCustomers = schedule.statistics?.checked_in ?? 0
  const uncheckedCount = schedule.statistics?.not_checked_in ?? uncheckedCustomers.length

  return (
    <div className="guide-attendance-page attendance-dashboard">
      <section className="guide-schedule-header simple attendance-dashboard-head">
        {selectableTours.length > 1 ? (
          <label className="attendance-tour-select">
            <span>Chon tour</span>
            <select
              value={schedule.selectedTour?.id || ''}
              onChange={(event) => {
                const selected = selectableTours.find(({ item }) => Number(item.id) === Number(event.target.value))
                if (selected) schedule.selectTour(selected.item, selected.groupKey)
              }}
            >
              {selectableTours.map(({ item }) => (
                <option key={item.id} value={item.id}>
                  {getTourTitle(item)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      {(schedule.error || schedule.message) && (
        <div className={schedule.error ? 'guide-profile-alert is-error' : 'guide-profile-alert'}>
          {schedule.error || schedule.message}
        </div>
      )}

      {schedule.selectedTour ? (
        <>
          <section className="attendance-overview-grid">
            <article className="attendance-tour-hero">
              <div className="attendance-tour-cover">
                {selectedImage ? (
                  <img src={selectedImage} alt={selectedTitle} />
                ) : (
                  <span>{selectedTitle.slice(0, 2).toUpperCase()}</span>
                )}
              </div>

              <div className="attendance-tour-info">
                <div>
                  <h2>{selectedTitle}</h2>
                  <span className={`attendance-status-pill status-${getTourRuntime(schedule.selectedTour)}`}>
                    {getStatusLabel(schedule.runtime)}
                  </span>
                </div>
                <p>{formatDate(schedule.selectedTour.departure_date)} - {formatDate(schedule.selectedTour.return_date || schedule.selectedTour.departure_date)}</p>
                <p>{formatNumber(schedule.selectedTour?.booked_slots || 0)} khach - {getDestination(schedule.selectedTour)}</p>
                <button type="button" onClick={() => navigate(`/guide/schedule/${schedule.selectedTour.id}`)}>
                  xem chi tiet &gt;
                </button>
              </div>
            </article>

            <aside className="attendance-unchecked-card">
              <h3>Khach chua diem danh ({uncheckedCount})</h3>
              {uncheckedCustomers.length > 0 ? (
                <ol>
                  {uncheckedCustomers.slice(0, 5).map((customer) => (
                    <li key={customer.id}>{customer.full_name || 'Khach hang'}</li>
                  ))}
                </ol>
              ) : (
                <p>Tat ca khach da diem danh.</p>
              )}
              <button type="button">Xem tat ca &gt;</button>
            </aside>
          </section>

          <section className="attendance-stat-grid">
            <article className="tone-blue">
              <span>tong khach</span>
              <strong>{totalCustomers}</strong>
              <small>100%</small>
            </article>
            <article className="tone-green">
              <span>da diem danh</span>
              <strong>{checkedCustomers}</strong>
              <small>{totalCustomers ? Math.round((checkedCustomers / totalCustomers) * 100) : 0}%</small>
            </article>
            <article className="tone-red">
              <span>chua diem danh</span>
              <strong>{uncheckedCount}</strong>
              <small>{totalCustomers ? Math.round((uncheckedCount / totalCustomers) * 100) : 0}%</small>
            </article>
          </section>

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
        </>
      ) : (
        <div className="guide-schedule-empty large">
          {schedule.loadingTours ? 'Dang tai tour...' : 'Chua co tour can diem danh.'}
        </div>
      )}

      <CustomerHistoryPanel
        detail={schedule.historyDetail}
        loading={schedule.historyLoading}
        onClose={() => schedule.setHistoryDetail(null)}
      />
    </div>
  )
}

export default GuideAttendancePage
