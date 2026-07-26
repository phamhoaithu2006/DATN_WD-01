import { useEffect } from "react";
import { sendCustomerPresenceHeartbeat } from "../../services/customerPresenceApi";

function CustomerPresenceHeartbeat() {
  useEffect(() => {
    let disposed = false;

    async function heartbeat() {
      if (disposed) return;
      try {
        await sendCustomerPresenceHeartbeat();
      } catch {
        // Heartbeat không được làm gián đoạn trải nghiệm của khách hàng.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void heartbeat();
    }

    void heartbeat();
    const intervalId = window.setInterval(handleVisibilityChange, 5000);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", heartbeat);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", heartbeat);
    };
  }, []);

  return null;
}

export default CustomerPresenceHeartbeat;
