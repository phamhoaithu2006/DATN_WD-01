import Icon from '../../customer/Icon'

const FIELD_LABELS = {
  name: 'Tên',
  level_name: 'Cấp độ',
  issued_by: 'Tổ chức cấp',
}

function getChanges(event) {
  const before = event.metadata?.before
  const after = event.metadata?.after

  if (!before || !after) return []

  return Object.keys(after)
    .filter((field) => FIELD_LABELS[field] && String(before[field] ?? '') !== String(after[field] ?? ''))
    .map((field) => ({
      field,
      label: FIELD_LABELS[field],
      before: before[field] || 'Trống',
      after: after[field] || 'Trống',
    }))
}

function CatalogToolbar({ entityLabel, events, search, onSearchChange, timelineOpen, onTimelineToggle }) {
  const formatTime = (value) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

  return <>
    <div className="catalog-toolbar">
      <label className="catalog-search"><Icon name="search" size={17} /><input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={`Tìm ${entityLabel}...`} /></label>
      <button className="catalog-timeline-button" type="button" onClick={onTimelineToggle}><Icon name="clock" size={16} />Timeline <span>{events.length}</span></button>
    </div>
    {timelineOpen ? <div className="catalog-timeline-backdrop" role="presentation" onMouseDown={onTimelineToggle}>
      <section className="catalog-timeline-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><small>TIMELINE</small><h2>Lịch sử {entityLabel}</h2></div><button type="button" onClick={onTimelineToggle} aria-label="Đóng">&times;</button></header>
        {events.length ? <div className="catalog-timeline-list">{events.map((event) => {
          const changes = getChanges(event)
          return <article key={event.id}><i aria-hidden="true" /><div><strong>{event.description || event.action}</strong><p>{event.actor?.name || 'Quản trị viên'} · {event.tour_title}</p>{changes.length ? <div className="catalog-timeline-changes">{changes.map((change) => <div key={change.field}><b>{change.label}</b><span>{change.before}</span><em aria-hidden="true">→</em><span className="after">{change.after}</span></div>)}</div> : null}<time>{formatTime(event.created_at)}</time></div></article>
        })}</div> : <p className="catalog-timeline-empty">Chưa có thao tác nào được ghi nhận.</p>}
      </section>
    </div> : null}
  </>
}

export default CatalogToolbar
