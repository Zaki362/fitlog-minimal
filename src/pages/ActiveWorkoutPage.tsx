import { useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MuscleChip } from "../components/MuscleChip";
import { WorkoutExerciseCard } from "../components/WorkoutExerciseCard";
import { formatDateCN } from "../lib/date";
import { buildWorkoutTitle, createId, inferSessionGroups, normalizeOptionalNumber } from "../lib/workout";
import type { ActiveWorkoutDraft, AppData, CardioEntry, SessionExercise, WorkoutSession } from "../types";

type ActiveWorkoutPageProps = {
  data: AppData;
  draft: ActiveWorkoutDraft;
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onSave: (session: WorkoutSession, updateTemplates: boolean) => void;
  onCancel: () => void;
};

function sameRep(a: number | string | null | undefined, b: number | string | null | undefined): boolean {
  return String(a ?? "") === String(b ?? "");
}

function isExerciseModified(current: SessionExercise, original?: SessionExercise): boolean {
  if (!original) return true;
  return (
    current.completed ||
    current.actualWeightKg !== original.actualWeightKg ||
    current.actualSets !== original.actualSets ||
    !sameRep(current.actualReps, original.actualReps) ||
    current.difficulty !== original.difficulty ||
    (current.notes ?? "") !== (original.notes ?? "")
  );
}

function hasCardioEntry(cardio: CardioEntry[]): boolean {
  return cardio.some((entry) => entry.durationMinutes || entry.distanceKm || entry.notes?.trim());
}

export function ActiveWorkoutPage({ data, draft, notify, onSave, onCancel }: ActiveWorkoutPageProps) {
  const title = draft.title;
  const [exercises, setExercises] = useState<SessionExercise[]>(draft.exercises);
  const [cardio, setCardio] = useState<CardioEntry[]>(draft.cardio);
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pendingSession, setPendingSession] = useState<WorkoutSession | null>(null);

  const originalExercises = useMemo(() => new Map(draft.exercises.map((exercise) => [exercise.id, exercise])), [draft.exercises]);
  const completedCount = exercises.filter((exercise) => exercise.completed).length;
  const progress = exercises.length ? Math.round((completedCount / exercises.length) * 100) : 0;
  const changedWeights = exercises.filter((exercise) => {
    if (!exercise.exerciseTemplateId || exercise.actualWeightKg === null || exercise.actualWeightKg === undefined) {
      return false;
    }
    const template = data.exercises.find((item) => item.id === exercise.exerciseTemplateId);
    return Boolean(template && template.defaultWeightKg !== exercise.actualWeightKg);
  });

  function updateExercise(next: SessionExercise) {
    setExercises((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  function buildSession(): WorkoutSession {
    const now = new Date().toISOString();
    return {
      id: createId("session"),
      date: draft.date,
      title: title.trim() || buildWorkoutTitle(draft.muscleGroups, cardio),
      muscleGroups: inferSessionGroups({ ...draft, cardio }, exercises),
      exercises,
      cardio: cardio.length ? cardio : undefined,
      durationMinutes: normalizeOptionalNumber(duration),
      overallFeeling: null,
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };
  }

  function saveWorkout() {
    const touched = exercises.some((exercise) => isExerciseModified(exercise, originalExercises.get(exercise.id)));
    if (!touched && !hasCardioEntry(cardio)) {
      notify("至少完成一个动作或调整一次记录后再保存", "warning");
      return;
    }

    const session = buildSession();
    if (changedWeights.length) {
      setPendingSession(session);
      return;
    }
    onSave(session, false);
  }

  function finishPending(updateTemplates: boolean) {
    if (!pendingSession) return;
    onSave(pendingSession, updateTemplates);
    setPendingSession(null);
  }

  return (
    <div className="page page--active active-workout-page">
      <header className="active-titlebar">
        <button className="icon-button icon-button--plain" type="button" onClick={() => setConfirmCancel(true)} aria-label="返回">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14.5 5-7 7 7 7" />
          </svg>
        </button>
        <h1>{title}</h1>
        <button className="text-button" type="button" onClick={() => setConfirmCancel(true)}>
          放弃
        </button>
      </header>

      <section className="active-summary">
        <div className="active-summary__row">
          <span>{formatDateCN(draft.date)}</span>
          <strong>
            {completedCount} / {exercises.length} 已完成
          </strong>
        </div>
        <div className="active-summary__bar" aria-label={`完成进度 ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="chip-line active-summary__chips">
          {draft.muscleGroups.map((group) => (
            <MuscleChip group={group} key={group} muted />
          ))}
        </div>
      </section>

      <section className="workout-list">
        {exercises.map((exercise) => (
          <WorkoutExerciseCard exercise={exercise} key={exercise.id} onChange={updateExercise} />
        ))}
      </section>

      {cardio.length ? (
        <section className="panel">
          <div className="section-title">
            <h2>有氧</h2>
          </div>
          {cardio.map((entry) => (
            <article className="sub-card cardio-compact" key={entry.id}>
              <div className="form-grid form-grid--three">
                <label>
                  类型
                  <select
                    value={entry.type}
                    onChange={(event) =>
                      setCardio((current) =>
                        current.map((item) =>
                          item.id === entry.id ? { ...item, type: event.target.value as CardioEntry["type"] } : item,
                        ),
                      )
                    }
                  >
                    <option value="爬坡">爬坡</option>
                    <option value="跑步">跑步</option>
                    <option value="有氧">有氧</option>
                    <option value="其他">其他</option>
                  </select>
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
                          item.id === entry.id ? { ...item, distanceKm: normalizeOptionalNumber(event.target.value) } : item,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="panel">
        <div className="form-grid form-grid--two">
          <label>
            总时长
            <input
              inputMode="decimal"
              type="number"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              placeholder="分钟"
            />
          </label>
          <label>
            总备注
            <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="可不填" />
          </label>
        </div>
      </section>

      <div className="sticky-actions sticky-actions--single">
        <button className="button button--primary button--block" type="button" onClick={saveWorkout}>
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

      <ConfirmDialog
        open={Boolean(pendingSession)}
        title="更新模板重量？"
        description={`${changedWeights.length} 个动作的本次重量和模板不同，可以把进步写回动作库。`}
        confirmLabel="更新模板"
        cancelLabel="仅保存本次"
        onCancel={() => finishPending(false)}
        onConfirm={() => finishPending(true)}
      />
    </div>
  );
}
