import { getStageLabel } from './scheduleUtils'

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
  const customerNote =
    customer.health_note ||
    customer.special_request ||
    customer.customer_note ||
    customer.attendance?.note ||
    ''

  return (
    <article className="guide-schedule-customer-row compact-table">
      <button type="button" className="guide-schedule-customer-main" onClick={onViewHistory}>
        <div>
          <strong>{customer.full_name || 'Khách hàng'}</strong>
          <span>{customer.booking_code || 'Chưa có mã booking'}</span>
        </div>
        <div>
          <small>{customer.phone || 'Chưa có SĐT'}</small>
          <small>{customer.email || 'Chưa có email'}</small>
          {customerNote ? <em>{customerNote}</em> : null}
        </div>
      </button>

      <YesNoBadge value={checkedIn} />
      <YesNoBadge value={checkedOut} />

      {showActions ? (
        <div className="guide-schedule-actions">
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
  const isUpcoming = runtime === 'upcoming'
  const isCompleted = runtime === 'completed'

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

      {isUpcoming ? (
        <p className="guide-schedule-note">
          Tour sắp đi chỉ có thể xem lịch trình. Điểm danh khách hàng sẽ mở khi tour đang khởi hành.
        </p>
      ) : null}

      {!isUpcoming ? (
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
      ) : null}

      {isCompleted ? (
        <p className="guide-schedule-note">
          Tour đã đi chỉ xem lịch sử check-in/check-out khách hàng.
        </p>
      ) : null}

      {!isUpcoming ? (
      <>
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
              showActions={runtime === 'ongoing'}
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
      </>
      ) : null}
    </div>
  )
}

export default ScheduleAttendancePanel
