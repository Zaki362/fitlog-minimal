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
  TrainingPlanItem,
  UndertrainedGroup,
  WorkoutSession,
} from "../types";
import { MUSCLE_LABELS, PRIMARY_MUSCLE_GROUPS } from "../types";
import {
  ensureTrainingPlan,
  formatTrainingPlanReason,
  getPlanItemForGroup,
  normalizeTrainingPlanGroup,
} from "./trainingPlan";

const TRAINING_FRESHNESS_COLORS = {
  veryFresh: "#B8FF3C",
  fresh: "#D8FF76",
  warm: "#E9F8B4",
  stale: "#E4E8D8",
  cold: "#DCDDD8",
  never: "#EEF0EA",
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
  const groups = new Set<MuscleGroup>();

  session.muscleGroups.forEach((group) => {
    groups.add(normalizeTrainingPlanGroup(group) ?? group);
  });

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
  const normalizedGroup = normalizeTrainingPlanGroup(group) ?? group;
  const lastDate = getLastTrainedDateByMuscleGroup(data)[normalizedGroup];
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

export function formatLastTrainedStatus(
  group: MuscleGroup,
  lastDate: string | null | undefined,
  referenceYmd = todayYmd(),
): string {
  if (!lastDate) {
    return "从未训练";
  }

  const days = Math.max(0, diffDays(lastDate, referenceYmd));
  if (!Number.isFinite(days)) {
    return "从未训练";
  }
  if (days === 0) {
    return "今天练过";
  }
  if (days === 1) {
    return "昨天练过";
  }
  if (days <= 14) {
    return `${days} 天前训练`;
  }
  return `${days} 天未练`;
}

type RecommendationCandidate = {
  group: MuscleGroup;
  item: TrainingPlanItem;
  daysSince: number | null;
  dueRatio: number | null;
  score: number;
  isDue: boolean;
  isOverdue: boolean;
};

function buildCandidate(group: MuscleGroup, item: TrainingPlanItem, data: AppData, referenceYmd: string): RecommendationCandidate {
  const daysSince = getDaysSinceLastTrained(group, data, referenceYmd);
  const dueRatio = daysSince === null ? null : daysSince / item.targetIntervalDays;
  const score = daysSince === null ? 1000 + item.priority : (dueRatio ?? 0) * 100 + item.priority;

  return {
    group,
    item,
    daysSince,
    dueRatio,
    score,
    isDue: daysSince === null || (dueRatio ?? 0) >= 1,
    isOverdue: daysSince === null || (dueRatio ?? 0) > 1,
  };
}

function sortCandidate(a: RecommendationCandidate, b: RecommendationCandidate): number {
  return b.score - a.score || b.item.priority - a.item.priority;
}

export function getDueRatio(group: MuscleGroup, data: AppData, referenceYmd = todayYmd()): number | null {
  const normalized = ensureTrainingPlan(data);
  const item = getPlanItemForGroup(group, normalized.trainingPlan);
  const daysSince = getDaysSinceLastTrained(group, data, referenceYmd);
  if (!item || daysSince === null) {
    return null;
  }
  return daysSince / item.targetIntervalDays;
}

export function getTrainingRecommendation(data: AppData, referenceYmd = todayYmd()): TrainingRecommendation {
  const normalized = ensureTrainingPlan(data);
  const plan = normalized.trainingPlan;
  const enabledItems = plan?.items.filter((item) => item.enabled && item.role !== "disabled") ?? [];

  const mainCandidates = enabledItems
    .filter((item) => item.role === "main")
    .filter((item) => !["arms", "abs", "cardio", "custom"].includes(item.muscleGroup))
    .map((item) => buildCandidate(item.muscleGroup, item, normalized, referenceYmd))
    .filter((candidate) => candidate.daysSince === null || candidate.daysSince > 2)
    .filter((candidate) => candidate.isDue)
    .sort(sortCandidate);

  const accessoryCandidates = enabledItems
    .filter((item) => item.role === "accessory")
    .map((item) => buildCandidate(item.muscleGroup, item, normalized, referenceYmd))
    .filter((candidate) => candidate.isDue)
    .sort(sortCandidate);

  const topMain = mainCandidates[0];
  if (topMain) {
    const secondaryCandidates = accessoryCandidates
      .filter((candidate) => candidate.group !== topMain.group)
      .slice(0, 1);
    const secondaryGroups = secondaryCandidates.map((candidate) => candidate.group);
    const groups = [topMain, ...secondaryCandidates];

    return {
      primaryGroups: [topMain.group],
      secondaryGroups,
      title: `建议练${[topMain.group, ...secondaryGroups].map((group) => MUSCLE_LABELS[group]).join(" + ")}`,
      reason: `${groups
        .map((candidate) => formatTrainingPlanReason(candidate.group, candidate.item, candidate.daysSince))
        .join("；")}。`,
      status: topMain.isOverdue || secondaryCandidates.some((candidate) => candidate.isOverdue) ? "overdue" : "due",
      score: topMain.score,
      generatedAt: referenceYmd,
      ctaLabel: "按建议开练",
    };
  }

  const standaloneAccessories = accessoryCandidates
    .filter((candidate) => candidate.item.allowStandalone)
    .slice(0, 2);

  if (standaloneAccessories.length) {
    const [primary, ...secondary] = standaloneAccessories;
    const groups = standaloneAccessories.map((candidate) => candidate.group);
    const isLight = groups.includes("abs") || groups.includes("cardio");

    return {
      primaryGroups: [primary.group],
      secondaryGroups: secondary.map((candidate) => candidate.group),
      title: isLight
        ? `建议${groups.map((group) => MUSCLE_LABELS[group]).join(" + ")}`
        : `建议练${groups.map((group) => MUSCLE_LABELS[group]).join(" + ")}`,
      reason: `${standaloneAccessories
        .map((candidate) => formatTrainingPlanReason(candidate.group, candidate.item, candidate.daysSince))
        .join("；")}。`,
      status: standaloneAccessories.some((candidate) => candidate.isOverdue) ? "overdue" : "due",
      score: primary.score,
      generatedAt: referenceYmd,
      ctaLabel: "按建议开练",
    };
  }

  const accessoryOptions = enabledItems
    .filter((item) => item.role === "accessory" && item.allowStandalone)
    .map((item) => item.muscleGroup);

  return {
    primaryGroups: [],
    secondaryGroups: [],
    title: accessoryOptions.length ? "今天可以轻量训练" : "今天可以休息",
    reason: accessoryOptions.length
      ? `主要部位近期都训练过，今天可以休息或做轻量${accessoryOptions
          .map((group) => MUSCLE_LABELS[group])
          .join(" / ")}。`
      : "主要部位近期都训练过，今天可以休息或自由选择。",
    status: accessoryOptions.length ? "balanced" : "rest",
    score: 0,
    generatedAt: referenceYmd,
    ctaLabel: "自由选择",
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
