import { useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MuscleChip } from "../components/MuscleChip";
import { WorkoutExerciseItem } from "../components/WorkoutExerciseItem";
import {
  buildWorkoutTitle,
  createId,
  inferSessionGroups,
  normalizeOptionalNumber,
} from "../lib/workout";
import type { ActiveWorkoutDraft, CardioEntry, MuscleGroup, SessionExercise, WorkoutSession } from "../types";
import { MUSCLE_LABELS } from "../types";

type ActiveWorkoutPageProps = {
  draft: ActiveWorkoutDraft;
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onSave: (session: WorkoutSession) => void;
  onCancel: () => void;
};

const muscleOptions: MuscleGroup[] = ["back", "chest", "shoulder", "abs", "arms", "legs", "cardio", "custom"];

function parseReps(value: string): number | string | null {
  if (!value.trim()) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && String(numeric) === value.trim() ? numeric : value.trim();
}

export function ActiveWorkoutPage({ draft, notify, onSave, onCancel }: ActiveWorkoutPageProps) {
  const [title, setTitle] = useState(draft.title);
  const [exercises, setExercises] = useState<SessionExercise[]>(draft.exercises);
  const [cardio, setCardio] = useState<CardioEntry[]>(draft.cardio);
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [duration, setDuration] = useState("");
  const [overallFeeling, setOverallFeeling] = useState<WorkoutSession["overallFeeling"]>("normal");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickGroup, setQuickGroup] = useState<MuscleGroup>(draft.muscleGroups[0] ?? "custom");

  function updateExercise(next: SessionExercise) {
    setExercises((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  function addQuickExercise() {
    if (!quickName.trim()) {
      notify("先填动作名", "warning");
      return;
    }

    setExercises((current) => [
      ...current,
      {
        id: createId("temp-ex"),
        name: quickName.trim(),
        muscleGroup: quickGroup,
        completed: false,
        difficulty: null,
        plannedWeightKg: null,
        actualWeightKg: null,
        plannedSets: null,
        actualSets: null,
        plannedReps: null,
        actualReps: null,
        notes: "",
      },
    ]);
    setQuickName("");
    notify("已添加到本次训练");
  }

  function saveWorkout() {
    if (!exercises.length && !cardio.length) {
      notify("没有动作或有氧记录，不能保存", "warning");
      return;
    }

    const now = new Date().toISOString();
    const session: WorkoutSession = {
      id: createId("session"),
      date: draft.date,
      title: title.trim() || buildWorkoutTitle(draft.muscleGroups, cardio),
      muscleGroups: inferSessionGroups({ ...draft, cardio }, exercises),
      exercises,
      cardio: cardio.length ? cardio : undefined,
      durationMinutes: normalizeOptionalNumber(duration),
      overallFeeling,
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };
    onSave(session);
  }

  return (
    <div className="page page--active">
      <header className="page-header">
        <div>
          <p className="eyebrow">训练中</p>
          <input
            className="title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="训练标题"
          />
        </div>
        <div className="chip-line">
          {draft.muscleGroups.map((group) => (
            <MuscleChip group={group} key={group} />
          ))}
        </div>
      </header>

      <section className="panel">
        <div className="section-title">
          <h2>动作清单</h2>
          <span>
            {exercises.filter((exercise) => exercise.completed).length}/{exercises.length}
          </span>
        </div>
        <div className="workout-list">
          {exercises.map((exercise) => (
            <WorkoutExerciseItem
              exercise={exercise}
              key={exercise.id}
              onChange={updateExercise}
              onRemove={() => setExercises((current) => current.filter((item) => item.id !== exercise.id))}
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>临时加动作</h2>
        </div>
        <div className="form-grid form-grid--two">
          <label>
            动作名
            <input value={quickName} onChange={(event) => setQuickName(event.target.value)} />
          </label>
          <label>
            部位
            <select value={quickGroup} onChange={(event) => setQuickGroup(event.target.value as MuscleGroup)}>
              {muscleOptions.map((group) => (
                <option value={group} key={group}>
                  {MUSCLE_LABELS[group]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="button button--secondary" type="button" onClick={addQuickExercise}>
          加入本次
        </button>
      </section>

      {cardio.length ? (
        <section className="panel">
          <div className="section-title">
            <h2>有氧记录</h2>
          </div>
          <div className="form-stack">
            {cardio.map((entry) => (
              <article className="sub-card" key={entry.id}>
                <div className="form-grid form-grid--three">
                  <label>
                    类型
                    <input
                      value={entry.type}
                      onChange={(event) =>
                        setCardio((current) =>
                          current.map((item) =>
                            item.id === entry.id
                              ? { ...item, type: event.target.value as CardioEntry["type"] }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    分钟
                    <input
                      inputMode="decimal"
                      type="number"
                      value={entry.durationMinutes ?? ""}
                      onChange={(event) =>
                        setCardio((current) =>
                          current.map((item) =>
                            item.id === entry.id
                              ? { ...item, durationMinutes: normalizeOptionalNumber(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    公里
                    <input
                      inputMode="decimal"
                      type="number"
                      step="0.1"
                      value={entry.distanceKm ?? ""}
                      onChange={(event) =>
                        setCardio((current) =>
                          current.map((item) =>
                            item.id === entry.id
                              ? { ...item, distanceKm: normalizeOptionalNumber(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-title">
          <h2>总结</h2>
        </div>
        <div className="form-grid form-grid--two">
          <label>
            时长分钟
            <input
              inputMode="decimal"
              type="number"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </label>
          <label>
            状态
            <select
              value={overallFeeling ?? "normal"}
              onChange={(event) => setOverallFeeling(event.target.value as WorkoutSession["overallFeeling"])}
            >
              <option value="great">很好</option>
              <option value="normal">正常</option>
              <option value="tired">累</option>
              <option value="bad">差</option>
            </select>
          </label>
        </div>
        <label>
          总备注
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </section>

      <div className="sticky-actions">
        <button className="button button--ghost" type="button" onClick={() => setConfirmCancel(true)}>
          放弃训练
        </button>
        <button className="button button--primary" type="button" onClick={saveWorkout}>
          保存训练
        </button>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="放弃这次训练？"
        description="当前修改不会保存。"
        danger
        confirmLabel="放弃"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={onCancel}
      />
    </div>
  );
}
