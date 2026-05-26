import type { SessionExercise } from "../types";
import { DIFFICULTY_LABELS } from "../types";
import { formatPlan, normalizeOptionalNumber } from "../lib/workout";

type WorkoutExerciseItemProps = {
  exercise: SessionExercise;
  onChange: (next: SessionExercise) => void;
  onRemove?: () => void;
};

export function WorkoutExerciseItem({ exercise, onChange, onRemove }: WorkoutExerciseItemProps) {
  return (
    <article className={`workout-item ${exercise.completed ? "is-completed" : ""}`}>
      <div className="workout-item__head">
        <label className="check-row">
          <input
            type="checkbox"
            checked={exercise.completed}
            onChange={(event) => onChange({ ...exercise, completed: event.target.checked })}
          />
          <span>
            <strong>{exercise.name}</strong>
            <small>{formatPlan(exercise)}</small>
          </span>
        </label>
        {onRemove ? (
          <button className="icon-button icon-button--danger" type="button" onClick={onRemove}>
            删除
          </button>
        ) : null}
      </div>

      <div className="form-grid form-grid--three">
        <label>
          本次重量
          <input
            inputMode="decimal"
            type="number"
            step="0.5"
            value={exercise.actualWeightKg ?? ""}
            onChange={(event) =>
              onChange({ ...exercise, actualWeightKg: normalizeOptionalNumber(event.target.value) })
            }
          />
        </label>
        <label>
          本次组数
          <input
            inputMode="numeric"
            type="number"
            value={exercise.actualSets ?? ""}
            onChange={(event) =>
              onChange({ ...exercise, actualSets: normalizeOptionalNumber(event.target.value) })
            }
          />
        </label>
        <label>
          本次次数
          <input
            inputMode="text"
            value={exercise.actualReps ?? ""}
            onChange={(event) => onChange({ ...exercise, actualReps: event.target.value })}
          />
        </label>
      </div>

      <div className="segmented" role="group" aria-label="难度">
        {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
          <button
            className={exercise.difficulty === value ? "is-selected" : ""}
            key={value}
            type="button"
            onClick={() => onChange({ ...exercise, difficulty: value as SessionExercise["difficulty"] })}
          >
            {label}
          </button>
        ))}
      </div>

      <label>
        本次备注
        <textarea
          rows={2}
          value={exercise.notes ?? ""}
          onChange={(event) => onChange({ ...exercise, notes: event.target.value })}
        />
      </label>
    </article>
  );
}
