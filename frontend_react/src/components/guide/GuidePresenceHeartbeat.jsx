import { useEffect } from 'react'
import { sendGuidePresenceHeartbeat } from '../../services/guidePresenceApi'

function GuidePresenceHeartbeat() {
  useEffect(() => {
    let disposed = false
    const heartbeat = async () => {
      if (disposed) return
      try { await sendGuidePresenceHeartbeat() } catch { /* Presence must not interrupt guide work. */ }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') void heartbeat() }
    void heartbeat()
    const interval = window.setInterval(onVisible, 5000)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', heartbeat)
    return () => {
      disposed = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', heartbeat)
    }
  }, [])
  return null
}

export default GuidePresenceHeartbeat
