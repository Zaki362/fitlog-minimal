import type { ExerciseTemplate, MuscleGroup } from "../types";

type IllustrationVariant =
  | "latPulldown"
  | "row"
  | "dumbbellRow"
  | "straightArm"
  | "facePull"
  | "overheadPress"
  | "lateralRaise"
  | "frontRaise"
  | "curl"
  | "pushdown"
  | "benchPress"
  | "chestPress"
  | "fly"
  | "plank"
  | "crunch"
  | "legRaise"
  | "twist"
  | "squat"
  | "adductor"
  | "generic";

type ExerciseIllustrationProps = {
  exercise: Pick<ExerciseTemplate, "id" | "name" | "muscleGroup">;
  size?: "card" | "detail";
};

function includesAny(source: string, tokens: string[]): boolean {
  return tokens.some((token) => source.includes(token));
}

function getIllustrationVariant(exercise: Pick<ExerciseTemplate, "id" | "name" | "muscleGroup">): IllustrationVariant {
  const source = `${exercise.id} ${exercise.name}`.toLowerCase();

  if (includesAny(source, ["lat-pulldown", "高位下拉", "窄距下拉", "close-grip-pulldown"])) return "latPulldown";
  if (includesAny(source, ["db-row", "哑铃划船"])) return "dumbbellRow";
  if (includesAny(source, ["row", "划船"])) return "row";
  if (includesAny(source, ["straight-arm", "直臂"])) return "straightArm";
  if (includesAny(source, ["face-pull", "面拉"])) return "facePull";
  if (includesAny(source, ["press", "上推"]) && exercise.muscleGroup === "shoulder") return "overheadPress";
  if (includesAny(source, ["lateral", "侧飞鸟"])) return "lateralRaise";
  if (includesAny(source, ["front-raise", "前提"])) return "frontRaise";
  if (includesAny(source, ["curl", "弯举", "锤举"])) return "curl";
  if (includesAny(source, ["triceps", "下拉", "绳子"]) && exercise.muscleGroup === "triceps") return "pushdown";
  if (includesAny(source, ["bench", "卧推"])) return "benchPress";
  if (includesAny(source, ["seated-press", "坐姿推胸"])) return "chestPress";
  if (includesAny(source, ["fly", "夹胸", "pec-deck", "蝴蝶"])) return "fly";
  if (includesAny(source, ["plank", "平板撑"])) return "plank";
  if (includesAny(source, ["crunch", "卷腹"])) return "crunch";
  if (includesAny(source, ["leg-raise", "leg-kick", "举腿", "踢腿"])) return "legRaise";
  if (includesAny(source, ["twist", "左右交替"])) return "twist";
  if (includesAny(source, ["squat", "深蹲"])) return "squat";
  if (includesAny(source, ["adductor", "内收"])) return "adductor";

  return "generic";
}

function CableFrame() {
  return (
    <>
      <path className="exercise-illustration__equipment" d="M16 8h64M20 8v62M76 8v62" />
      <circle className="exercise-illustration__joint" cx="48" cy="8" r="2.4" />
    </>
  );
}

function renderVariant(variant: IllustrationVariant) {
  switch (variant) {
    case "latPulldown":
      return (
        <>
          <CableFrame />
          <path className="exercise-illustration__equipment" d="M28 19h40M48 10v17" />
          <path className="exercise-illustration__body" d="M39 34a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" />
          <path className="exercise-illustration__muscle" d="M37 43c7 5 15 5 22 0l2 13c-8 5-18 5-26 0Z" />
          <path className="exercise-illustration__line" d="M37 44 28 24M59 44l9-20M36 57h24M41 58l-8 12M55 58l8 12" />
          <path className="exercise-illustration__equipment" d="M32 70h32" />
        </>
      );
    case "row":
      return (
        <>
          <path className="exercise-illustration__equipment" d="M76 18v44M76 39H54M16 63h58" />
          <path className="exercise-illustration__body" d="M32 23a5.4 5.4 0 1 1 10.8 0 5.4 5.4 0 0 1-10.8 0Z" />
          <path className="exercise-illustration__muscle" d="M32 32c9 0 18 6 21 15l-7 5c-4-7-10-12-18-14Z" />
          <path className="exercise-illustration__line" d="M32 36 22 54M46 44l-18 3M52 43l15-4M67 36l7 3-7 3M23 55h26M32 55l-10 13M45 55l13 13" />
        </>
      );
    case "dumbbellRow":
      return (
        <>
          <path className="exercise-illustration__equipment" d="M17 53h35M20 53l-5 18M49 53l6 18" />
          <path className="exercise-illustration__body" d="M42 20a5.2 5.2 0 1 1 10.4 0 5.2 5.2 0 0 1-10.4 0Z" />
          <path className="exercise-illustration__muscle" d="M35 30c12-1 22 4 30 14l-5 8c-10-8-19-12-30-13Z" />
          <path className="exercise-illustration__line" d="M34 36 24 52M56 41l7 17M64 58h13M65 54h10M30 39l-6 17M45 52l8 19M34 52l-6 19" />
        </>
      );
    case "straightArm":
      return (
        <>
          <CableFrame />
          <path className="exercise-illustration__equipment" d="M48 9 68 28" />
          <path className="exercise-illustration__body" d="M41 28a5.8 5.8 0 1 1 11.6 0 5.8 5.8 0 0 1-11.6 0Z" />
          <path className="exercise-illustration__muscle" d="M38 38h18l3 17c-7 4-16 4-23 0Z" />
          <path className="exercise-illustration__line" d="M56 41 70 55M66 57h12M39 41 29 56M39 56l-6 15M55 56l8 15" />
        </>
      );
    case "facePull":
      return (
        <>
          <CableFrame />
          <path className="exercise-illustration__equipment" d="M48 14 69 35M64 31l10 9M69 35l5-8" />
          <path className="exercise-illustration__body" d="M40 31a5.8 5.8 0 1 1 11.6 0 5.8 5.8 0 0 1-11.6 0Z" />
          <path className="exercise-illustration__muscle" d="M36 41h20l3 15c-7 4-19 4-26 0Z" />
          <path className="exercise-illustration__line" d="M55 42 68 35M37 42 30 52M39 57l-8 14M54 57l8 14" />
        </>
      );
    case "overheadPress":
      return (
        <>
          <path className="exercise-illustration__body" d="M42 25a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" />
          <path className="exercise-illustration__muscle" d="M37 36h22l4 20c-8 5-22 5-30 0Z" />
          <path className="exercise-illustration__line" d="M38 39 29 19M58 39l9-20M25 18h8M63 18h8M40 57l-9 15M56 57l9 15M34 72h31" />
        </>
      );
    case "lateralRaise":
      return (
        <>
          <path className="exercise-illustration__body" d="M42 24a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" />
          <path className="exercise-illustration__muscle" d="M35 36h26l3 18c-9 5-23 5-32 0Z" />
          <path className="exercise-illustration__line" d="M35 39 16 35M61 39l19-4M11 33h8M77 33h8M40 56l-8 16M56 56l8 16" />
        </>
      );
    case "frontRaise":
      return (
        <>
          <path className="exercise-illustration__equipment" d="M27 35h42M24 31v8M72 31v8" />
          <path className="exercise-illustration__body" d="M42 23a5.8 5.8 0 1 1 11.6 0 5.8 5.8 0 0 1-11.6 0Z" />
          <path className="exercise-illustration__muscle" d="M36 34h24l3 19c-9 5-21 5-30 0Z" />
          <path className="exercise-illustration__line" d="M36 38 29 35M60 38l7-3M40 55l-9 17M56 55l9 17" />
        </>
      );
    case "curl":
      return (
        <>
          <path className="exercise-illustration__body" d="M42 21a5.8 5.8 0 1 1 11.6 0 5.8 5.8 0 0 1-11.6 0Z" />
          <path className="exercise-illustration__muscle" d="M36 32h24l3 21c-8 5-22 5-30 0Z" />
          <path className="exercise-illustration__line" d="M36 36 27 50M60 36l9 14M24 48h8M65 48h8M40 55l-7 17M56 55l7 17" />
          <path className="exercise-illustration__equipment" d="M21 45v8M75 45v8" />
        </>
      );
    case "pushdown":
      return (
        <>
          <CableFrame />
          <path className="exercise-illustration__equipment" d="M48 9v28M42 37h12" />
          <path className="exercise-illustration__body" d="M42 25a5.6 5.6 0 1 1 11.2 0 5.6 5.6 0 0 1-11.2 0Z" />
          <path className="exercise-illustration__muscle" d="M36 35h24l3 20c-8 5-22 5-30 0Z" />
          <path className="exercise-illustration__line" d="M36 39 35 56M60 39l1 17M31 57h9M56 57h9M40 57l-8 14M56 57l8 14" />
        </>
      );
    case "benchPress":
      return (
        <>
          <path className="exercise-illustration__equipment" d="M18 39h60M24 35v13M72 35v13M18 58h52" />
          <path className="exercise-illustration__body" d="M28 49a5.4 5.4 0 1 1 10.8 0 5.4 5.4 0 0 1-10.8 0Z" />
          <path className="exercise-illustration__muscle" d="M40 48c10-5 21-3 30 4l-4 8c-10-4-19-5-28-1Z" />
          <path className="exercise-illustration__line" d="M43 49 34 39M62 50l-5-11M37 58l-9 13M58 60l13 10M14 38v4M82 38v4" />
        </>
      );
    case "chestPress":
      return (
        <>
          <path className="exercise-illustration__equipment" d="M19 62h18M24 32v30M70 25v45M70 36H55" />
          <path className="exercise-illustration__body" d="M36 25a5.8 5.8 0 1 1 11.6 0 5.8 5.8 0 0 1-11.6 0Z" />
          <path className="exercise-illustration__muscle" d="M30 36h25l4 18c-8 5-23 5-31 0Z" />
          <path className="exercise-illustration__line" d="M55 39 71 37M55 47 71 48M31 55l-7 15M51 56l9 14" />
        </>
      );
    case "fly":
      return (
        <>
          <CableFrame />
          <path className="exercise-illustration__equipment" d="M20 10 35 40M76 10 61 40" />
          <path className="exercise-illustration__body" d="M42 24a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" />
          <path className="exercise-illustration__muscle" d="M34 36h28l3 18c-9 6-25 6-34 0Z" />
          <path className="exercise-illustration__line" d="M35 40 24 50M61 40l11 10M24 50h-7M72 50h7M40 56l-8 15M56 56l8 15" />
        </>
      );
    case "plank":
      return (
        <>
          <path className="exercise-illustration__body" d="M20 45a5.4 5.4 0 1 1 10.8 0 5.4 5.4 0 0 1-10.8 0Z" />
          <path className="exercise-illustration__muscle" d="M31 45c18-5 34-3 48 6l-3 8c-16-5-31-7-47-3Z" />
          <path className="exercise-illustration__line" d="M32 51 21 63M46 53l-3 15M76 56l12 9M17 64h20M68 64h22" />
        </>
      );
    case "crunch":
      return (
        <>
          <path className="exercise-illustration__equipment" d="M14 64h70" />
          <path className="exercise-illustration__body" d="M28 38a5.8 5.8 0 1 1 11.6 0 5.8 5.8 0 0 1-11.6 0Z" />
          <path className="exercise-illustration__muscle" d="M39 43c11 0 21 6 28 16l-7 6c-9-6-18-10-29-9Z" />
          <path className="exercise-illustration__line" d="M38 43 26 31M56 59l13-10M65 59l14-2M44 58l-10 9" />
        </>
      );
    case "legRaise":
      return (
        <>
          <path className="exercise-illustration__equipment" d="M14 65h68" />
          <path className="exercise-illustration__body" d="M22 47a5.4 5.4 0 1 1 10.8 0 5.4 5.4 0 0 1-10.8 0Z" />
          <path className="exercise-illustration__muscle" d="M34 48c12 1 21 6 28 15l-5 6c-10-4-20-7-31-6Z" />
          <path className="exercise-illustration__line" d="M58 62 70 32M65 64l16-28M37 61l-12 7M29 50 18 44" />
        </>
      );
    case "twist":
      return (
        <>
          <path className="exercise-illustration__body" d="M43 20a5.8 5.8 0 1 1 11.6 0 5.8 5.8 0 0 1-11.6 0Z" />
          <path className="exercise-illustration__muscle" d="M37 31h24l5 18c-8 5-22 5-30 0Z" />
          <path className="exercise-illustration__line" d="M38 36 24 48M60 36l15 6M24 48l-9 1M72 41l8-1M39 51 27 68M58 51l13 17" />
          <circle className="exercise-illustration__plate" cx="20" cy="49" r="5" />
        </>
      );
    case "squat":
      return (
        <>
          <path className="exercise-illustration__equipment" d="M20 9v64M76 9v64M23 21h50M17 21h10M69 21h10" />
          <path className="exercise-illustration__body" d="M42 27a5.8 5.8 0 1 1 11.6 0 5.8 5.8 0 0 1-11.6 0Z" />
          <path className="exercise-illustration__muscle" d="M36 37h24l5 18c-8 5-24 5-32 0Z" />
          <path className="exercise-illustration__line" d="M36 38 26 49M60 38l11 11M38 56l-13 14M58 56l13 14M25 70h16M56 70h16" />
        </>
      );
    case "adductor":
      return (
        <>
          <path className="exercise-illustration__equipment" d="M16 62h64M26 42v20M70 38v24M28 47h40" />
          <path className="exercise-illustration__body" d="M42 23a5.8 5.8 0 1 1 11.6 0 5.8 5.8 0 0 1-11.6 0Z" />
          <path className="exercise-illustration__muscle" d="M36 34h24l3 18c-8 5-22 5-30 0Z" />
          <path className="exercise-illustration__line" d="M35 52 22 44M61 52l15-12M23 44l-6 12M75 40l8 12" />
        </>
      );
    default:
      return (
        <>
          <path className="exercise-illustration__body" d="M42 18a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" />
          <path className="exercise-illustration__muscle" d="M35 30h26l4 24c-9 6-25 6-34 0Z" />
          <path className="exercise-illustration__line" d="M35 34 22 48M61 34l13 14M40 56l-9 17M56 56l9 17M26 73h13M57 73h13" />
        </>
      );
  }
}

export function ExerciseIllustration({ exercise, size = "card" }: ExerciseIllustrationProps) {
  const variant = getIllustrationVariant(exercise);
  const groupClass = `exercise-illustration--${exercise.muscleGroup as MuscleGroup}`;

  return (
    <svg
      className={`exercise-illustration exercise-illustration--${size} ${groupClass}`}
      viewBox="0 0 96 80"
      role="img"
      aria-label={`${exercise.name}动作插画`}
    >
      <title>{exercise.name}</title>
      <ellipse className="exercise-illustration__shadow" cx="48" cy="73" rx="34" ry="3.5" />
      {renderVariant(variant)}
    </svg>
  );
}
