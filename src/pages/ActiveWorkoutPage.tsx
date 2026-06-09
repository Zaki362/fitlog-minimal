import { useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MuscleChip } from "../components/MuscleChip";
import { WorkoutExerciseCard } from "../components/WorkoutExerciseCard";
import { formatDateCN } from "../lib/date";
import { buildWorkoutTitle, createId, inferSessionGroups, normalizeOptionalNumber } from "../lib/workout";
import { OVERALL_FEELING_LABELS } from "../types";
import type { ActiveWorkoutDraft, AppData, CardioEntry, OverallFeeling, SessionExercise, WorkoutSession } from "../types";

type ActiveWorkoutPageProps = {
  data: AppData;
  draft: ActiveWorkoutDraft;
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onDraftChange: (draft: ActiveWorkoutDraft) => void;
  onSave: (session: WorkoutSession, updateTemplates: boolean) => void;
  onCancel: () => void;
};

function sameRep(a: number | string | null | undefined, b: number | string | null | undefined): boolean {
  return String(a ?? "") === String(b ?? "");
}

function isFilledCardioEntry(entry: CardioEntry): boolean {
  return Boolean(entry.durationMinutes || entry.distanceKm || entry.notes?.trim());
}

function hasCardioEntry(cardio: CardioEntry[]): boolean {
  return cardio.some(isFilledCardioEntry);
}

const feelingOptions: OverallFeeling[] = ["great", "normal", "tired", "bad"];

export function ActiveWorkoutPage({ data, draft, notify, onDraftChange, onSave, onCancel }: ActiveWorkoutPageProps) {
  const title = draft.title;
  const [exercises, setExercises] = useState<SessionExercise[]>(draft.exercises);
  const [cardio, setCardio] = useState<CardioEntry[]>(draft.cardio);
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [duration, setDuration] = useState(draft.duration ?? "");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [overallFeeling, setOverallFeeling] = useState<OverallFeeling>(draft.overallFeeling ?? "normal");
  const [syncTemplateUpdates, setSyncTemplateUpdates] = useState(Boolean(draft.syncTemplateUpdates));

  const hasWorkoutContent = exercises.length > 0 || hasCardioEntry(cardio) || Boolean(notes.trim()) || Boolean(duration.trim());
  const templateDifferences = exercises.filter((exercise) => {
    if (!exercise.exerciseTemplateId) {
      return false;
    }
    const template = data.exercises.find((item) => item.id === exercise.exerciseTemplateId);
    if (!template) {
      return false;
    }

    const weightChanged =
      exercise.actualWeightKg !== null &&
      exercise.actualWeightKg !== undefined &&
      template.defaultWeightKg !== exercise.actualWeightKg;
    const setsChanged =
      exercise.actualSets !== null &&
      exercise.actualSets !== undefined &&
      template.targetSets !== exercise.actualSets;
    const repsChanged =
      exercise.actualReps !== null &&
      exercise.actualReps !== undefined &&
      !sameRep(template.targetReps, exercise.actualReps);

    return weightChanged || setsChanged || repsChanged;
  });
  const hasWorkoutChanges = hasWorkoutContent;
  const canFinishWorkout = hasWorkoutContent;

  useEffect(() => {
    if (!hasWorkoutChanges) {
      return undefined;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasWorkoutChanges]);

  useEffect(() => {
    onDraftChange({
      ...draft,
      exercises,
      cardio,
      notes,
      duration,
      overallFeeling,
      syncTemplateUpdates,
    });
  }, [cardio, draft, duration, exercises, notes, onDraftChange, overallFeeling, syncTemplateUpdates]);

  function updateExercise(next: SessionExercise) {
    setExercises((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  function buildSession(feeling: OverallFeeling): WorkoutSession {
    const now = new Date().toISOString();
    const savedCardio = cardio.filter(isFilledCardioEntry);
    const finalizedExercises = exercises.map((exercise) => ({ ...exercise, completed: true }));
    return {
      id: createId("session"),
      date: draft.date,
      title: title.trim() || buildWorkoutTitle(draft.muscleGroups, savedCardio),
      muscleGroups: inferSessionGroups({ ...draft, cardio: savedCardio }, finalizedExercises),
      exercises: finalizedExercises,
      cardio: savedCardio.length ? savedCardio : undefined,
      durationMinutes: normalizeOptionalNumber(duration),
      overallFeeling: feeling,
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    };
  }

  function openFinishDialog() {
    if (!canFinishWorkout) {
      notify("先选择动作、填写有氧或补充备注后再完成", "warning");
      return;
    }

    setSyncTemplateUpdates(false);
    setFinishOpen(true);
  }

  function finishWorkout() {
    onSave(buildSession(overallFeeling), syncTemplateUpdates && templateDifferences.length > 0);
    setFinishOpen(false);
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
          <div className="active-summary__status">
            <strong>{exercises.length ? `${exercises.length} 个动作` : "自定义训练"}</strong>
          </div>
        </div>
        <p className="active-summary__note">查看动作细节和本次数值，结束时一次确认完成。</p>
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
        <button className="button button--primary button--block" type="button" onClick={openFinishDialog}>
          完成训练
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

      {finishOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog finish-dialog" role="dialog" aria-modal="true" aria-labelledby="finish-title">
            <h2 id="finish-title">完成这次训练？</h2>
            <p>确认后，本次计划里的动作会统一记为完成。</p>

            <div className="finish-dialog__section">
              <strong>今天训练状态怎么样？</strong>
              <div className="segmented finish-dialog__feelings" role="group" aria-label="训练状态">
                {feelingOptions.map((feeling) => (
                  <button
                    className={overallFeeling === feeling ? "is-selected" : ""}
                    key={feeling}
                    type="button"
                    onClick={() => setOverallFeeling(feeling)}
                  >
                    {OVERALL_FEELING_LABELS[feeling]}
                  </button>
                ))}
              </div>
            </div>

            {templateDifferences.length ? (
              <label className="finish-dialog__template-toggle">
                <input
                  type="checkbox"
                  checked={syncTemplateUpdates}
                  onChange={(event) => setSyncTemplateUpdates(event.target.checked)}
                />
                <span>
                  <strong>同步更新动作库模板</strong>
                  <small>{templateDifferences.length} 个动作的重量、组数或次数有变化</small>
                </span>
              </label>
            ) : null}

            <div className="dialog__actions">
              <button className="button button--ghost" type="button" onClick={() => setFinishOpen(false)}>
                取消
              </button>
              <button className="button button--primary" type="button" onClick={finishWorkout}>
                确认完成
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
