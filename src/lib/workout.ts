import type {
  ActiveWorkoutDraft,
  CardioEntry,
  ExerciseTemplate,
  MuscleGroup,
  SessionExercise,
  WorkoutSession,
} from "../types";
import { MUSCLE_LABELS, MUSCLE_ORDER } from "../types";
import { formatShortDate } from "./date";

export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

export function normalizeOptionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function formatWeight(value: number | null | undefined, unit = "kg"): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return unit === "kg" ? `${formatNumber(value)}kg` : formatNumber(value);
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2))).replace(/\.0+$/, "");
}

export function getDefaultWeightStep(weight: number | null): number {
  if (weight === null) return 1;
  if (weight <= 10) return 0.5;
  if (weight <= 30) return 1;
  return 2.5;
}

export function formatRepValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

export function formatPlan(exercise: {
  defaultWeightKg?: number | null;
  plannedWeightKg?: number | null;
  targetSets?: number | null;
  plannedSets?: number | null;
  targetReps?: number | string | null;
  plannedReps?: number | string | null;
  unit?: string;
}): string {
  const weight = exercise.plannedWeightKg ?? exercise.defaultWeightKg ?? null;
  const sets = exercise.plannedSets ?? exercise.targetSets ?? null;
  const reps = exercise.plannedReps ?? exercise.targetReps ?? null;
  const parts = [];

  if (weight !== null && weight !== undefined && exercise.unit !== "bodyweight") {
    parts.push(`${weight}kg`);
  }
  if (sets !== null && sets !== undefined) {
    parts.push(`${sets}组`);
  }
  if (reps !== null && reps !== undefined && reps !== "") {
    parts.push(`${reps}次`);
  }

  return parts.length ? parts.join(" / ") : "自重或按备注";
}

export function templateToSessionExercise(template: ExerciseTemplate): SessionExercise {
  return {
    id: createId("session-ex"),
    exerciseTemplateId: template.id,
    name: template.name,
    muscleGroup: template.muscleGroup,
    plannedWeightKg: template.defaultWeightKg ?? null,
    actualWeightKg: template.defaultWeightKg ?? null,
    plannedSets: template.targetSets ?? null,
    actualSets: template.targetSets ?? null,
    plannedReps: template.targetReps ?? null,
    actualReps: template.targetReps ?? null,
    completed: false,
    difficulty: null,
    notes: "",
    templateNotes: template.notes ?? "",
  };
}

export function selectedGroupsForTemplates(selected: MuscleGroup[]): MuscleGroup[] {
  const groups = new Set<MuscleGroup>(selected);
  if (groups.has("arms")) {
    groups.add("biceps");
    groups.add("triceps");
  }
  return [...groups];
}

export function templateMatchesSelected(template: ExerciseTemplate, selected: MuscleGroup[]): boolean {
  return selectedGroupsForTemplates(selected).includes(template.muscleGroup);
}

export function sortMuscleGroups(groups: MuscleGroup[]): MuscleGroup[] {
  return [...new Set(groups)].sort((a, b) => MUSCLE_ORDER.indexOf(a) - MUSCLE_ORDER.indexOf(b));
}

export function buildWorkoutTitle(groups: MuscleGroup[], cardio: CardioEntry[] = []): string {
  const names = sortMuscleGroups(groups)
    .filter((group) => group !== "custom")
    .map((group) => MUSCLE_LABELS[group]);
  if (cardio.length && !names.includes(MUSCLE_LABELS.cardio)) {
    names.push(MUSCLE_LABELS.cardio);
  }
  return names.length ? names.join(" + ") : "自定义训练";
}

export function inferSessionGroups(draft: ActiveWorkoutDraft, exercises: SessionExercise[]): MuscleGroup[] {
  const groups = new Set<MuscleGroup>(draft.muscleGroups);
  exercises.forEach((exercise) => {
    if (exercise.muscleGroup === "biceps" || exercise.muscleGroup === "triceps") {
      groups.add("arms");
    } else {
      groups.add(exercise.muscleGroup);
    }
  });
  if (draft.cardio.length) {
    groups.add("cardio");
  }
  if (!groups.size) {
    groups.add("custom");
  }
  return sortMuscleGroups([...groups]);
}

export function formatCardioEntry(entry: CardioEntry): string {
  const details = [
    entry.durationMinutes ? `${entry.durationMinutes}分钟` : "",
    entry.distanceKm ? `${entry.distanceKm}km` : "",
    entry.notes ?? "",
  ]
    .filter(Boolean)
    .join(" / ");
  return `${entry.type}${details ? ` ${details}` : ""}`;
}

export function formatSessionLine(session: WorkoutSession): string {
  const cardio = session.cardio?.map(formatCardioEntry).join(" + ");
  if (cardio && !session.title.includes("跑步") && !session.title.includes("爬坡") && !session.title.includes("有氧")) {
    return `${formatShortDate(session.date)} ${session.title} + ${cardio}`;
  }
  return `${formatShortDate(session.date)} ${session.title}`;
}

export function downloadTextFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
