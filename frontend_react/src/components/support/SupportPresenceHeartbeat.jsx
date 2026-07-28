import { useEffect, useRef } from 'react'
import { sendSupportPresenceHeartbeat } from '../../services/supportPresenceApi'

const HEARTBEAT_INTERVAL = 15000
const MIN_HEARTBEAT_GAP = 5000

function SupportPresenceHeartbeat() {
  const requestRef = useRef(false)
  const lastHeartbeatRef = useRef(0)

  useEffect(() => {
    let disposed = false

    async function sendHeartbeat({ force = false } = {}) {
      if (
        disposed ||
        document.visibilityState !== 'visible' ||
        requestRef.current
      ) {
        return
      }

      const now = Date.now()

      if (
        !force &&
        now - lastHeartbeatRef.current < MIN_HEARTBEAT_GAP
      ) {
        return
      }

      requestRef.current = true

      try {
        await sendSupportPresenceHeartbeat()

        if (!disposed) {
          lastHeartbeatRef.current = Date.now()
        }
      } catch {
        // Heartbeat chỉ dùng để cập nhật trạng thái online.
      } finally {
        requestRef.current = false
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat({ force: true })
      }
    }

    function handleFocus() {
      void sendHeartbeat()
    }

    void sendHeartbeat({ force: true })

    const intervalId = window.setInterval(() => {
      void sendHeartbeat()
    }, HEARTBEAT_INTERVAL)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      disposed = true
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  return null
}

export default SupportPresenceHeartbeat