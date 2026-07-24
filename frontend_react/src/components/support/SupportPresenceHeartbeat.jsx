import { useEffect } from 'react'
import { sendSupportPresenceHeartbeat } from '../../services/supportPresenceApi'

function SupportPresenceHeartbeat() {
  useEffect(() => {
    let isUnmounted = false

    async function sendHeartbeat() {
      if (isUnmounted) {
        return
      }

      try {
        await sendSupportPresenceHeartbeat()
      } catch (error) {
        /*
         * Không hiển thị lỗi ra giao diện vì heartbeat
         * chỉ dùng để cập nhật trạng thái online.
         */
        console.warn(
          'Không gửi được heartbeat NVHT:',
          error?.response?.data?.message ||
            error?.message,
        )
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void sendHeartbeat()
      }
    }

    function handleWindowFocus() {
      void sendHeartbeat()
    }

    /*
     * Gửi ngay khi NVHT mở trang.
     */
    void sendHeartbeat()

    /*
     * Gửi lại mỗi 45 giây.
     */
    const intervalId =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          void sendHeartbeat()
        }
      }, 45000)

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    window.addEventListener(
      'focus',
      handleWindowFocus,
    )

    return () => {
      isUnmounted = true

      window.clearInterval(
        intervalId,
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )

      window.removeEventListener(
        'focus',
        handleWindowFocus,
      )
    }
  }, [])

  return null
}

export default SupportPresenceHeartbeat