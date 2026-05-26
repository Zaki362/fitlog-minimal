import {
  addDays,
  compareYmdDesc,
  diffDays,
  getLastNDates,
  parseYmd,
  startOfMonth,
  startOfWeekMonday,
  todayYmd,
} from "./date";
import type {
  AppData,
  MuscleGroup,
  ProgressUpdate,
  SessionExercise,
  UndertrainedGroup,
  WorkoutSession,
} from "../types";
import { MUSCLE_LABELS, PRIMARY_MUSCLE_GROUPS } from "../types";

function sessionGroups(session: WorkoutSession): MuscleGroup[] {
  const groups = new Set<MuscleGroup>(session.muscleGroups);

  if (session.cardio?.length) {
    groups.add("cardio");
  }

  session.exercises.forEach((exercise) => {
    if (exercise.muscleGroup === "biceps" || exercise.muscleGroup === "triceps") {
      groups.add("arms");
    } else {
      groups.add(exercise.muscleGroup);
    }
  });

  return [...groups];
}

function sortedSessions(data: AppData): WorkoutSession[] {
  return [...data.sessions].sort((a, b) => compareYmdDesc(a.date, b.date));
}

export function getTotalWorkoutCount(data: AppData): number {
  return data.sessions.length;
}

export function getThisWeekWorkoutCount(data: AppData, referenceYmd = todayYmd()): number {
  const reference = parseYmd(referenceYmd);
  const start = startOfWeekMonday(reference);
  const end = addDays(start, 6);
  return data.sessions.filter((session) => {
    const time = parseYmd(session.date).getTime();
    return time >= start.getTime() && time <= end.getTime();
  }).length;
}

export function getThisMonthWorkoutCount(data: AppData, referenceYmd = todayYmd()): number {
  const reference = parseYmd(referenceYmd);
  const start = startOfMonth(reference);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return data.sessions.filter((session) => {
    const time = parseYmd(session.date).getTime();
    return time >= start.getTime() && time <= end.getTime();
  }).length;
}

export function getRecentSessions(data: AppData, limit: number): WorkoutSession[] {
  return sortedSessions(data).slice(0, limit);
}

export function getMuscleGroupCounts(data: AppData, days?: number): Partial<Record<MuscleGroup, number>> {
  const counts: Partial<Record<MuscleGroup, number>> = {};
  const cutoff = days ? addDays(parseYmd(todayYmd()), -days + 1) : null;

  data.sessions.forEach((session) => {
    if (cutoff && parseYmd(session.date).getTime() < cutoff.getTime()) {
      return;
    }

    sessionGroups(session).forEach((group) => {
      counts[group] = (counts[group] ?? 0) + 1;
    });
  });

  return counts;
}

export function getLastTrainedDateByMuscleGroup(data: AppData): Partial<Record<MuscleGroup, string>> {
  const lastDates: Partial<Record<MuscleGroup, string>> = {};

  sortedSessions(data).forEach((session) => {
    sessionGroups(session).forEach((group) => {
      if (!lastDates[group]) {
        lastDates[group] = session.date;
      }
    });
  });

  return lastDates;
}

export function getUndertrainedMuscleGroups(data: AppData, referenceYmd = todayYmd()): UndertrainedGroup[] {
  const lastDates = getLastTrainedDateByMuscleGroup(data);

  return PRIMARY_MUSCLE_GROUPS.flatMap((group) => {
    const lastDate = lastDates[group];

    if (!lastDate) {
      const message =
        group === "legs"
          ? "腿部还没有近期记录，可以安排一次腿部训练"
          : `${MUSCLE_LABELS[group]}还没有训练记录，可以补一次`;
      return [{ muscleGroup: group, label: MUSCLE_LABELS[group], message }];
    }

    const daysSince = diffDays(lastDate, referenceYmd);
    if (daysSince > 14) {
      return [
        {
          muscleGroup: group,
          label: MUSCLE_LABELS[group],
          lastDate,
          daysSince,
          message: `${MUSCLE_LABELS[group]}已经 ${daysSince} 天没练了`,
        },
      ];
    }

    return [];
  });
}

export function getExerciseProgress(
  exerciseId: string,
  data: AppData,
): {
  updates: ProgressUpdate[];
  sessions: Array<{ session: WorkoutSession; exercise: SessionExercise }>;
} {
  const exercise = data.exercises.find((item) => item.id === exerciseId);
  const updates = data.progressUpdates
    .filter((update) => update.exerciseTemplateId === exerciseId)
    .sort((a, b) => compareYmdDesc(a.date, b.date));

  const sessions = sortedSessions(data).flatMap((session) =>
    session.exercises
      .filter(
        (item) =>
          item.exerciseTemplateId === exerciseId ||
          Boolean(exercise && item.name.trim() === exercise.name.trim()),
      )
      .map((item) => ({ session, exercise: item })),
  );

  return { updates, sessions };
}

export function getWorkoutCalendarData(
  data: AppData,
  days: number,
): Array<{ date: string; count: number; muscleGroups: MuscleGroup[] }> {
  return getLastNDates(days).map((date) => {
    const sessions = data.sessions.filter((session) => session.date === date);
    return {
      date,
      count: sessions.length,
      muscleGroups: [...new Set(sessions.flatMap(sessionGroups))],
    };
  });
}
