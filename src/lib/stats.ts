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
  TrainingRecommendation,
  UndertrainedGroup,
  WorkoutSession,
} from "../types";
import { MUSCLE_LABELS, PRIMARY_MUSCLE_GROUPS } from "../types";

const TRAINING_FRESHNESS_COLORS = {
  veryFresh: "#B8FF3C",
  fresh: "#D8FF76",
  warm: "#E9F8B4",
  stale: "#E4E8D8",
  cold: "#DCDDD8",
  never: "#E9E9E5",
};

function groupNameInSentence(group: MuscleGroup): string {
  if (group === "legs") return "腿部";
  if (group === "chest") return "胸部";
  if (group === "back") return "背部";
  if (group === "shoulder") return "肩部";
  if (group === "arms") return "胳膊";
  if (group === "abs") return "腹部";
  return MUSCLE_LABELS[group];
}

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

export function getDaysSinceLastTrained(group: MuscleGroup, data: AppData, referenceYmd = todayYmd()): number | null {
  const lastDate = getLastTrainedDateByMuscleGroup(data)[group];
  if (!lastDate) {
    return null;
  }
  return Math.max(0, diffDays(lastDate, referenceYmd));
}

export function getTrainingFreshnessColor(lastDate: string | null | undefined, today: Date): string {
  if (!lastDate) {
    return TRAINING_FRESHNESS_COLORS.never;
  }

  const todayYmdValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  const stableDays = Math.max(0, diffDays(lastDate, todayYmdValue));

  if (stableDays <= 2) return TRAINING_FRESHNESS_COLORS.veryFresh;
  if (stableDays <= 7) return TRAINING_FRESHNESS_COLORS.fresh;
  if (stableDays <= 14) return TRAINING_FRESHNESS_COLORS.warm;
  if (stableDays <= 30) return TRAINING_FRESHNESS_COLORS.stale;
  return TRAINING_FRESHNESS_COLORS.cold;
}

export function getTrainingRecommendation(data: AppData, referenceYmd = todayYmd()): TrainingRecommendation {
  const primaryGroups: MuscleGroup[] = ["legs", "chest", "back", "shoulder", "arms"];
  const lastDates = getLastTrainedDateByMuscleGroup(data);
  const counts30 = getMuscleGroupCounts(data, 30);

  if (!lastDates.legs) {
    return {
      primaryGroups: ["legs"],
      title: "建议练腿",
      reason: "腿部还没有近期训练记录，可以安排一次腿部训练。",
      ctaLabel: "按建议开练",
    };
  }

  const rankedByStaleness = primaryGroups
    .map((group) => ({
      group,
      daysSince: lastDates[group] ? diffDays(lastDates[group] as string, referenceYmd) : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => b.daysSince - a.daysSince);
  const stale = rankedByStaleness.find((item) => item.daysSince > 14 || !Number.isFinite(item.daysSince));

  if (stale) {
    const secondaryGroups =
      ["chest", "back", "shoulder"].includes(stale.group) && getDaysSinceLastTrained("abs", data, referenceYmd) !== null
        ? (["abs"] as MuscleGroup[])
        : undefined;
    const reason = Number.isFinite(stale.daysSince)
      ? `${groupNameInSentence(stale.group)}已经 ${stale.daysSince} 天没练，可以安排一次${groupNameInSentence(
          stale.group,
        )}训练。`
      : `${groupNameInSentence(stale.group)}还没有训练记录，可以安排一次${groupNameInSentence(stale.group)}训练。`;

    return {
      primaryGroups: [stale.group],
      secondaryGroups,
      title: `建议练${MUSCLE_LABELS[stale.group]}`,
      reason,
      ctaLabel: "按建议开练",
    };
  }

  const lightOption = primaryGroups
    .map((group) => ({
      group,
      count: counts30[group] ?? 0,
      daysSince: lastDates[group] ? diffDays(lastDates[group] as string, referenceYmd) : 999,
    }))
    .sort((a, b) => a.count - b.count || b.daysSince - a.daysSince)[0];

  const primary = lightOption?.group ?? "shoulder";
  const secondaryGroups =
    ["chest", "back", "shoulder"].includes(primary) && (counts30.abs ?? 0) <= 2 ? (["abs"] as MuscleGroup[]) : undefined;

  return {
    primaryGroups: [primary],
    secondaryGroups,
    title: "状态不错",
    reason: `主要部位最近都有训练，可以选择一次较轻松的${groupNameInSentence(primary)}或有氧训练。`,
    ctaLabel: "按建议开练",
  };
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
