import { useEffect, useState } from "react";
import Icon from "./Icon";

export default function BookingCountdown({ expiresAt, onExpire, compact = false }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!expiresAt) return 0;
    const target = new Date(expiresAt).getTime();
    return Math.max(0, target - Date.now());
  });

  useEffect(() => {
    if (!expiresAt) return undefined;

    const target = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const remaining = Math.max(0, target - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (timeLeft <= 0) {
    return (
      <div className={`vg-countdown-box is-expired ${compact ? "is-compact" : ""}`}>
        <Icon name="alertCircle" size={compact ? 13 : 15} />
        <span>Hết hạn giữ chỗ</span>
      </div>
    );
  }

  const totalSeconds = Math.floor(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (compact) {
    return (
      <span className="vg-countdown-compact" title={`Thời gian thanh toán còn lại: ${formattedTime}`}>
        <span className="vg-pulse-dot" />
        <Icon name="clock" size={13} />
        <strong>{formattedTime}</strong>
      </span>
    );
  }

  return (
    <div className="vg-countdown-box">
      <span className="vg-pulse-dot" />
      <Icon name="clock" size={16} />
      <span>Thời gian giữ chỗ còn lại:</span>
      <strong className="vg-countdown-digits">{formattedTime}</strong>
    </div>
  );
}
