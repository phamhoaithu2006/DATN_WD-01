import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  getMySupportRequestUnreadCount,
} from '../../services/supportWorkflowApi'

const POLL_INTERVAL = 30000
const MIN_REQUEST_GAP = 5000

function CustomerSupportMenuBadge() {
  const [
    count,
    setCount,
  ] = useState(0)

  const requestRef = useRef(null)
  const lastLoadedAtRef = useRef(0)

  const loadCount = useCallback(
    async ({
      force = false,
    } = {}) => {
      if (
        document.visibilityState !== 'visible'
      ) {
        return null
      }

      const now = Date.now()

      if (
        !force &&
        now -
          lastLoadedAtRef.current <
          MIN_REQUEST_GAP
      ) {
        return count
      }

      if (
        requestRef.current
      ) {
        return requestRef.current
      }

      const request =
        getMySupportRequestUnreadCount()
          .then((total) => {
            const nextCount =
              Math.max(
                0,
                Number(total || 0),
              )

            lastLoadedAtRef.current =
              Date.now()

            setCount(
              Number.isFinite(
                nextCount,
              )
                ? nextCount
                : 0,
            )

            return nextCount
          })
          .catch(() => {
            return null
          })
          .finally(() => {
            requestRef.current =
              null
          })

      requestRef.current =
        request

      return request
    },
    [count],
  )

  useEffect(() => {
    void loadCount({
      force: true,
    })

    const intervalId =
      window.setInterval(
        () => {
          void loadCount()
        },
        POLL_INTERVAL,
      )

    function handleChanged() {
      void loadCount({
        force: true,
      })
    }

    function handleFocus() {
      void loadCount()
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void loadCount({
          force: true,
        })
      }
    }

    window.addEventListener(
      'customer-support-unread-changed',
      handleChanged,
    )

    window.addEventListener(
      'focus',
      handleFocus,
    )

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.clearInterval(
        intervalId,
      )

      window.removeEventListener(
        'customer-support-unread-changed',
        handleChanged,
      )

      window.removeEventListener(
        'focus',
        handleFocus,
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [loadCount])

  if (
    count <= 0
  ) {
    return null
  }

  return (
    <span className="absolute -right-3 top-3 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
      {count > 99
        ? '99+'
        : count}
    </span>
  )
}

export default CustomerSupportMenuBadge