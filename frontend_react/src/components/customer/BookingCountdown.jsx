import {
  useEffect,
  useRef,
  useState,
} from "react";
import Icon from "./Icon";

function getRemainingTime(expiresAt) {
  if (!expiresAt) return 0;

  const targetTime = new Date(expiresAt).getTime();

  if (Number.isNaN(targetTime)) {
    return 0;
  }

  return Math.max(
    0,
    targetTime - Date.now(),
  );
}

export default function BookingCountdown({
  expiresAt,
  onExpire,
  compact = false,
}) {
  const [timeLeft, setTimeLeft] = useState(
    () => getRemainingTime(expiresAt),
  );

  const onExpireRef = useRef(onExpire);
  const hasExpiredRef = useRef(false);

  /*
   * Luôn giữ callback mới nhất nhưng không làm
   * interval bị tạo lại khi component cha render.
   */
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    hasExpiredRef.current = false;

    if (!expiresAt) {
      setTimeLeft(0);
      return undefined;
    }

    const targetTime =
      new Date(expiresAt).getTime();

    if (Number.isNaN(targetTime)) {
      setTimeLeft(0);
      return undefined;
    }

    let intervalId = null;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        targetTime - Date.now(),
      );

      setTimeLeft(remaining);

      if (
        remaining <= 0 &&
        !hasExpiredRef.current
      ) {
        hasExpiredRef.current = true;

        if (intervalId) {
          window.clearInterval(intervalId);
        }

        onExpireRef.current?.();
      }
    };

    updateTimer();

    /*
     * Chỉ tạo interval nếu thời gian vẫn còn.
     */
    if (targetTime > Date.now()) {
      intervalId = window.setInterval(
        updateTimer,
        1000,
      );
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [expiresAt]);

  if (timeLeft <= 0) {
    return (
      <div
        className={[
          "vg-countdown-box",
          "is-expired",
          compact ? "is-compact" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Icon
          name="alertCircle"
          size={compact ? 13 : 15}
        />

        <span>Hết hạn giữ chỗ</span>
      </div>
    );
  }

  /*
   * Dùng Math.ceil để tránh hiển thị 00:00
   * khi thực tế vẫn còn vài mili giây.
   */
  const totalSeconds = Math.ceil(
    timeLeft / 1000,
  );

  const hours = Math.floor(
    totalSeconds / 3600,
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );

  const seconds = totalSeconds % 60;

  const formattedTime =
    hours > 0
      ? `${String(hours).padStart(
          2,
          "0",
        )}:${String(minutes).padStart(
          2,
          "0",
        )}:${String(seconds).padStart(
          2,
          "0",
        )}`
      : `${String(minutes).padStart(
          2,
          "0",
        )}:${String(seconds).padStart(
          2,
          "0",
        )}`;

  if (compact) {
    return (
      <span
        className="vg-countdown-compact"
        title={`Thời gian thanh toán còn lại: ${formattedTime}`}
      >
        <Icon name="clock" size={13} />

        <strong>{formattedTime}</strong>
      </span>
    );
  }

  return (
    <div className="vg-countdown-box">
      <Icon name="clock" size={16} />

      <span>
        Thời gian giữ chỗ còn lại:
      </span>

      <strong className="vg-countdown-digits">
        {formattedTime}
      </strong>
    </div>
  );
}