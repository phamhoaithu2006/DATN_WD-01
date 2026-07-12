import AdminNotificationBell from './notifications/AdminNotificationBell'

function renderCrumb(crumb, index) {
  if (crumb == null) return null

  if (typeof crumb === 'string') {
    return <span key={`${crumb}-${index}`}>{crumb}</span>
  }

  if (crumb.href) {
    return (
      <a key={`${crumb.label}-${index}`} href={crumb.href}>
        {crumb.label}
      </a>
    )
  }

  return <span key={`${crumb.label || index}-${index}`}>{crumb.label}</span>
}

function AdminPageHeader({
  breadcrumb = ['ViVuGo'],
  title,
  description,
  actions = null,
  className = '',
  showNotificationBell = true,
}) {
  const items = (Array.isArray(breadcrumb) ? breadcrumb : [breadcrumb]).filter(
    (item) => item != null && String(item).trim() !== ''
  )

  const classes = ['admin-page-header', className].filter(Boolean).join(' ')
  const hasRightActions = showNotificationBell || Boolean(actions)

  return (
    <section className={classes}>
      <div className="admin-page-breadcrumb">
        {items.map((item, index) => (
          <span className="admin-page-breadcrumb-item" key={index}>
            {index > 0 ? (
              <span className="admin-page-breadcrumb-separator">/</span>
            ) : null}

            {renderCrumb(item, index)}
          </span>
        ))}
      </div>

      <div className="admin-page-header-row">
        <div className="admin-page-header-content">
          {title ? <h1>{title}</h1> : null}
          {description ? <p>{description}</p> : null}
        </div>

        {hasRightActions ? (
          <div className="admin-page-header-actions">
            {showNotificationBell ? <AdminNotificationBell /> : null}
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default AdminPageHeader