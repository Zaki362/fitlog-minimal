import { useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { MuscleChip } from "../components/MuscleChip";
import { getExerciseProgress } from "../lib/stats";
import { formatDateCN } from "../lib/date";
import { formatPlan, normalizeOptionalNumber } from "../lib/workout";
import type { AppData, ExerciseTemplate, ExerciseUnit, MuscleGroup } from "../types";
import { MUSCLE_LABELS, MUSCLE_ORDER } from "../types";

type ExerciseDetailPageProps = {
  data: AppData;
  exerciseId: string;
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onBack: () => void;
  onSaveExercise: (exercise: ExerciseTemplate) => void;
};

const units: ExerciseUnit[] = ["kg", "bodyweight", "time", "distance", "mixed"];

function parseReps(value: string): number | string | null {
  if (!value.trim()) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && String(numeric) === value.trim() ? numeric : value.trim();
}

export function ExerciseDetailPage({ data, exerciseId, notify, onBack, onSaveExercise }: ExerciseDetailPageProps) {
  const exercise = data.exercises.find((item) => item.id === exerciseId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    name: exercise?.name ?? "",
    muscleGroup: exercise?.muscleGroup ?? "custom",
    defaultWeightKg: exercise?.defaultWeightKg === null || exercise?.defaultWeightKg === undefined ? "" : String(exercise.defaultWeightKg),
    targetSets: exercise?.targetSets === null || exercise?.targetSets === undefined ? "" : String(exercise.targetSets),
    targetReps: exercise?.targetReps === null || exercise?.targetReps === undefined ? "" : String(exercise.targetReps),
    unit: exercise?.unit ?? "kg",
    notes: exercise?.notes ?? "",
  }));

  if (!exercise) {
    return (
      <div className="page">
        <EmptyState title="找不到这个动作" actionLabel="返回动作库" onAction={onBack} />
      </div>
    );
  }

  const progress = getExerciseProgress(exercise.id, data);

  function save() {
    if (!exercise) {
      return;
    }
    if (!form.name.trim()) {
      notify("动作名不能为空", "warning");
      return;
    }

    onSaveExercise({
      ...exercise,
      name: form.name.trim(),
      muscleGroup: form.muscleGroup as MuscleGroup,
      defaultWeightKg: normalizeOptionalNumber(form.defaultWeightKg),
      targetSets: normalizeOptionalNumber(form.targetSets),
      targetReps: parseReps(form.targetReps),
      unit: form.unit as ExerciseUnit,
      notes: form.notes.trim(),
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
          <p className="eyebrow">动作详情</p>
          <h1>{exercise.name}</h1>
        </div>
      </header>

      <section className="panel">
        {editing ? (
          <div className="form-stack">
            <label>
              动作名
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <div className="form-grid form-grid--two">
              <label>
                部位
                <select
                  value={form.muscleGroup}
                  onChange={(event) => setForm({ ...form, muscleGroup: event.target.value as MuscleGroup })}
                >
                  {MUSCLE_ORDER.map((group) => (
                    <option value={group} key={group}>
                      {MUSCLE_LABELS[group]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                单位
                <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value as ExerciseUnit })}>
                  {units.map((unit) => (
                    <option value={unit} key={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-grid form-grid--three">
              <label>
                重量
                <input
                  inputMode="decimal"
                  type="number"
                  step="0.5"
                  value={form.defaultWeightKg}
                  onChange={(event) => setForm({ ...form, defaultWeightKg: event.target.value })}
                />
              </label>
              <label>
                组数
                <input
                  inputMode="numeric"
                  type="number"
                  value={form.targetSets}
                  onChange={(event) => setForm({ ...form, targetSets: event.target.value })}
                />
              </label>
              <label>
                次数
                <input value={form.targetReps} onChange={(event) => setForm({ ...form, targetReps: event.target.value })} />
              </label>
            </div>
            <label>
              备注
              <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </label>
          </div>
        ) : (
          <>
            <MuscleChip group={exercise.muscleGroup} />
            <h2>{formatPlan(exercise)}</h2>
            {exercise.notes ? <p>{exercise.notes}</p> : <p className="muted">暂无备注</p>}
          </>
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>重量变化历史</h2>
        </div>
        {progress.updates.length ? (
          <div className="mini-list">
            {progress.updates.map((update) => (
              <div className="mini-row" key={update.id}>
                <span>{formatDateCN(update.date)}</span>
                <strong>
                  {update.oldWeightKg ?? "-"}kg → {update.newWeightKg ?? "-"}kg
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="暂无重量更新记录" />
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>最近记录</h2>
        </div>
        {progress.sessions.length ? (
          <div className="detail-list">
            {progress.sessions.slice(0, 8).map(({ session, exercise: sessionExercise }) => (
              <article className="sub-card" key={`${session.id}-${sessionExercise.id}`}>
                <div className="card-row">
                  <div>
                    <p className="eyebrow">{formatDateCN(session.date)}</p>
                    <h3>{session.title}</h3>
                  </div>
                  <span className={`status-pill ${sessionExercise.completed ? "is-done" : ""}`}>
                    {sessionExercise.completed ? "完成" : "未勾选"}
                  </span>
                </div>
                <p>
                  {sessionExercise.actualWeightKg ?? "-"}kg / {sessionExercise.actualSets ?? "-"}组 /{" "}
                  {sessionExercise.actualReps ?? "-"}次
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="新记录保存后会出现在这里" />
        )}
      </section>

      <div className="sticky-actions">
        {editing ? (
          <>
            <button className="button button--ghost" type="button" onClick={() => setEditing(false)}>
              取消
            </button>
            <button className="button button--primary" type="button" onClick={save}>
              保存
            </button>
          </>
        ) : (
          <button className="button button--primary button--block" type="button" onClick={() => setEditing(true)}>
            编辑动作
          </button>
        )}
      </div>
    </div>
  );
}
