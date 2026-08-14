/* eslint-disable react-refresh/only-export-components -- dialog actions intentionally share this singleton module */
import { useEffect, useState } from 'react'

let openConfirmDialog = null

export function confirmAction(message, options = {}) {
  return new Promise((resolve) => {
    if (!openConfirmDialog) {
      resolve(false)
      return
    }

    openConfirmDialog({ message, ...options, resolve })
  })
}

export function promptAction(message, options = {}) {
  return new Promise((resolve) => {
    if (!openConfirmDialog) return resolve(null)
    openConfirmDialog({ message, ...options, type: 'prompt', resolve })
  })
}

export default function AppConfirmDialog() {
  const [dialog, setDialog] = useState(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    openConfirmDialog = (nextDialog) => {
      setValue(nextDialog.defaultValue || '')
      setDialog(nextDialog)
    }
    return () => { openConfirmDialog = null }
  }, [])

  if (!dialog) return null

  const close = (result) => {
    dialog.resolve(result)
    setDialog(null)
  }

  return (
    <div className="vg-confirm-overlay" role="presentation" onMouseDown={() => close(false)}>
      <section className="vg-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="vg-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className={`vg-confirm-dialog__icon ${dialog.tone === 'danger' ? 'is-danger' : ''}`} aria-hidden="true">?</div>
        <div>
          <h2 id="vg-confirm-title">{dialog.title || 'Xác nhận thao tác'}</h2>
          <p>{dialog.message}</p>
          {dialog.type === 'prompt' ? <input className="vg-confirm-dialog__input" autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder={dialog.placeholder || ''} /> : null}
        </div>
        <div className="vg-confirm-dialog__actions">
          <button type="button" onClick={() => close(false)}>{dialog.cancelLabel || 'Hủy'}</button>
          <button type="button" className={dialog.tone === 'danger' ? 'is-danger' : ''} onClick={() => close(dialog.type === 'prompt' ? value : true)}>{dialog.confirmLabel || 'Xác nhận'}</button>
        </div>
      </section>
    </div>
  )
}
