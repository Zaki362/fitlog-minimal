import { createSeedData } from "../data/seed";
import type {
  AppData,
  CardioEntry,
  ExerciseUnit,
  ExerciseTemplate,
  MuscleGroup,
  ProgressUpdate,
  SessionExercise,
  WorkoutSession,
} from "../types";
import { MUSCLE_LABELS } from "../types";
import { compareYmdDesc, formatDateCN } from "./date";

export const STORAGE_KEY = "fitlog_minimal_v1";
const VERSION = 1;

export type LoadDataResult = {
  data: AppData;
  error?: string;
};

export type ImportJsonResult =
  | {
      ok: true;
      data: AppData;
    }
  | {
      ok: false;
      error: string;
    };

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMuscleGroup(value: unknown): value is MuscleGroup {
  return typeof value === "string" && value in MUSCLE_LABELS;
}

function isExerciseUnit(value: unknown): value is ExerciseUnit {
  return (
    value === "kg" ||
    value === "bodyweight" ||
    value === "time" ||
    value === "distance" ||
    value === "mixed"
  );
}

function isCardioType(value: unknown): value is CardioEntry["type"] {
  return value === "爬坡" || value === "跑步" || value === "有氧" || value === "其他";
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toNullableNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") {
    return value === undefined ? undefined : null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function validateExercise(value: unknown): ExerciseTemplate | null {
  if (!isObject(value)) {
    return null;
  }
  if (typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }
  if (!isMuscleGroup(value.muscleGroup)) {
    return null;
  }
  const unit = isExerciseUnit(value.unit) ? value.unit : "kg";

  return {
    id: value.id,
    name: value.name,
    muscleGroup: value.muscleGroup,
    equipment: typeof value.equipment === "string" ? value.equipment : undefined,
    defaultWeightKg: toNullableNumber(value.defaultWeightKg) ?? null,
    targetSets: toNullableNumber(value.targetSets) ?? null,
    targetReps:
      typeof value.targetReps === "number" || typeof value.targetReps === "string"
        ? value.targetReps
        : null,
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : undefined,
    unit,
    notes: typeof value.notes === "string" ? value.notes : "",
    isFavorite: Boolean(value.isFavorite),
    isArchived: Boolean(value.isArchived),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
}

function validateCardio(value: unknown): CardioEntry | null {
  if (!isObject(value) || typeof value.id !== "string") {
    return null;
  }

  if (!isCardioType(value.type)) {
    return null;
  }

  return {
    id: value.id,
    type: value.type,
    durationMinutes: toNullableNumber(value.durationMinutes) ?? null,
    distanceKm: toNullableNumber(value.distanceKm) ?? null,
    notes: typeof value.notes === "string" ? value.notes : "",
  };
}

function validateSessionExercise(value: unknown): SessionExercise | null {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }
  if (!isMuscleGroup(value.muscleGroup)) {
    return null;
  }

  const difficulty =
    value.difficulty === "easy" ||
    value.difficulty === "good" ||
    value.difficulty === "hard" ||
    value.difficulty === "failed"
      ? value.difficulty
      : null;

  return {
    id: value.id,
    exerciseTemplateId: typeof value.exerciseTemplateId === "string" ? value.exerciseTemplateId : undefined,
    name: value.name,
    muscleGroup: value.muscleGroup,
    plannedWeightKg: toNullableNumber(value.plannedWeightKg) ?? null,
    actualWeightKg: toNullableNumber(value.actualWeightKg) ?? null,
    plannedSets: toNullableNumber(value.plannedSets) ?? null,
    actualSets: toNullableNumber(value.actualSets) ?? null,
    plannedReps:
      typeof value.plannedReps === "number" || typeof value.plannedReps === "string"
        ? value.plannedReps
        : null,
    actualReps:
      typeof value.actualReps === "number" || typeof value.actualReps === "string"
        ? value.actualReps
        : null,
    completed: Boolean(value.completed),
    difficulty,
    notes: typeof value.notes === "string" ? value.notes : "",
    templateNotes: typeof value.templateNotes === "string" ? value.templateNotes : undefined,
    sets: Array.isArray(value.sets)
      ? value.sets
          .filter(isObject)
          .map((set, index) => ({
            setNumber: typeof set.setNumber === "number" ? set.setNumber : index + 1,
            weightKg: toNullableNumber(set.weightKg) ?? null,
            reps: typeof set.reps === "number" || typeof set.reps === "string" ? set.reps : null,
            completed: Boolean(set.completed),
            rpe: toNullableNumber(set.rpe) ?? null,
          }))
      : undefined,
  };
}

function validateSession(value: unknown): WorkoutSession | null {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.title !== "string") {
    return null;
  }
  if (!isIsoDate(value.date) || !Array.isArray(value.muscleGroups)) {
    return null;
  }

  const muscleGroups = value.muscleGroups.filter(isMuscleGroup);
  if (!muscleGroups.length) {
    return null;
  }

  const exercises = Array.isArray(value.exercises)
    ? value.exercises.map(validateSessionExercise).filter((item): item is SessionExercise => Boolean(item))
    : [];
  const cardio = Array.isArray(value.cardio)
    ? value.cardio.map(validateCardio).filter((item): item is CardioEntry => Boolean(item))
    : undefined;

  const overallFeeling =
    value.overallFeeling === "great" ||
    value.overallFeeling === "normal" ||
    value.overallFeeling === "tired" ||
    value.overallFeeling === "bad"
      ? value.overallFeeling
      : null;

  return {
    id: value.id,
    date: value.date,
    title: value.title,
    muscleGroups,
    exercises,
    cardio: cardio?.length ? cardio : undefined,
    durationMinutes: toNullableNumber(value.durationMinutes) ?? null,
    overallFeeling,
    notes: typeof value.notes === "string" ? value.notes : "",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
}

function validateProgress(value: unknown): ProgressUpdate | null {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.exerciseTemplateId !== "string") {
    return null;
  }

  return {
    id: value.id,
    exerciseTemplateId: value.exerciseTemplateId,
    date: isIsoDate(value.date) ? value.date : new Date().toISOString().slice(0, 10),
    oldWeightKg: toNullableNumber(value.oldWeightKg) ?? null,
    newWeightKg: toNullableNumber(value.newWeightKg) ?? null,
    oldTargetSets: toNullableNumber(value.oldTargetSets) ?? null,
    newTargetSets: toNullableNumber(value.newTargetSets) ?? null,
    oldTargetReps:
      typeof value.oldTargetReps === "number" || typeof value.oldTargetReps === "string"
        ? value.oldTargetReps
        : null,
    newTargetReps:
      typeof value.newTargetReps === "number" || typeof value.newTargetReps === "string"
        ? value.newTargetReps
        : null,
    reason: typeof value.reason === "string" ? value.reason : "",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

function hydrateExerciseImages(exercises: ExerciseTemplate[]): ExerciseTemplate[] {
  const seedImageMap = new Map(
    createSeedData()
      .exercises.filter((exercise) => exercise.imageUrl)
      .map((exercise) => [exercise.id, exercise.imageUrl as string]),
  );

  return exercises.map((exercise) => {
    if (exercise.imageUrl) {
      return exercise;
    }

    const imageUrl = seedImageMap.get(exercise.id);
    return imageUrl ? { ...exercise, imageUrl } : exercise;
  });
}

export function validateAppData(value: unknown): AppData {
  if (!isObject(value)) {
    throw new Error("JSON 根节点必须是对象");
  }
  if (!Array.isArray(value.exercises) || !Array.isArray(value.sessions)) {
    throw new Error("缺少 exercises 或 sessions 数组");
  }

  const exercises = value.exercises.map(validateExercise).filter((item): item is ExerciseTemplate => Boolean(item));
  const sessions = value.sessions.map(validateSession).filter((item): item is WorkoutSession => Boolean(item));
  const progressUpdates = Array.isArray(value.progressUpdates)
    ? value.progressUpdates.map(validateProgress).filter((item): item is ProgressUpdate => Boolean(item))
    : [];

  if (exercises.length !== value.exercises.length) {
    throw new Error("动作数据里存在无效条目");
  }
  if (sessions.length !== value.sessions.length) {
    throw new Error("训练记录里存在无效条目");
  }

  return {
    version: typeof value.version === "number" ? value.version : VERSION,
    exercises: hydrateExerciseImages(exercises),
    sessions,
    progressUpdates,
  };
}

export function loadData(): LoadDataResult {
  const seed = createSeedData();
  if (!hasStorage()) {
    return { data: seed };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    saveData(seed);
    return { data: seed };
  }

  try {
    return { data: validateAppData(JSON.parse(raw)) };
  } catch (error) {
    return {
      data: seed,
      error: error instanceof Error ? error.message : "本地数据损坏，已临时载入初始数据",
    };
  }
}

export function saveData(data: AppData): void {
  if (!hasStorage()) {
    return;
  }
  const normalized: AppData = {
    ...data,
    version: data.version || VERSION,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function resetData(): AppData {
  const next = createSeedData();
  saveData(next);
  return next;
}

export function clearData(): AppData {
  const empty: AppData = {
    version: VERSION,
    exercises: [],
    sessions: [],
    progressUpdates: [],
  };
  saveData(empty);
  return empty;
}

export function exportJson(data: AppData): string {
  return JSON.stringify({ ...data, version: data.version || VERSION }, null, 2);
}

export function importJson(json: string): ImportJsonResult {
  try {
    const data = validateAppData(JSON.parse(json));
    return { ok: true, data: { ...data, version: data.version || VERSION } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "导入失败，请检查 JSON 文件",
    };
  }
}

function formatValue(value: number | string | null | undefined, fallback = "-"): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

export function exportMarkdown(data: AppData): string {
  const lines: string[] = [
    "# 练一下 / FitLog Minimal",
    "",
    `导出时间：${new Date().toLocaleString("zh-CN")}`,
    "",
    "## 训练记录",
    "",
  ];

  [...data.sessions]
    .sort((a, b) => compareYmdDesc(a.date, b.date))
    .forEach((session) => {
      lines.push(`### ${formatDateCN(session.date)} ${session.title}`);
      lines.push("");
      lines.push(`部位：${session.muscleGroups.map((group) => MUSCLE_LABELS[group]).join(" + ")}`);

      if (session.exercises.length) {
        lines.push("");
        lines.push("| 动作 | 完成 | 重量 | 组数 | 次数 | 难度 | 备注 |");
        lines.push("| --- | --- | --- | --- | --- | --- | --- |");
        session.exercises.forEach((exercise) => {
          lines.push(
            `| ${exercise.name} | ${exercise.completed ? "是" : "否"} | ${formatValue(
              exercise.actualWeightKg,
            )} | ${formatValue(exercise.actualSets)} | ${formatValue(exercise.actualReps)} | ${
              exercise.difficulty ?? "-"
            } | ${exercise.notes ?? ""} |`,
          );
        });
      }

      if (session.cardio?.length) {
        lines.push("");
        session.cardio.forEach((item) => {
          const meta = [
            item.durationMinutes ? `${item.durationMinutes} 分钟` : "",
            item.distanceKm ? `${item.distanceKm} km` : "",
            item.notes ?? "",
          ]
            .filter(Boolean)
            .join("，");
          lines.push(`- 有氧：${item.type}${meta ? `，${meta}` : ""}`);
        });
      }

      if (session.notes) {
        lines.push("");
        lines.push(`备注：${session.notes}`);
      }
      lines.push("");
    });

  lines.push("## 动作库", "");
  data.exercises.forEach((exercise) => {
    lines.push(
      `- ${MUSCLE_LABELS[exercise.muscleGroup]} / ${exercise.name}：${formatValue(
        exercise.defaultWeightKg,
      )}${exercise.defaultWeightKg ? "kg" : ""}，${formatValue(exercise.targetSets)} 组 × ${formatValue(
        exercise.targetReps,
      )}`,
    );
  });

  return lines.join("\n");
}
