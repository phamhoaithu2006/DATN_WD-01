import { useEffect, useRef } from "react";
import { sendCustomerPresenceHeartbeat } from "../../services/customerPresenceApi";

const HEARTBEAT_INTERVAL = 15000;
const MIN_HEARTBEAT_GAP = 5000;

function CustomerPresenceHeartbeat() {
  const inFlightRef = useRef(false);
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    let disposed = false;

    async function heartbeat({ force = false } = {}) {
      if (
        disposed ||
        document.visibilityState !== "visible" ||
        inFlightRef.current
      ) {
        return;
      }

      const now = Date.now();

      if (
        !force &&
        now - lastSentAtRef.current < MIN_HEARTBEAT_GAP
      ) {
        return;
      }

      inFlightRef.current = true;

      try {
        await sendCustomerPresenceHeartbeat();

        if (!disposed) {
          lastSentAtRef.current = Date.now();
        }
      } catch {
        // Heartbeat không được làm gián đoạn trải nghiệm của khách hàng.
      } finally {
        inFlightRef.current = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void heartbeat({ force: true });
      }
    }

    function handleFocus() {
      void heartbeat();
    }

    /*
     * Gửi heartbeat ngay khi component được gắn,
     * nhưng chỉ khi tab đang hiển thị.
     */
    void heartbeat({ force: true });

    /*
     * Kiểm tra trạng thái online mỗi 15 giây thay vì 5 giây.
     * Khi tab bị ẩn, heartbeat sẽ không được gửi.
     */
    const intervalId = window.setInterval(() => {
      void heartbeat();
    }, HEARTBEAT_INTERVAL);

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
    window.addEventListener("focus", handleFocus);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return null;
}

export default CustomerPresenceHeartbeat;