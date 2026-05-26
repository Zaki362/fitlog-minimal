import type { ExerciseTemplate } from "../types";
import { MUSCLE_LABELS } from "../types";
import { formatPlan } from "../lib/workout";
import { ExerciseIllustration } from "./ExerciseIllustration";

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
      <div className="exercise-card__main">
        <div className="exercise-thumb">
          <ExerciseIllustration exercise={exercise} />
        </div>
        <div className="exercise-card__copy">
          <h3>{exercise.name}</h3>
          <p>{formatPlan(exercise)}</p>
          <small>最近：{lastDate ?? "暂无记录"}</small>
        </div>
        <div className="exercise-card__menu" aria-label={`${MUSCLE_LABELS[exercise.muscleGroup]}动作操作`}>
          <button className="icon-button icon-button--mini" type="button" title="更新重量" onClick={onUpdateWeight}>
            kg
          </button>
          <button className="icon-button icon-button--mini" type="button" title="编辑动作" onClick={onEdit}>
            编辑
          </button>
          <button className="icon-button icon-button--mini icon-button--danger" type="button" title="归档动作" onClick={onArchive}>
            ...
          </button>
        </div>
      </div>
      {exercise.notes ? <p className="exercise-card__note">{exercise.notes}</p> : null}
    </article>
  );
}
