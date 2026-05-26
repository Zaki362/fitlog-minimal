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

function ExerciseThumb({ group }: { group: ExerciseTemplate["muscleGroup"] }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path className="exercise-thumb__body" d="M31 9a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-8 16h16l4 16-7 4-1 12h-8l-1-12-7-4Z" />
      <path
        className={`exercise-thumb__focus exercise-thumb__focus--${group}`}
        d="M23 26h16l2.5 10.5-5.5 3.2-1.2 9.3h-7.6L26 39.7l-5.5-3.2Z"
      />
      <path className="exercise-thumb__line" d="M19 28 8 22M43 28l11-6M27 58h-9M36 58h9" />
    </svg>
  );
}

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
          <ExerciseThumb group={exercise.muscleGroup} />
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
