import { useMemo } from "react";

import {
  formatDestinationPlace,
  formatDestinationPlaceAddress,
} from "../../utils/destinationPlaceFormat";
import { formatDate, getDestination, getTourStateLabel, getTourTitle } from "./guidePageUtils";

const TIME_ZONE = "Asia/Ho_Chi_Minh";

const DAY_STATE_META = {
  past: {
    label: "Đã qua",
    icon: "✓",
  },
  today: {
    label: "Hôm nay",
    icon: "●",
  },
  upcoming: {
    label: "Sắp tới",
    icon: "○",
  },
};

const ACTIVITY_STATE_META = {
  past: "Đã qua",
  current: "Đang diễn ra",
  upcoming: "Sắp tới",
};

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function parseDateOnly(value) {
  const [year, month, day] = String(value || "")
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date) {
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value, amount) {
  const date = parseDateOnly(value);
  if (!date) return null;

  date.setDate(date.getDate() + amount);
  return formatDateOnly(date);
}

function getDateInTimeZone() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return parseDateOnly(`${values.year}-${values.month}-${values.day}`);
}

function getTimeInTimeZone() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return Number(values.hour || 0) * 60 + Number(values.minute || 0);
}

function parseTime(value) {
  const [hours, minutes] = String(value || "")
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : "";
}

function getDayState(value, today) {
  const date = parseDateOnly(value);
  if (!date || !today) return "upcoming";

  if (date.getTime() < today.getTime()) return "past";
  if (date.getTime() === today.getTime()) return "today";
  return "upcoming";
}

function getSessionDayNumber(session, departureDate) {
  const explicitDayNumber = Number(
    session?.itinerary?.day_number
      || session?.tour_itinerary?.day_number
      || session?.day_number,
  );
  if (Number.isFinite(explicitDayNumber) && explicitDayNumber > 0) {
    return explicitDayNumber;
  }

  const departure = parseDateOnly(departureDate);
  const scheduled = parseDateOnly(session?.scheduled_date);
  if (!departure || !scheduled) return null;

  const dayDifference = Math.round(
    (scheduled.getTime() - departure.getTime()) / (24 * 60 * 60 * 1000),
  );
  return dayDifference >= 0 ? dayDifference + 1 : null;
}

function normalizeItineraryDays(tour) {
  const itineraries = Array.isArray(tour?.tour?.itineraries)
    ? tour.tour.itineraries
    : [];
  const departureDate = tour?.departure_date;
  const today = getDateInTimeZone();
  const grouped = new Map();

  itineraries.forEach((activity, index) => {
    const dayNumber = Number(activity?.day_number) || index + 1;
    const current = grouped.get(dayNumber) || [];
    current.push({ ...activity, day_number: dayNumber, itineraryIndex: index });
    grouped.set(dayNumber, current);
  });

  return Array.from(grouped.entries())
    .sort(([dayA], [dayB]) => dayA - dayB)
    .map(([dayNumber, activities]) => {
      const date = addDays(departureDate, dayNumber - 1);
      const state = getDayState(date, today);

      return {
        dayNumber,
        date,
        state,
        activities: activities.sort((activityA, activityB) => {
          const sortOrderDifference = Number(activityA.sort_order || 0)
            - Number(activityB.sort_order || 0);
          if (sortOrderDifference !== 0) return sortOrderDifference;

          const timeA = parseTime(activityA.start_time);
          const timeB = parseTime(activityB.start_time);

          if (timeA !== null && timeB !== null && timeA !== timeB) {
            return timeA - timeB;
          }

          return activityA.itineraryIndex - activityB.itineraryIndex;
        }),
      };
    });
}

function getActivityState(activity, dayState) {
  if (dayState === "past") return "past";
  if (dayState === "upcoming") return "upcoming";

  const start = parseTime(activity?.start_time);
  const end = parseTime(activity?.end_time);
  if (start === null && end === null) return "current";

  const now = getTimeInTimeZone();
  if (end !== null && now >= end) return "past";
  if (start !== null && now < start) return "upcoming";
  return "current";
}

function ActivityCard({ activity, dayState }) {
  const activityState = getActivityState(activity, dayState);
  const destination = formatDestinationPlace(activity?.destination_place);
  const address = formatDestinationPlaceAddress(activity?.destination_place);
  const timeLabel = [formatTime(activity?.start_time), formatTime(activity?.end_time)]
    .filter(Boolean)
    .join(" - ");

  return (
    <article className={`guide-attendance-itinerary-activity is-${activityState}`}>
      <span className="guide-attendance-itinerary-activity-dot" aria-hidden="true" />
      <div className="guide-attendance-itinerary-activity-content">
        <div className="guide-attendance-itinerary-activity-heading">
          <span className="guide-attendance-itinerary-time">
            {timeLabel || "Chưa có thời gian"}
          </span>
          <span className="guide-attendance-itinerary-activity-state">
            {ACTIVITY_STATE_META[activityState]}
          </span>
        </div>
        <h4>{activity?.title || "Hoạt động trong hành trình"}</h4>
        {destination ? <p><strong>Điểm đến:</strong> {destination}</p> : null}
        {address ? <p><strong>Địa chỉ:</strong> {address}</p> : null}
        {activity?.duration ? <p><strong>Thời lượng:</strong> {activity.duration}</p> : null}
        {activity?.transport ? <p><strong>Di chuyển:</strong> {activity.transport}</p> : null}
        {stripHtml(activity?.description) ? <p>{stripHtml(activity.description)}</p> : null}
      </div>
    </article>
  );
}

function ItineraryDayCard({ day }) {
  const stateMeta = DAY_STATE_META[day.state];

  return (
    <article className={`guide-attendance-itinerary-day is-${day.state}`}>
      <header className="guide-attendance-itinerary-day-header">
        <div>
          <span className="guide-attendance-itinerary-day-kicker">Ngày {day.dayNumber}</span>
          <h3>{formatDate(day.date, "Chưa xác định")}</h3>
        </div>
        <span className="guide-attendance-itinerary-status">
          <span aria-hidden="true">{stateMeta.icon}</span>
          {stateMeta.label}
        </span>
      </header>
      {day.activities.length ? (
        <div className="guide-attendance-itinerary-activities">
          {day.activities.map((activity) => (
            <ActivityCard
              key={activity.id || `${day.dayNumber}-${activity.itineraryIndex}`}
              activity={activity}
              dayState={day.state}
            />
          ))}
        </div>
      ) : (
        <div className="guide-attendance-itinerary-day-empty">
          Ngày này chưa có hoạt động trong lịch trình.
        </div>
      )}
    </article>
  );
}

function normalizeAttendanceDayOptions(itineraryDays, attendanceSessions, departureDate) {
  const today = getDateInTimeZone();
  const dayMap = new Map(itineraryDays.map((day) => [day.dayNumber, { ...day }]));

  (Array.isArray(attendanceSessions) ? attendanceSessions : []).forEach((session, index) => {
    const dayNumber = getSessionDayNumber(session, departureDate) || index + 1;
    const date = session?.scheduled_date || addDays(departureDate, dayNumber - 1);
    const current = dayMap.get(dayNumber);

    dayMap.set(dayNumber, {
      dayNumber,
      date: current?.date || date,
      state: current?.state || getDayState(date, today),
      activities: current?.activities || [],
      session: current?.session || session,
    });
  });

  return Array.from(dayMap.values()).sort((dayA, dayB) => dayA.dayNumber - dayB.dayNumber);
}

function ItineraryDaySelector({ days, onSelect, selectedDay }) {
  if (!days.length) return null;

  return (
    <div className="guide-attendance-itinerary-day-selector" role="tablist" aria-label="Chọn ngày xem lịch trình">
      {days.map((day) => {
        const stateMeta = DAY_STATE_META[day.state];
        const isSelected = day.dayNumber === selectedDay?.dayNumber;

        return (
          <button
            key={day.dayNumber}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={`Xem lịch trình ngày ${day.dayNumber}`}
            className={`is-${day.state} ${isSelected ? "is-active" : ""}`}
            disabled={!day.session}
            onClick={() => onSelect(day.session)}
          >
            <span>Ngày {day.dayNumber}</span>
            <strong>{formatDate(day.date)}</strong>
            <small>
              <span aria-hidden="true">{stateMeta.icon}</span>
              {stateMeta.label}
            </small>
          </button>
        );
      })}
    </div>
  );
}

function GuideAttendanceItineraryPanel({
  attendanceSessions,
  error,
  loading,
  onOpenAttendance,
  onSelectAttendanceDay,
  selectedSession,
  tour,
}) {
  const days = useMemo(() => normalizeItineraryDays(tour), [tour]);
  const dayOptions = useMemo(
    () => normalizeAttendanceDayOptions(days, attendanceSessions, tour?.departure_date),
    [attendanceSessions, days, tour?.departure_date],
  );
  const selectedDayNumber = getSessionDayNumber(selectedSession, tour?.departure_date);
  const selectedDay = dayOptions.find(
    (day) => selectedSession?.id && String(day.session?.id) === String(selectedSession.id),
  ) || dayOptions.find((day) => day.dayNumber === selectedDayNumber) || dayOptions[0] || null;

  return (
    <section className="guide-attendance-itinerary-panel" role="tabpanel" id="guide-attendance-itinerary-panel" aria-labelledby="guide-attendance-itinerary-tab">
      <header className="guide-attendance-itinerary-header">
        <div>
          <span>Lịch trình tour</span>
          <h2>{getTourTitle(tour)}</h2>
          <p>{getDestination(tour)} · {getTourStateLabel(tour)}</p>
        </div>
        <button type="button" className="guide-attendance-itinerary-action" onClick={onOpenAttendance}>
          Điểm danh tour này
        </button>
      </header>

      {loading ? (
        <div className="guide-attendance-itinerary-empty" role="status">Đang tải lịch trình...</div>
      ) : error ? (
        <div className="guide-attendance-itinerary-empty is-error" role="alert">
          {error}
        </div>
      ) : days.length ? (
        <>
          <ItineraryDaySelector
            days={dayOptions}
            onSelect={onSelectAttendanceDay}
            selectedDay={selectedDay}
          />
          {selectedDay ? <ItineraryDayCard day={selectedDay} /> : null}
        </>
      ) : (
        <div className="guide-attendance-itinerary-empty">
          Tour này chưa có lịch trình chi tiết.
        </div>
      )}
    </section>
  );
}

export default GuideAttendanceItineraryPanel;
