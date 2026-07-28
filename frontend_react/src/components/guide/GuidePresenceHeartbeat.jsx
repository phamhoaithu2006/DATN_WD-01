import {
  useEffect,
  useRef,
} from 'react'
import {
  sendGuidePresenceHeartbeat,
} from '../../services/guidePresenceApi'

const HEARTBEAT_INTERVAL = 15000
const MIN_HEARTBEAT_GAP = 5000

function GuidePresenceHeartbeat() {
  const requestInFlightRef = useRef(false)
  const lastSentAtRef = useRef(0)

  useEffect(() => {
    let disposed = false

    async function heartbeat({
      force = false,
    } = {}) {
      if (
        disposed ||
        document.visibilityState !== 'visible' ||
        requestInFlightRef.current
      ) {
        return
      }

      const now = Date.now()

      if (
        !force &&
        now -
          lastSentAtRef.current <
          MIN_HEARTBEAT_GAP
      ) {
        return
      }

      requestInFlightRef.current = true

      try {
        await sendGuidePresenceHeartbeat()

        if (!disposed) {
          lastSentAtRef.current =
            Date.now()
        }
      } catch {
        // Presence không được làm gián đoạn công việc của hướng dẫn viên.
      } finally {
        requestInFlightRef.current = false
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void heartbeat({
          force: true,
        })
      }
    }

    function handleFocus() {
      void heartbeat()
    }

    /*
     * Gửi heartbeat ngay khi component được gắn,
     * nhưng chỉ khi tab đang hiển thị.
     */
    void heartbeat({
      force: true,
    })

    /*
     * Gửi heartbeat mỗi 15 giây.
     * Khi tab bị ẩn, request sẽ được bỏ qua.
     */
    const intervalId =
      window.setInterval(
        () => {
          void heartbeat()
        },
        HEARTBEAT_INTERVAL,
      )

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    window.addEventListener(
      'focus',
      handleFocus,
    )

    return () => {
      disposed = true

      window.clearInterval(
        intervalId,
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )

      window.removeEventListener(
        'focus',
        handleFocus,
      )
    }
  }, [])

  return null
}

export default GuidePresenceHeartbeat