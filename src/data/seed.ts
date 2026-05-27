import type {
  AppData,
  CardioEntry,
  ExerciseTemplate,
  ExerciseUnit,
  MuscleGroup,
  WorkoutSession,
} from "../types";
import { getDefaultTrainingPlan, TRAINING_PLAN_VERSION } from "../lib/trainingPlan";

const SEED_YEAR = 2026;
const VERSION = TRAINING_PLAN_VERSION;
const BASE_TIME = `${SEED_YEAR}-01-01T00:00:00.000Z`;

function exercise(
  id: string,
  name: string,
  muscleGroup: MuscleGroup,
  defaultWeightKg: number | null,
  targetSets: number | null,
  targetReps: number | string | null,
  unit: ExerciseUnit = "kg",
  notes = "",
  imageName?: string,
): ExerciseTemplate {
  return {
    id,
    name,
    muscleGroup,
    defaultWeightKg,
    targetSets,
    targetReps,
    unit,
    notes,
    imageUrl: imageName ? `/exercises/${imageName}` : undefined,
    isFavorite: false,
    isArchived: false,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
  };
}

function cardio(
  id: string,
  type: CardioEntry["type"],
  durationMinutes?: number | null,
  distanceKm?: number | null,
  notes = "",
): CardioEntry {
  return {
    id,
    type,
    durationMinutes: durationMinutes ?? null,
    distanceKm: distanceKm ?? null,
    notes,
  };
}

function session(
  id: string,
  mmdd: string,
  title: string,
  muscleGroups: MuscleGroup[],
  cardioEntries: CardioEntry[] = [],
): WorkoutSession {
  const month = mmdd.slice(0, 2);
  const day = mmdd.slice(2, 4);
  const date = `${SEED_YEAR}-${month}-${day}`;

  return {
    id,
    date,
    title,
    muscleGroups,
    exercises: [],
    cardio: cardioEntries.length ? cardioEntries : undefined,
    durationMinutes: null,
    overallFeeling: null,
    notes: "初始历史记录",
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

export const seedExercises: ExerciseTemplate[] = [
  exercise("ex-shoulder-rear-delt", "后束", "shoulder", 27.5, 4, 12, "kg", "", "rear-delt-fly.png"),
  exercise("ex-shoulder-face-pull", "面拉", "shoulder", 20, 4, 12, "kg", "", "face-pull.png"),
  exercise("ex-shoulder-press", "上推", "shoulder", 16, 4, 12, "kg", "", "shoulder-press.png"),
  exercise("ex-shoulder-lateral-raise", "侧飞鸟", "shoulder", 6, 4, 12, "kg", "", "lateral-raise.png"),
  exercise("ex-shoulder-front-raise", "杠铃前提", "shoulder", 20, 4, 12, "kg", "", "barbell-front-raise.png"),

  exercise("ex-biceps-curl", "弯举", "biceps", 7.5, 3, 10, "kg", "很吃力", "biceps-curl.png"),
  exercise("ex-biceps-hammer-curl", "锤举", "biceps", 6, null, "左右交替10个", "kg", "", "hammer-curl.png"),

  exercise("ex-back-lat-pulldown", "高位下拉", "back", 40, 4, 12, "kg", "", "lat-pulldown.png"),
  exercise("ex-back-close-grip-pulldown", "窄距下拉", "back", 33, 4, 12, "kg", "", "close-grip-pulldown.png"),
  exercise("ex-back-row", "划船", "back", 26, 4, 12, "kg", "", "seated-row.png"),
  exercise("ex-back-db-row", "哑铃划船", "back", 10, 4, 12, "kg", "腰低一点和地面平行", "dumbbell-row.png"),
  exercise("ex-back-straight-arm-pushdown", "绳索直臂下压", "back", 15, null, null, "kg", "", "straight-arm-pulldown.png"),

  exercise("ex-triceps-reverse-pulldown", "龙门架反握下拉", "triceps", 23, 4, 10, "kg", "后面的下不去", "reverse-triceps-pushdown.png"),
  exercise("ex-triceps-pronated-pulldown", "龙门架正握下拉", "triceps", 23, 4, 10, "kg", "不标准下不去", "triceps-pushdown.png"),
  exercise("ex-triceps-rope-pulldown", "龙门架绳子下拉", "triceps", 18, null, null, "kg", "", "rope-pushdown.png"),

  exercise(
    "ex-chest-bench-press",
    "卧推",
    "chest",
    12.5,
    null,
    "17.5kg 5个；12.5kg 做组",
    "mixed",
    "17.5kg 5个，12.5kg 做组",
    "bench-press.png",
  ),
  exercise("ex-chest-seated-press", "坐姿推胸", "chest", 20, 4, null, "kg", "", "seated-chest-press.png"),
  exercise("ex-chest-cable-fly", "龙门架夹胸", "chest", 8, 4, 12, "kg", "", "cable-fly.png"),
  exercise(
    "ex-chest-pec-deck",
    "蝴蝶机夹胸",
    "chest",
    20,
    4,
    12,
    "kg",
    "不要夹胳膊做！手肘打开",
    "pec-deck-fly.png",
  ),

  exercise("ex-abs-plank-activation", "平板撑激活", "abs", null, null, null, "bodyweight", "", "plank-activation.png"),
  exercise("ex-abs-crunch-ankle", "卷腹摸脚踝", "abs", null, 4, 20, "bodyweight", "", "ankle-touches-crunch.png"),
  exercise("ex-abs-leg-kick", "上踢腿练下腹", "abs", null, 4, 20, "bodyweight", "", "leg-raise-lower-abs.png"),
  exercise("ex-abs-russian-twist", "左右交替", "abs", 5, 4, "一共40", "mixed", "5kg杠铃片", "weighted-russian-twist.png"),
  exercise("ex-abs-leg-raise", "仰卧举腿", "abs", null, 4, 20, "bodyweight", "", "lying-leg-raise.png"),
  exercise("ex-abs-plank", "平板撑", "abs", null, null, "1分半收尾", "time", "", "plank-finisher.png"),

  exercise("ex-legs-smith-squat", "杠铃深蹲 史密斯", "legs", 15, null, null, "kg", "", "smith-squat.png"),
  exercise("ex-legs-adductor", "内收", "legs", null, null, null, "mixed", "", "hip-adduction.png"),
];

export const seedSessions: WorkoutSession[] = [
  session("seed-0227", "0227", "背 + 爬坡 1h", ["back", "cardio"], [
    cardio("cardio-0227", "爬坡", 60),
  ]),
  session("seed-0228", "0228", "腹 + 爬坡 40mins", ["abs", "cardio"], [
    cardio("cardio-0228", "爬坡", 40),
  ]),
  session("seed-0303", "0303", "胸 + 爬坡 30mins", ["chest", "cardio"], [
    cardio("cardio-0303", "爬坡", 30),
  ]),
  session("seed-0322", "0322", "胳膊 + 腹", ["arms", "abs"]),
  session("seed-0326", "0326", "肩", ["shoulder"]),
  session("seed-0327", "0327", "背", ["back"]),
  session("seed-0329", "0329", "胸", ["chest"]),
  session("seed-0330", "0330", "肩", ["shoulder"]),
  session("seed-0403", "0403", "背 + 腹部", ["back", "abs"]),
  session("seed-0404", "0404", "胸", ["chest"]),
  session("seed-0406", "0406", "肩 + 有氧", ["shoulder", "cardio"], [
    cardio("cardio-0406", "有氧"),
  ]),
  session("seed-0410", "0410", "背", ["back"]),
  session("seed-0411", "0411", "胸", ["chest"]),
  session("seed-0417", "0417", "背", ["back"]),
  session("seed-0421", "0421", "胸 + 腹", ["chest", "abs"]),
  session("seed-0422", "0422", "肩", ["shoulder"]),
  session("seed-0426", "0426", "背 + 腹", ["back", "abs"]),
  session("seed-0501", "0501", "背", ["back"]),
  session("seed-0502", "0502", "腹 + 跑步 5km", ["abs", "cardio"], [
    cardio("cardio-0502", "跑步", null, 5),
  ]),
  session("seed-0503", "0503", "肩", ["shoulder"]),
  session("seed-0505", "0505", "胸 + 腹", ["chest", "abs"]),
  session("seed-0513", "0513", "背 + 腹", ["back", "abs"]),
  session("seed-0515", "0515", "肩 + 腹", ["shoulder", "abs"]),
  session("seed-0520", "0520", "背 + 腹", ["back", "abs"]),
];

export const seedData: AppData = {
  version: VERSION,
  updatedAt: BASE_TIME,
  exercises: seedExercises,
  sessions: seedSessions,
  progressUpdates: [],
  trainingPlan: getDefaultTrainingPlan(BASE_TIME),
};

export function createSeedData(): AppData {
  return JSON.parse(JSON.stringify(seedData)) as AppData;
}
