import { useEffect, useState } from 'react'

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
      {value ? 'Co' : 'Khong'}
    </span>
  )
}

function CustomerRow({
  busy,
  canOperate,
  customer,
  note,
  onNoteChange,
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
          <strong>{customer.full_name || 'Khach hang'}</strong>
          <span>{customer.booking_code || 'Chua co ma booking'}</span>
          <div>
            <small>{customer.phone || 'Chua co SDT'}</small>
            <small>{customer.email || 'Chua co email'}</small>
          </div>
        </div>
      </div>

      <YesNoBadge value={checkedIn} />
      <YesNoBadge value={checkedOut} />

      <label className="guide-schedule-customer-note">
        <span>Ghi chu</span>
        <textarea
          value={note}
          onChange={(event) => onNoteChange(customer, event.target.value)}
          placeholder="Yeu cau cua khach..."
          rows={2}
        />
      </label>

      {showActions ? (
        <div className="guide-schedule-actions">
          <button type="button" className="is-history" onClick={onViewHistory}>
            Lich su
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
          Lich su
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
  const noteStorageKey = selectedStage?.id
    ? `guide-customer-notes-stage-${selectedStage.id}`
    : 'guide-customer-notes'
  const [notes, setNotes] = useState(() => {
    try {
      if (typeof window === 'undefined') return {}
      return JSON.parse(window.localStorage.getItem(noteStorageKey) || '{}')
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      setNotes(JSON.parse(window.localStorage.getItem(noteStorageKey) || '{}'))
    } catch {
      setNotes({})
    }
  }, [noteStorageKey])

  function handleNoteChange(customer, value) {
    setNotes((current) => {
      const next = { ...current, [customer.id]: value }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(noteStorageKey, JSON.stringify(next))
      }

      return next
    })
  }

  return (
    <div className="guide-schedule-panel">
      <div className="guide-schedule-panel-head">
        <div>
          <span>Lich trinh check-in/check-out</span>
          <h3>{selectedStage ? getStageLabel(selectedStage) : 'Chua co lich trinh'}</h3>
        </div>
        {canOperate ? (
          <button type="button" onClick={createSessionForStage} disabled={!selectedStage}>
            Tao lan diem danh
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
              <strong>Ngay {stage.day_number}</strong>
              <span>{stage.title || 'Lich trinh'}</span>
            </button>
          ))
        ) : (
          <div className="guide-schedule-empty">Tour nay chua co lich trinh.</div>
        )}
      </div>

      <div className="guide-schedule-session-bar">
        <label>
          <span>Lan diem danh</span>
          <select
            value={activeSessionId || ''}
            onChange={(event) => setSelectedSessionId(Number(event.target.value) || null)}
          >
            <option value="">Chua chon lan diem danh</option>
            {stageSessions.map((session, index) => (
              <option key={session.id} value={session.id}>
                {session.name || `Lan ${index + 1}`}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span>Tong khach</span>
          <strong>{statistics?.total_customers ?? customers.length}</strong>
        </div>
        <div>
          <span>Check-in Co</span>
          <strong>{statistics?.checked_in ?? 0}</strong>
        </div>
        <div>
          <span>Check-out Co</span>
          <strong>{statistics?.checked_out ?? 0}</strong>
        </div>
      </div>

      {runtime === 'upcoming' ? (
        <p className="guide-schedule-note">
          Tour sap di chi xem danh sach khach hang. Toi ngay khoi hanh moi check-in/check-out.
        </p>
      ) : null}

      {runtime === 'completed' ? (
        <p className="guide-schedule-note">
          Tour da di chi xem lich su check-in/check-out khach hang.
        </p>
      ) : null}

      <div className="guide-schedule-customer-header">
        <span>Khach hang</span>
        <span>Check-in</span>
        <span>Check-out</span>
        <span>Ghi chu</span>
        <span>Thao tac</span>
      </div>

      <div className="guide-schedule-customers">
        {customers.length > 0 ? (
          customers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              note={notes[customer.id] || ''}
              onNoteChange={handleNoteChange}
              canOperate={canOperate && Boolean(activeSessionId)}
              showActions={runtime !== 'completed'}
              busy={busyCustomerId === customer.id}
              onCheckIn={() => handleAttendanceAction(customer, 'check-in')}
              onCheckOut={() => handleAttendanceAction(customer, 'check-out')}
              onViewHistory={() => openCustomerHistory(customer)}
            />
          ))
        ) : (
          <div className="guide-schedule-empty">Chua co khach hang trong tour nay.</div>
        )}
      </div>
    </div>
  )
}

export default ScheduleAttendancePanel
