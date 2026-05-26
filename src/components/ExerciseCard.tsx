import type { ExerciseTemplate } from "../types";
import { MUSCLE_LABELS } from "../types";
import { formatPlan } from "../lib/workout";

type ExerciseCardProps = {
  exercise: ExerciseTemplate;
  lastDate?: string;
  onOpen: () => void;
  onEdit: () => void;
  onUpdateWeight: () => void;
  onArchive: () => void;
};

export function ExerciseCard({
  exercise,
  lastDate,
  onOpen,
  onEdit,
  onUpdateWeight,
  onArchive,
}: ExerciseCardProps) {
  return (
    <article className="exercise-card">
      <button className="card-hit" type="button" onClick={onOpen} aria-label={`查看 ${exercise.name}`} />
      <div className="card-row">
        <div>
          <p className="eyebrow">{MUSCLE_LABELS[exercise.muscleGroup]}</p>
          <h3>{exercise.name}</h3>
        </div>
        <strong>{exercise.defaultWeightKg ? `${exercise.defaultWeightKg}kg` : "-"}</strong>
      </div>
      <p className="muted">{formatPlan(exercise)}</p>
      {exercise.notes ? <p className="exercise-card__note">{exercise.notes}</p> : null}
      <div className="card-row card-row--compact">
        <small>{lastDate ? `最近 ${lastDate}` : "暂无记录"}</small>
        <div className="inline-actions">
          <button className="icon-button" type="button" title="更新重量" onClick={onUpdateWeight}>
            kg
          </button>
          <button className="icon-button" type="button" title="编辑动作" onClick={onEdit}>
            编辑
          </button>
          <button className="icon-button icon-button--danger" type="button" title="归档动作" onClick={onArchive}>
            归档
          </button>
        </div>
      </div>
    </article>
  );
}
