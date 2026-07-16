import { getStageLabel } from './scheduleUtils'

function customerInitials(name) {
  return String(name || 'KH')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function YesNoBadge({ value }) {
  return (
    <span className={value ? 'guide-schedule-yesno is-yes' : 'guide-schedule-yesno is-no'}>
      {value ? 'Có' : 'Không'}
    </span>
  )
}

function CustomerRow({
  busy,
  canOperate,
  customer,
  onCheckIn,
  onCheckOut,
  onViewHistory,
  showActions,
}) {
  const checkedIn = Boolean(customer.attendance?.checked_in_at)
  const checkedOut = Boolean(customer.attendance?.checked_out_at)

  return (
    <article className="guide-schedule-customer-row compact-table">
      <div className="guide-schedule-customer-main">
        <div className="guide-schedule-customer-avatar">
          {customerInitials(customer.full_name)}
        </div>

        <div className="guide-schedule-customer-copy">
          <strong>{customer.full_name || 'Khách hàng'}</strong>
          <span>{customer.booking_code || 'Chưa có mã booking'}</span>
          <div>
            <small>{customer.phone || 'Chưa có SĐT'}</small>
            <small>{customer.email || 'Chưa có email'}</small>
          </div>
        </div>
      </div>

      <YesNoBadge value={checkedIn} />
      <YesNoBadge value={checkedOut} />

      {showActions ? (
        <div className="guide-schedule-actions">
          <button type="button" className="is-history" onClick={onViewHistory}>
            Lịch sử
          </button>
          <button type="button" disabled={!canOperate || checkedIn || busy} onClick={onCheckIn}>
            Check-in
          </button>
          <button
            type="button"
            disabled={!canOperate || !checkedIn || checkedOut || busy}
            onClick={onCheckOut}
          >
            Check-out
          </button>
        </div>
      ) : (
        <button type="button" className="guide-schedule-secondary-btn" onClick={onViewHistory}>
          Lịch sử
        </button>
      )}
    </article>
  )
}

function ScheduleAttendancePanel({
  activeSessionId,
  busyCustomerId,
  canOperate,
  createSessionForStage,
  customers,
  handleAttendanceAction,
  openCustomerHistory,
  runtime,
  selectedStage,
  setSelectedSessionId,
  setSelectedStageId,
  stageSessions,
  stages,
  statistics,
}) {
  return (
    <div className="guide-schedule-panel">
      <div className="guide-schedule-panel-head">
        <div>
          <span>Lịch trình check-in/check-out</span>
          <h3>{selectedStage ? getStageLabel(selectedStage) : 'Chưa có lịch trình'}</h3>
        </div>
        {canOperate ? (
          <button type="button" onClick={createSessionForStage} disabled={!selectedStage}>
            Tạo lần điểm danh
          </button>
        ) : null}
      </div>

      <div className="guide-schedule-stage-tabs">
        {stages.length > 0 ? (
          stages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              className={stage.id === selectedStage?.id ? 'is-active' : ''}
              onClick={() => setSelectedStageId(stage.id)}
            >
              <strong>Ngày {stage.day_number}</strong>
              <span>{stage.title || 'Lịch trình'}</span>
            </button>
          ))
        ) : (
          <div className="guide-schedule-empty">Tour này chưa có lịch trình.</div>
        )}
      </div>

      <div className="guide-schedule-session-bar">
        <label>
          <span>Lần điểm danh</span>
          <select
            value={activeSessionId || ''}
            onChange={(event) => setSelectedSessionId(Number(event.target.value) || null)}
          >
            <option value="">Chưa chọn lần điểm danh</option>
            {stageSessions.map((session, index) => (
              <option key={session.id} value={session.id}>
                {session.name || `Lần ${index + 1}`}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span>Tổng khách</span>
          <strong>{statistics?.total_customers ?? customers.length}</strong>
        </div>
        <div>
          <span>Check-in Có</span>
          <strong>{statistics?.checked_in ?? 0}</strong>
        </div>
        <div>
          <span>Check-out Có</span>
          <strong>{statistics?.checked_out ?? 0}</strong>
        </div>
      </div>

      {runtime === 'upcoming' ? (
        <p className="guide-schedule-note">
          Tour sắp đi chỉ xem chi tiết tour và danh sách khách hàng. Tới ngày khởi hành mới check-in/check-out.
        </p>
      ) : null}

      {runtime === 'completed' ? (
        <p className="guide-schedule-note">
          Tour đã đi chỉ xem lịch sử check-in/check-out khách hàng.
        </p>
      ) : null}

      <div className="guide-schedule-customer-header">
        <span>Khách hàng</span>
        <span>Check-in</span>
        <span>Check-out</span>
        <span>Thao tác</span>
      </div>

      <div className="guide-schedule-customers">
        {customers.length > 0 ? (
          customers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              canOperate={canOperate && Boolean(activeSessionId)}
              showActions={runtime !== 'completed'}
              busy={busyCustomerId === customer.id}
              onCheckIn={() => handleAttendanceAction(customer, 'check-in')}
              onCheckOut={() => handleAttendanceAction(customer, 'check-out')}
              onViewHistory={() => openCustomerHistory(customer)}
            />
          ))
        ) : (
          <div className="guide-schedule-empty">Chưa có khách hàng trong tour này.</div>
        )}
      </div>
    </div>
  )
}

export default ScheduleAttendancePanel
