import type { AppData, MuscleGroup, TrainingPlan, TrainingPlanItem, TrainingPlanRole } from "../types";
import { MUSCLE_LABELS } from "../types";

export const TRAINING_PLAN_VERSION = 2;
export const TRAINING_PLAN_GROUPS: MuscleGroup[] = ["legs", "back", "chest", "shoulder", "abs", "cardio", "arms"];

const DEFAULT_PLAN_DEFS: Array<
  Pick<TrainingPlanItem, "muscleGroup" | "enabled" | "role" | "targetIntervalDays" | "priority" | "allowStandalone" | "notes">
> = [
  {
    muscleGroup: "legs",
    enabled: true,
    role: "main",
    targetIntervalDays: 14,
    priority: 100,
    allowStandalone: true,
  },
  {
    muscleGroup: "back",
    enabled: true,
    role: "main",
    targetIntervalDays: 7,
    priority: 90,
    allowStandalone: true,
  },
  {
    muscleGroup: "chest",
    enabled: true,
    role: "main",
    targetIntervalDays: 7,
    priority: 85,
    allowStandalone: true,
  },
  {
    muscleGroup: "shoulder",
    enabled: true,
    role: "main",
    targetIntervalDays: 7,
    priority: 80,
    allowStandalone: true,
  },
  {
    muscleGroup: "abs",
    enabled: true,
    role: "accessory",
    targetIntervalDays: 2,
    priority: 70,
    allowStandalone: true,
    notes: "通常作为收尾训练",
  },
  {
    muscleGroup: "cardio",
    enabled: true,
    role: "accessory",
    targetIntervalDays: 7,
    priority: 50,
    allowStandalone: true,
    notes: "可以作为轻量补充",
  },
  {
    muscleGroup: "arms",
    enabled: false,
    role: "disabled",
    targetIntervalDays: 14,
    priority: 10,
    allowStandalone: false,
    notes: "当前不会单独推荐胳膊训练",
  },
];

export function normalizeTrainingPlanGroup(group: MuscleGroup | null | undefined): MuscleGroup | null {
  if (!group || group === "custom") {
    return null;
  }
  if (group === "biceps" || group === "triceps") {
    return "arms";
  }
  return TRAINING_PLAN_GROUPS.includes(group) ? group : null;
}

export function getDefaultTrainingPlan(updatedAt = new Date().toISOString()): TrainingPlan {
  return {
    version: TRAINING_PLAN_VERSION,
    updatedAt,
    items: DEFAULT_PLAN_DEFS.map((item) => ({
      id: `plan-${item.muscleGroup}`,
      updatedAt,
      ...item,
    })),
  };
}

export function normalizePlanRole(role: unknown): TrainingPlanRole {
  return role === "main" || role === "accessory" || role === "disabled" ? role : "disabled";
}

export function clampIntervalDays(value: number): number {
  if (!Number.isFinite(value)) {
    return 7;
  }
  return Math.min(30, Math.max(1, Math.round(value)));
}

export function mergeTrainingPlan(plan: TrainingPlan | undefined, updatedAt = new Date().toISOString()): TrainingPlan {
  const defaults = getDefaultTrainingPlan(plan?.updatedAt || updatedAt);
  if (!plan?.items?.length) {
    return defaults;
  }

  const existingByGroup = new Map<MuscleGroup, TrainingPlanItem>();
  plan.items.forEach((item) => {
    const group = normalizeTrainingPlanGroup(item.muscleGroup);
    if (group) {
      existingByGroup.set(group, item);
    }
  });

  const items = defaults.items.map((defaultItem) => {
    const existing = existingByGroup.get(defaultItem.muscleGroup);
    if (!existing) {
      return defaultItem;
    }

    const role = normalizePlanRole(existing.role);
    return {
      ...defaultItem,
      ...existing,
      id: existing.id || defaultItem.id,
      muscleGroup: defaultItem.muscleGroup,
      enabled: role === "disabled" ? false : Boolean(existing.enabled),
      role,
      targetIntervalDays: clampIntervalDays(existing.targetIntervalDays),
      priority: Number.isFinite(existing.priority) ? existing.priority : defaultItem.priority,
      allowStandalone: role === "disabled" ? false : Boolean(existing.allowStandalone),
      notes: typeof existing.notes === "string" ? existing.notes : defaultItem.notes,
      updatedAt: existing.updatedAt || plan.updatedAt || updatedAt,
    };
  });

  const latestUpdatedAt =
    [plan.updatedAt, ...items.map((item) => item.updatedAt)].filter(Boolean).sort((a, b) => b.localeCompare(a))[0] ||
    updatedAt;

  return {
    version: TRAINING_PLAN_VERSION,
    updatedAt: latestUpdatedAt,
    items,
  };
}

export function ensureTrainingPlan(data: AppData): AppData {
  return {
    ...data,
    version: Math.max(data.version || 1, TRAINING_PLAN_VERSION),
    trainingPlan: mergeTrainingPlan(data.trainingPlan, data.updatedAt),
  };
}

export function getPlanItemForGroup(
  group: MuscleGroup,
  trainingPlan: TrainingPlan | undefined,
): TrainingPlanItem | undefined {
  const normalizedGroup = normalizeTrainingPlanGroup(group);
  if (!normalizedGroup) {
    return undefined;
  }
  return mergeTrainingPlan(trainingPlan).items.find((item) => item.muscleGroup === normalizedGroup);
}

export function formatTrainingPlanReason(
  group: MuscleGroup,
  _planItem: TrainingPlanItem,
  daysSince: number | null,
): string {
  const label = `${MUSCLE_LABELS[group]}${group === "abs" || group === "legs" || group === "chest" || group === "back" || group === "shoulder" ? "部" : ""}`;
  if (daysSince === null) {
    return `${label}还没有训练记录`;
  }
  if (daysSince === 0) {
    return `${label}今天练过`;
  }
  return `${label}已 ${daysSince} 天未练`;
}

export function formatNextDueStatus(planItem: TrainingPlanItem, daysSince: number | null): string {
  if (!planItem.enabled || planItem.role === "disabled") {
    return "不参与提醒";
  }
  if (daysSince === null) {
    return "还没有训练记录";
  }

  const remaining = planItem.targetIntervalDays - daysSince;
  if (remaining > 0) {
    return `${remaining} 天后应练`;
  }
  if (remaining === 0) {
    return "今天到期";
  }
  return `已超期 ${Math.abs(remaining)} 天`;
}
