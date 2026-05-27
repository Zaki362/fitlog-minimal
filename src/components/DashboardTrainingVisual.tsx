import type { ExerciseTemplate, MuscleGroup, TrainingRecommendation } from "../types";
import { MUSCLE_LABELS } from "../types";
import { ExerciseIllustration } from "./ExerciseIllustration";
import { MuscleChip } from "./MuscleChip";

type DashboardTrainingVisualProps = {
  heroExercise?: ExerciseTemplate;
  recommendation: TrainingRecommendation;
  onStart: (groups: MuscleGroup[]) => void;
};

const fallbackHeroByGroup: Record<MuscleGroup, Pick<ExerciseTemplate, "id" | "name" | "muscleGroup">> = {
  shoulder: { id: "ex-shoulder-press", name: "上推", muscleGroup: "shoulder" },
  biceps: { id: "ex-biceps-curl", name: "弯举", muscleGroup: "biceps" },
  back: { id: "ex-back-lat-pulldown", name: "高位下拉", muscleGroup: "back" },
  triceps: { id: "ex-triceps-pronated-pulldown", name: "龙门架正握下拉", muscleGroup: "triceps" },
  chest: { id: "ex-chest-bench-press", name: "卧推", muscleGroup: "chest" },
  abs: { id: "ex-abs-crunch-ankle", name: "卷腹摸脚踝", muscleGroup: "abs" },
  legs: { id: "ex-legs-smith-squat", name: "杠铃深蹲 史密斯", muscleGroup: "legs" },
  cardio: { id: "home-cardio", name: "有氧", muscleGroup: "cardio" },
  arms: { id: "ex-biceps-curl", name: "弯举", muscleGroup: "biceps" },
  custom: { id: "home-custom", name: "自定义训练", muscleGroup: "custom" },
};

export function DashboardTrainingVisual({
  heroExercise,
  recommendation,
  onStart,
}: DashboardTrainingVisualProps) {
  const groups = [...recommendation.primaryGroups, ...(recommendation.secondaryGroups ?? [])];
  const primaryGroup = recommendation.primaryGroups[0] ?? "custom";
  const hero = heroExercise ?? fallbackHeroByGroup[primaryGroup];

  return (
    <article className="dashboard-visual-card">
      <div className="dashboard-visual-card__hero">
        <div className="dashboard-visual-card__art">
          <span>今日任务</span>
          <ExerciseIllustration exercise={hero} size="hero" />
        </div>
        <div className="dashboard-visual-card__copy">
          <p className="eyebrow">本次训练建议</p>
          <h2>{recommendation.title}</h2>
          <div className="chip-line dashboard-visual-card__chips">
            {groups.map((group) => (
              <MuscleChip group={group} key={group} muted />
            ))}
          </div>
          <p>{recommendation.reason}</p>
          <button className="button button--primary dashboard-visual-card__button" type="button" onClick={() => onStart(groups)}>
            {recommendation.ctaLabel ?? "按建议开练"}
          </button>
        </div>
      </div>
    </article>
  );
}
