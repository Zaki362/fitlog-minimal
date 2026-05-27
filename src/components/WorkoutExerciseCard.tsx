import { useState } from "react";
import { formatNumber, formatPlan, formatRepValue } from "../lib/workout";
import type { SessionExercise } from "../types";
import { DIFFICULTY_LABELS, MUSCLE_LABELS } from "../types";
import { WeightAdjuster } from "./WeightAdjuster";

type WorkoutExerciseCardProps = {
  exercise: SessionExercise;
  onChange: (next: SessionExercise) => void;
};

export function WorkoutExerciseCard({ exercise, onChange }: WorkoutExerciseCardProps) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const planLine =
    exercise.plannedSets || exercise.plannedReps
      ? `${exercise.plannedSets ?? "-"}组 × ${formatRepValue(exercise.plannedReps)}次`
      : formatPlan(exercise);
  const topWeight =
    exercise.actualWeightKg === null || exercise.actualWeightKg === undefined
      ? "无重量"
      : `${formatNumber(exercise.actualWeightKg)}kg`;
  const templateNote = exercise.templateNotes?.trim();
  const workoutNote = exercise.notes ?? "";

  return (
    <article className={`workout-card ${exercise.completed ? "is-completed" : ""}`}>
      <div className="workout-card__top">
        <label className="check-row workout-card__check">
          <input
            type="checkbox"
            checked={exercise.completed}
            onChange={(event) => onChange({ ...exercise, completed: event.target.checked })}
          />
          <span>
            <strong>{exercise.name}</strong>
            <small>
              {MUSCLE_LABELS[exercise.muscleGroup]} · {planLine}
            </small>
          </span>
        </label>
        <strong className="workout-card__weight">{topWeight}</strong>
      </div>

      <WeightAdjuster
        value={exercise.actualWeightKg ?? null}
        onChange={(next) => onChange({ ...exercise, actualWeightKg: next })}
      />

      <div className="workout-card__meta">
        <button className="meta-pill" type="button" onClick={() => setEditingMeta((current) => !current)}>
          本次 {exercise.actualSets ?? "-"}组 × {formatRepValue(exercise.actualReps)}
        </button>
        {editingMeta ? (
          <div className="compact-inputs">
            <label>
              组数
              <input
                inputMode="numeric"
                type="number"
                value={exercise.actualSets ?? ""}
                onChange={(event) =>
                  onChange({ ...exercise, actualSets: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
            <label>
              次数
              <input
                value={exercise.actualReps ?? ""}
                onChange={(event) => onChange({ ...exercise, actualReps: event.target.value })}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="segmented segmented--difficulty" role="group" aria-label="难度">
        {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
          <button
            className={exercise.difficulty === value ? "is-selected" : ""}
            key={value}
            type="button"
            title={label}
            onClick={() => onChange({ ...exercise, difficulty: value as SessionExercise["difficulty"] })}
          >
            {value === "failed" ? "失败" : label}
          </button>
        ))}
      </div>

      {templateNote ? (
        <div className="exercise-hint">
          <span>动作提示</span>
          <p>{templateNote}</p>
        </div>
      ) : null}

      <div className="brief-note">
        <button className="brief-note__button" type="button" onClick={() => setEditingNote((current) => !current)}>
          {editingNote ? "收起备注" : workoutNote ? "编辑备注" : "备注"}
        </button>
        {workoutNote && !editingNote ? <p className="brief-note__preview">{workoutNote}</p> : null}
        {editingNote ? (
          <input
            value={workoutNote}
            onChange={(event) => onChange({ ...exercise, notes: event.target.value })}
            placeholder="可不填"
          />
        ) : null}
      </div>
    </article>
  );
}
