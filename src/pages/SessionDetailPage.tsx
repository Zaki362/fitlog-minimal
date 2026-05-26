import { useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { MuscleChip } from "../components/MuscleChip";
import { DIFFICULTY_LABELS, MUSCLE_LABELS } from "../types";
import type { AppData, CardioEntry, SessionExercise, WorkoutSession } from "../types";
import { formatDateCN, formatInputDate } from "../lib/date";
import { formatCardioEntry, formatPlan, normalizeOptionalNumber } from "../lib/workout";

type SessionDetailPageProps = {
  data: AppData;
  sessionId: string;
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onBack: () => void;
  onUpdateSession: (session: WorkoutSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onUpdateTemplateFromExercise: (session: WorkoutSession, exercise: SessionExercise) => void;
};

function sameRep(a: number | string | null | undefined, b: number | string | null | undefined): boolean {
  return String(a ?? "") === String(b ?? "");
}

function hasTemplateSuggestion(data: AppData, exercise: SessionExercise): boolean {
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
    exercise.actualWeightKg !== template.defaultWeightKg;
  const setsChanged =
    exercise.actualSets !== null &&
    exercise.actualSets !== undefined &&
    exercise.actualSets !== template.targetSets;
  const repsChanged =
    exercise.actualReps !== null &&
    exercise.actualReps !== undefined &&
    !sameRep(exercise.actualReps, template.targetReps);

  return weightChanged || setsChanged || repsChanged;
}

export function SessionDetailPage({
  data,
  sessionId,
  notify,
  onBack,
  onUpdateSession,
  onDeleteSession,
  onUpdateTemplateFromExercise,
}: SessionDetailPageProps) {
  const session = data.sessions.find((item) => item.id === sessionId);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<WorkoutSession | null>(session ?? null);

  const suggestions = useMemo(
    () => (session ? session.exercises.filter((exercise) => hasTemplateSuggestion(data, exercise)) : []),
    [data, session],
  );

  if (!session || !draft) {
    return (
      <div className="page">
        <EmptyState title="找不到这条训练记录" actionLabel="返回记录" onAction={onBack} />
      </div>
    );
  }

  function updateDraftExercise(next: SessionExercise) {
    setDraft((current) =>
      current ? { ...current, exercises: current.exercises.map((item) => (item.id === next.id ? next : item)) } : current,
    );
  }

  function updateDraftCardio(next: CardioEntry) {
    setDraft((current) =>
      current ? { ...current, cardio: current.cardio?.map((item) => (item.id === next.id ? next : item)) } : current,
    );
  }

  function saveEdit() {
    const current = draft;
    if (!current) {
      return;
    }
    if (!current.title.trim()) {
      notify("标题不能为空", "warning");
      return;
    }
    onUpdateSession({
      ...current,
      title: current.title.trim(),
      date: formatInputDate(current.date),
      updatedAt: new Date().toISOString(),
    });
    setEditing(false);
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-button icon-button--solid" type="button" onClick={onBack}>
          返回
        </button>
        <div className="page-header__main">
          <p className="eyebrow">{formatDateCN(session.date)}</p>
          <h1>{session.title}</h1>
        </div>
      </header>

      <section className="panel">
        {editing ? (
          <div className="form-stack">
            <label>
              日期
              <input
                type="date"
                value={draft.date}
                onChange={(event) => setDraft({ ...draft, date: event.target.value })}
              />
            </label>
            <label>
              标题
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <label>
              总备注
              <textarea
                rows={3}
                value={draft.notes ?? ""}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
            </label>
          </div>
        ) : (
          <>
            <div className="chip-line">
              {session.muscleGroups.map((group) => (
                <MuscleChip group={group} key={group} />
              ))}
            </div>
            {session.durationMinutes ? <p className="muted">时长 {session.durationMinutes} 分钟</p> : null}
            {session.notes ? <p>{session.notes}</p> : null}
          </>
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>动作完成情况</h2>
          <span>
            {session.exercises.filter((item) => item.completed).length}/{session.exercises.length}
          </span>
        </div>
        {session.exercises.length ? (
          <div className="detail-list">
            {(editing ? draft.exercises : session.exercises).map((exercise) => (
              <article className="sub-card" key={exercise.id}>
                {editing ? (
                  <div className="form-stack">
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={exercise.completed}
                        onChange={(event) => updateDraftExercise({ ...exercise, completed: event.target.checked })}
                      />
                      <span>
                        <strong>{exercise.name}</strong>
                        <small>{MUSCLE_LABELS[exercise.muscleGroup]}</small>
                      </span>
                    </label>
                    <div className="form-grid form-grid--three">
                      <label>
                        重量
                        <input
                          inputMode="decimal"
                          type="number"
                          step="0.5"
                          value={exercise.actualWeightKg ?? ""}
                          onChange={(event) =>
                            updateDraftExercise({
                              ...exercise,
                              actualWeightKg: normalizeOptionalNumber(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        组数
                        <input
                          inputMode="numeric"
                          type="number"
                          value={exercise.actualSets ?? ""}
                          onChange={(event) =>
                            updateDraftExercise({
                              ...exercise,
                              actualSets: normalizeOptionalNumber(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        次数
                        <input
                          value={exercise.actualReps ?? ""}
                          onChange={(event) => updateDraftExercise({ ...exercise, actualReps: event.target.value })}
                        />
                      </label>
                    </div>
                    <label>
                      备注
                      <textarea
                        rows={2}
                        value={exercise.notes ?? ""}
                        onChange={(event) => updateDraftExercise({ ...exercise, notes: event.target.value })}
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="card-row">
                      <div>
                        <p className="eyebrow">{MUSCLE_LABELS[exercise.muscleGroup]}</p>
                        <h3>{exercise.name}</h3>
                      </div>
                      <span className={`status-pill ${exercise.completed ? "is-done" : ""}`}>
                        {exercise.completed ? "完成" : "未勾选"}
                      </span>
                    </div>
                    <p className="muted">计划 {formatPlan(exercise)}</p>
                    <p>
                      本次 {exercise.actualWeightKg ?? "-"}kg / {exercise.actualSets ?? "-"}组 /{" "}
                      {exercise.actualReps ?? "-"}次
                    </p>
                    {exercise.difficulty ? <p className="muted">难度 {DIFFICULTY_LABELS[exercise.difficulty]}</p> : null}
                    {exercise.notes ? <p>{exercise.notes}</p> : null}
                  </>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="这条初始记录没有动作明细" />
        )}
      </section>

      {session.cardio?.length ? (
        <section className="panel">
          <div className="section-title">
            <h2>有氧</h2>
          </div>
          <div className="detail-list">
            {(editing ? draft.cardio ?? [] : session.cardio).map((entry) => (
              <article className="sub-card" key={entry.id}>
                {editing ? (
                  <div className="form-grid form-grid--three">
                    <label>
                      类型
                      <input
                        value={entry.type}
                        onChange={(event) =>
                          updateDraftCardio({ ...entry, type: event.target.value as CardioEntry["type"] })
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
                          updateDraftCardio({ ...entry, durationMinutes: normalizeOptionalNumber(event.target.value) })
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
                          updateDraftCardio({ ...entry, distanceKm: normalizeOptionalNumber(event.target.value) })
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <p>{formatCardioEntry(entry)}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {suggestions.length && !editing ? (
        <section className="panel panel--accent">
          <div className="section-title">
            <h2>模板更新建议</h2>
          </div>
          <div className="mini-list">
            {suggestions.map((exercise) => (
              <div className="mini-row" key={exercise.id}>
                <span>{exercise.name}</span>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => onUpdateTemplateFromExercise(session, exercise)}
                >
                  更新模板
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="sticky-actions">
        {editing ? (
          <>
            <button className="button button--ghost" type="button" onClick={() => setEditing(false)}>
              取消
            </button>
            <button className="button button--primary" type="button" onClick={saveEdit}>
              保存编辑
            </button>
          </>
        ) : (
          <>
            <button className="button button--secondary" type="button" onClick={() => setEditing(true)}>
              编辑
            </button>
            <button className="button button--danger" type="button" onClick={() => setConfirmDelete(true)}>
              删除
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="删除这次训练？"
        description={session.title}
        danger
        confirmLabel="删除"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => onDeleteSession(session.id)}
      />
    </div>
  );
}
