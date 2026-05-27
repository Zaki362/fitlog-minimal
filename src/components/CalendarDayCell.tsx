import { getSessionThumbnailType, type CalendarDay } from "../lib/calendar";
import type { WorkoutSession } from "../types";
import { SessionThumbnail } from "./SessionThumbnail";

type CalendarDayCellProps = {
  day: CalendarDay;
  sessions: WorkoutSession[];
  selected: boolean;
  onSelect: (date: string) => void;
};

export function CalendarDayCell({ day, sessions, selected, onSelect }: CalendarDayCellProps) {
  const visibleSessions = sessions.slice(0, 2);
  const hasSessions = sessions.length > 0;

  return (
    <button
      className={[
        "calendar-day",
        day.isCurrentMonth ? "" : "is-outside",
        day.isToday ? "is-today" : "",
        selected ? "is-selected" : "",
        hasSessions ? "has-sessions" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      onClick={() => onSelect(day.date)}
      aria-label={`${day.date}${hasSessions ? `，${sessions.length} 条训练记录` : ""}`}
    >
      <span className="calendar-day__number">{day.dayOfMonth}</span>
      {hasSessions ? <span className="calendar-day__dot" aria-hidden="true" /> : null}
      {hasSessions ? (
        <span className="calendar-day__thumbs">
          {visibleSessions.map((session) => (
            <SessionThumbnail key={session.id} type={getSessionThumbnailType(session)} size="tiny" />
          ))}
        </span>
      ) : null}
    </button>
  );
}
