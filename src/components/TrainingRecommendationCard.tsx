import type { MuscleGroup, TrainingRecommendation } from "../types";
import { MUSCLE_LABELS } from "../types";
import { MuscleChip } from "./MuscleChip";

type TrainingRecommendationCardProps = {
  recommendation: TrainingRecommendation;
  onStart: (groups: MuscleGroup[]) => void;
  variant?: "default" | "dashboard";
};

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8z" />
    </svg>
  );
}

export function TrainingRecommendationCard({
  recommendation,
  onStart,
  variant = "default",
}: TrainingRecommendationCardProps) {
  const groups = [...recommendation.primaryGroups, ...(recommendation.secondaryGroups ?? [])];

  return (
    <article className={`recommendation-card recommendation-card--${variant}`}>
      <div className="recommendation-card__icon">
        <StarIcon />
      </div>
      <div className="recommendation-card__content">
        <p className="eyebrow">今日建议</p>
        <h2>{recommendation.title}</h2>
        <div className="chip-line recommendation-card__chips">
          {groups.map((group) => (
            <MuscleChip group={group} key={group} muted />
          ))}
        </div>
        <p>{recommendation.reason}</p>
      </div>
      <button className="button button--primary recommendation-card__button" type="button" onClick={() => onStart(groups)}>
        {recommendation.ctaLabel || `按建议开练：${groups.map((group) => MUSCLE_LABELS[group]).join(" + ")}`}
      </button>
    </article>
  );
}
