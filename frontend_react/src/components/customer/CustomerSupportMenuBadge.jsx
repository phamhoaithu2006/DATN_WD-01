import {
  useEffect,
  useState,
} from 'react'

import {
  getMySupportRequestUnreadCount,
} from '../../services/supportWorkflowApi'

function CustomerSupportMenuBadge() {
  const [
    count,
    setCount,
  ] = useState(0)

  async function loadCount() {
    try {
      const total =
        await getMySupportRequestUnreadCount()

      setCount(
        Number(
          total || 0,
        ),
      )
    } catch {
      setCount(0)
    }
  }

  useEffect(() => {
    void loadCount()

    const intervalId =
      window.setInterval(
        () => {
          void loadCount()
        },
        30000,
      )

    function handleChanged() {
      void loadCount()
    }

    window.addEventListener(
      'customer-support-unread-changed',
      handleChanged,
    )

    window.addEventListener(
      'focus',
      handleChanged,
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
        handleChanged,
      )
    }
  }, [])

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