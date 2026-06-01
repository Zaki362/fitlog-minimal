export type MuscleGroup =
  | "shoulder"
  | "biceps"
  | "back"
  | "triceps"
  | "chest"
  | "abs"
  | "legs"
  | "cardio"
  | "arms"
  | "custom";

export type ExerciseUnit = "kg" | "bodyweight" | "time" | "distance" | "mixed";

export type Difficulty = "easy" | "good" | "hard" | "failed";

export type OverallFeeling = "great" | "normal" | "tired" | "bad";

export interface ExerciseTemplate {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  defaultWeightKg?: number | null;
  targetSets?: number | null;
  targetReps?: number | string | null;
  imageUrl?: string;
  unit: ExerciseUnit;
  notes?: string;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  title: string;
  muscleGroups: MuscleGroup[];
  exercises: SessionExercise[];
  cardio?: CardioEntry[];
  durationMinutes?: number | null;
  overallFeeling?: OverallFeeling | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionExercise {
  id: string;
  exerciseTemplateId?: string;
  name: string;
  muscleGroup: MuscleGroup;
  plannedWeightKg?: number | null;
  actualWeightKg?: number | null;
  plannedSets?: number | null;
  actualSets?: number | null;
  plannedReps?: number | string | null;
  actualReps?: number | string | null;
  completed: boolean;
  difficulty?: Difficulty | null;
  notes?: string;
  templateNotes?: string;
  sets?: SetEntry[];
}

export interface SetEntry {
  setNumber: number;
  weightKg?: number | null;
  reps?: number | string | null;
  completed: boolean;
  rpe?: number | null;
}

export interface CardioEntry {
  id: string;
  type: "爬坡" | "跑步" | "有氧" | "其他";
  durationMinutes?: number | null;
  distanceKm?: number | null;
  notes?: string;
}

export interface ProgressUpdate {
  id: string;
  exerciseTemplateId: string;
  date: string;
  oldWeightKg?: number | null;
  newWeightKg?: number | null;
  oldTargetSets?: number | null;
  newTargetSets?: number | null;
  oldTargetReps?: number | string | null;
  newTargetReps?: number | string | null;
  reason?: string;
  createdAt: string;
}

export type TrainingPlanRole = "main" | "accessory" | "disabled";

export interface TrainingPlanItem {
  id: string;
  muscleGroup: MuscleGroup;
  enabled: boolean;
  role: TrainingPlanRole;
  targetIntervalDays: number;
  priority: number;
  allowStandalone: boolean;
  notes?: string;
  updatedAt: string;
}

export interface TrainingPlan {
  version: number;
  items: TrainingPlanItem[];
  updatedAt: string;
}

export interface AppData {
  exercises: ExerciseTemplate[];
  sessions: WorkoutSession[];
  progressUpdates: ProgressUpdate[];
  trainingPlan?: TrainingPlan;
  version: number;
  updatedAt: string;
}

export interface TrainingRecommendation {
  primaryGroups: MuscleGroup[];
  secondaryGroups: MuscleGroup[];
  title: string;
  reason: string;
  status: "due" | "overdue" | "balanced" | "rest";
  score: number;
  generatedAt: string;
  ctaLabel?: string;
}

export interface ActiveWorkoutDraft {
  date: string;
  title: string;
  muscleGroups: MuscleGroup[];
  exercises: SessionExercise[];
  cardio: CardioEntry[];
  notes?: string;
}

export interface UndertrainedGroup {
  muscleGroup: MuscleGroup;
  label: string;
  lastDate?: string;
  daysSince?: number;
  message: string;
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  shoulder: "肩",
  biceps: "二头",
  back: "背",
  triceps: "三头",
  chest: "胸",
  abs: "腹",
  legs: "腿",
  cardio: "有氧",
  arms: "胳膊",
  custom: "自定义",
};

export const MUSCLE_ORDER: MuscleGroup[] = [
  "back",
  "chest",
  "shoulder",
  "arms",
  "biceps",
  "triceps",
  "abs",
  "legs",
  "cardio",
  "custom",
];

export const PRIMARY_MUSCLE_GROUPS: MuscleGroup[] = ["back", "chest", "shoulder", "legs"];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "轻松",
  good: "正好",
  hard: "吃力",
  failed: "失败 / 不标准",
};

export const OVERALL_FEELING_LABELS: Record<OverallFeeling, string> = {
  great: "很轻松",
  normal: "状态正好",
  tired: "有点吃力",
  bad: "不在状态",
};
