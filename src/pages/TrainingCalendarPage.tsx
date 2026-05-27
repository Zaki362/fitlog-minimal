import { useMemo, useState } from "react";
import { CalendarSessionCard } from "../components/CalendarSessionCard";
import { EmptyState } from "../components/EmptyState";
import { WorkoutCalendar } from "../components/WorkoutCalendar";
import {
  formatDuration,
  getDayWorkoutSummary,
  getLatestSessionDate,
  getMonthWorkoutCount,
} from "../lib/calendar";
import { parseYmd, todayYmd, toYmd } from "../lib/date";
import type { AppData, WorkoutSession } from "../types";

type TrainingCalendarPageProps = {
  data: AppData;
  onAddRecord: () => void;
  onBack: () => void;
  onOpenSession: (session: WorkoutSession) => void;
};

function monthLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function selectedDayTitle(date: string): string {
  const parsed = parseYmd(date);
  if (Number.isNaN(parsed.getTime())) {
    return "当天训练记录";
  }
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日训练记录`;
}

function firstSelectableDateInMonth(monthDate: Date, sessions: WorkoutSession[]): string {
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const latestInMonth = [...sessions]
    .filter((session) => {
      const date = parseYmd(session.date);
      return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === monthIndex;
    })
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (latestInMonth) {
    return latestInMonth.date;
  }

  const today = parseYmd(todayYmd());
  if (today.getFullYear() === year && today.getMonth() === monthIndex) {
    return todayYmd();
  }

  return toYmd(new Date(year, monthIndex, 1));
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="15" rx="3" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16M8 14h3M13 14h3M8 17h2.2" />
    </svg>
  );
}

export function TrainingCalendarPage({ data, onAddRecord, onBack, onOpenSession }: TrainingCalendarPageProps) {
  const initialDate = getLatestSessionDate(data.sessions) ?? todayYmd();
  const initialParsedDate = parseYmd(initialDate);
  const [monthDate, setMonthDate] = useState(() =>
    Number.isNaN(initialParsedDate.getTime())
      ? new Date()
      : new Date(initialParsedDate.getFullYear(), initialParsedDate.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const summary = useMemo(() => getDayWorkoutSummary(selectedDate, data.sessions), [data.sessions, selectedDate]);
  const monthCount = getMonthWorkoutCount(monthDate.getFullYear(), monthDate.getMonth(), data.sessions);
  const durationText = formatDuration(summary.totalDurationMinutes);

  function moveMonth(offset: number) {
    const nextMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
    setMonthDate(nextMonthDate);
    setSelectedDate(firstSelectableDateInMonth(nextMonthDate, data.sessions));
  }

  function jumpToToday() {
    const today = parseYmd(todayYmd());
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayYmd());
  }

  return (
    <div className="page training-calendar-page">
      <header className="calendar-page-header">
        <button className="calendar-page-header__button" type="button" onClick={onBack} aria-label="返回首页">
          ‹
        </button>
        <div>
          <h1>训练日历</h1>
          <p>查看所有训练记录</p>
        </div>
        <button className="calendar-page-header__button" type="button" onClick={jumpToToday} aria-label="回到今天">
          <CalendarIcon />
        </button>
      </header>

      <section className="calendar-month-card">
        <div className="calendar-month-nav">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="上个月">
            ‹
          </button>
          <div>
            <strong>{monthLabel(monthDate)}</strong>
            <span>{monthCount ? `${monthCount} 次训练` : "暂无训练"}</span>
          </div>
          <button type="button" onClick={() => moveMonth(1)} aria-label="下个月">
            ›
          </button>
        </div>

        <WorkoutCalendar
          year={monthDate.getFullYear()}
          monthIndex={monthDate.getMonth()}
          selectedDate={selectedDate}
          sessions={data.sessions}
          onSelectDate={setSelectedDate}
        />

        <p className="calendar-legend">
          <span aria-hidden="true" />
          绿色日期表示有训练记录
        </p>
      </section>

      <section className="calendar-day-panel">
        <div className="section-title">
          <h2>{selectedDayTitle(selectedDate)}</h2>
          {durationText ? <span>总时长 {durationText}</span> : null}
        </div>

        {summary.sessions.length ? (
          <div className="calendar-session-strip">
            {summary.sessions.map((session) => (
              <CalendarSessionCard
                key={session.id}
                session={session}
                onOpen={() => onOpenSession(session)}
              />
            ))}
            <button className="calendar-add-card" type="button" onClick={onAddRecord}>
              <span>+</span>
              添加记录
            </button>
          </div>
        ) : (
          <div className="calendar-empty-day">
            <EmptyState title="这天还没有训练记录" actionLabel="添加记录" onAction={onAddRecord} />
          </div>
        )}
      </section>
    </div>
  );
}
