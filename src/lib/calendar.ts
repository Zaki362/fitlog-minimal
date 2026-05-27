import { addDays, compareYmdDesc, parseYmd, todayYmd, toYmd } from "./date";
import { buildWorkoutTitle, formatCardioEntry } from "./workout";
import type { MuscleGroup, WorkoutSession } from "../types";

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type SessionThumbnailType = Exclude<MuscleGroup, "biceps" | "triceps">;

const THUMBNAIL_PRIORITY: SessionThumbnailType[] = [
  "back",
  "chest",
  "shoulder",
  "legs",
  "arms",
  "abs",
  "cardio",
  "custom",
];

function normalizeThumbnailGroup(group: MuscleGroup): SessionThumbnailType {
  if (group === "biceps" || group === "triceps") {
    return "arms";
  }
  return group;
}

export function groupSessionsByDate(sessions: WorkoutSession[]): Record<string, WorkoutSession[]> {
  return sessions.reduce<Record<string, WorkoutSession[]>>((result, session) => {
    const bucket = result[session.date] ?? [];
    bucket.push(session);
    result[session.date] = bucket.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return result;
  }, {});
}

export function getSessionsForDate(date: string, sessions: WorkoutSession[]): WorkoutSession[] {
  return groupSessionsByDate(sessions)[date] ?? [];
}

export function getCalendarDays(year: number, monthIndex: number, referenceYmd = todayYmd()): CalendarDay[] {
  const firstDay = new Date(year, monthIndex, 1);
  const gridStart = addDays(firstDay, -firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const ymd = toYmd(date);
    return {
      date: ymd,
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === monthIndex,
      isToday: ymd === referenceYmd,
    };
  });
}

export function getSessionThumbnailType(session: WorkoutSession): SessionThumbnailType {
  const groups = new Set<SessionThumbnailType>();

  session.muscleGroups.forEach((group) => {
    groups.add(normalizeThumbnailGroup(group));
  });

  session.exercises.forEach((exercise) => {
    groups.add(normalizeThumbnailGroup(exercise.muscleGroup));
  });

  if (session.cardio?.length) {
    groups.add("cardio");
  }

  return THUMBNAIL_PRIORITY.find((group) => groups.has(group)) ?? "custom";
}

export function getMonthWorkoutCount(year: number, monthIndex: number, sessions: WorkoutSession[]): number {
  return sessions.filter((session) => {
    const date = parseYmd(session.date);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === monthIndex;
  }).length;
}

export function getDayWorkoutSummary(
  date: string,
  sessions: WorkoutSession[],
): {
  sessions: WorkoutSession[];
  totalDurationMinutes: number | null;
} {
  const daySessions = getSessionsForDate(date, sessions);
  const duration = daySessions.reduce((total, session) => total + (session.durationMinutes ?? 0), 0);

  return {
    sessions: daySessions,
    totalDurationMinutes: duration > 0 ? duration : null,
  };
}

export function getLatestSessionDate(sessions: WorkoutSession[]): string | null {
  return [...sessions].sort((a, b) => compareYmdDesc(a.date, b.date))[0]?.date ?? null;
}

export function getSessionCalendarTitle(session: WorkoutSession): string {
  return session.title?.trim() || buildWorkoutTitle(session.muscleGroups, session.cardio ?? []);
}

export function getSessionCalendarMeta(session: WorkoutSession): string {
  const parts: string[] = [];

  if (session.durationMinutes) {
    parts.push(`${session.durationMinutes}分钟`);
  }

  if (session.exercises.length) {
    const completed = session.exercises.filter((exercise) => exercise.completed).length;
    parts.push(`完成 ${completed}/${session.exercises.length}`);
  }

  if (!parts.length && session.cardio?.length) {
    parts.push(session.cardio.map(formatCardioEntry).join(" / "));
  }

  return parts.join(" · ") || "历史记录";
}

export function formatDuration(minutes: number | null): string {
  if (!minutes) {
    return "";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) {
    return `${remainingMinutes}分钟`;
  }

  return remainingMinutes ? `${hours}小时${remainingMinutes}分` : `${hours}小时`;
}
