export function pickSingleFile({ accept = '' } = {}) {
  if (typeof document === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    const input = document.createElement('input')
    let settled = false

    const cleanup = () => {
      window.removeEventListener('focus', handleWindowFocus)
      input.removeEventListener('change', handleChange)
      input.removeEventListener('cancel', handleCancel)
      input.remove()
    }

    const finish = (file) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(file || null)
    }

    const handleChange = () => finish(input.files?.[0] || null)
    const handleCancel = () => finish(null)
    const handleWindowFocus = () => {
      window.setTimeout(() => {
        if (!input.files?.length) finish(null)
      }, 0)
    }

    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'
    input.addEventListener('change', handleChange, { once: true })
    input.addEventListener('cancel', handleCancel, { once: true })
    window.addEventListener('focus', handleWindowFocus, { once: true })
    document.body.appendChild(input)
    input.click()
  })
}
