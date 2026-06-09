import type { ActiveWorkoutDraft, CardioEntry, MuscleGroup, OverallFeeling, SessionExercise } from "../types";

const ACTIVE_WORKOUT_DRAFT_KEY = "fitlog_minimal_active_workout_draft_v1";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeDraft(value: unknown): ActiveWorkoutDraft | null {
  if (!isObject(value)) {
    return null;
  }

  const date = typeof value.date === "string" ? value.date : "";
  const title = typeof value.title === "string" ? value.title : "";
  const muscleGroups = Array.isArray(value.muscleGroups) ? (value.muscleGroups as MuscleGroup[]) : [];
  const exercises = Array.isArray(value.exercises) ? (value.exercises as SessionExercise[]) : [];
  const cardio = Array.isArray(value.cardio) ? (value.cardio as CardioEntry[]) : [];

  if (!date || !title || (!exercises.length && !cardio.length)) {
    return null;
  }

  return {
    date,
    title,
    muscleGroups,
    exercises,
    cardio,
    notes: typeof value.notes === "string" ? value.notes : "",
    duration: typeof value.duration === "string" ? value.duration : "",
    overallFeeling: typeof value.overallFeeling === "string" ? (value.overallFeeling as OverallFeeling) : "normal",
    syncTemplateUpdates: Boolean(value.syncTemplateUpdates),
    autosavedAt: typeof value.autosavedAt === "string" ? value.autosavedAt : undefined,
  };
}

export function loadActiveWorkoutDraft(): ActiveWorkoutDraft | null {
  if (!hasStorage()) {
    return null;
  }

  try {
    return normalizeDraft(JSON.parse(window.localStorage.getItem(ACTIVE_WORKOUT_DRAFT_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): ActiveWorkoutDraft | null {
  if (!hasStorage()) {
    return null;
  }

  const normalized = normalizeDraft({
    ...draft,
    autosavedAt: new Date().toISOString(),
  });
  if (!normalized) {
    return null;
  }

  try {
    window.localStorage.setItem(ACTIVE_WORKOUT_DRAFT_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return null;
  }
}

export function clearActiveWorkoutDraft(): void {
  if (!hasStorage()) {
    return;
  }

  window.localStorage.removeItem(ACTIVE_WORKOUT_DRAFT_KEY);
}
