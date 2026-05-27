import { CalendarDayCell } from "./CalendarDayCell";
import { getCalendarDays, groupSessionsByDate } from "../lib/calendar";
import type { WorkoutSession } from "../types";

type WorkoutCalendarProps = {
  year: number;
  monthIndex: number;
  selectedDate: string;
  sessions: WorkoutSession[];
  onSelectDate: (date: string) => void;
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function WorkoutCalendar({ year, monthIndex, selectedDate, sessions, onSelectDate }: WorkoutCalendarProps) {
  const sessionsByDate = groupSessionsByDate(sessions);
  const days = getCalendarDays(year, monthIndex);

  return (
    <section className="workout-calendar" aria-label={`${year}年${monthIndex + 1}月训练日历`}>
      <div className="workout-calendar__weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="workout-calendar__grid">
        {days.map((day) => (
          <CalendarDayCell
            day={day}
            key={day.date}
            selected={day.date === selectedDate}
            sessions={sessionsByDate[day.date] ?? []}
            onSelect={onSelectDate}
          />
        ))}
      </div>
    </section>
  );
}
