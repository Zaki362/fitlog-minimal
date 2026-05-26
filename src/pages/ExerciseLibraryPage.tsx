import { useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ExerciseCard } from "../components/ExerciseCard";
import { MuscleChip } from "../components/MuscleChip";
import { compareYmdDesc, formatDateCN } from "../lib/date";
import { createId, normalizeOptionalNumber } from "../lib/workout";
import type { AppData, ExerciseTemplate, ExerciseUnit, MuscleGroup } from "../types";
import { MUSCLE_LABELS, MUSCLE_ORDER } from "../types";

type ExerciseLibraryPageProps = {
  data: AppData;
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onOpenExercise: (exerciseId: string) => void;
  onSaveExercise: (exercise: ExerciseTemplate) => void;
  onArchiveExercise: (exerciseId: string) => void;
};

type Filter = "all" | MuscleGroup;

type ExerciseForm = {
  id?: string;
  name: string;
  muscleGroup: MuscleGroup;
  defaultWeightKg: string;
  targetSets: string;
  targetReps: string;
  unit: ExerciseUnit;
  notes: string;
  isFavorite: boolean;
};

const filters: Filter[] = ["all", "back", "chest", "shoulder", "arms", "abs", "legs", "cardio", "custom"];
const units: ExerciseUnit[] = ["kg", "bodyweight", "time", "distance", "mixed"];

function toForm(exercise?: ExerciseTemplate): ExerciseForm {
  return {
    id: exercise?.id,
    name: exercise?.name ?? "",
    muscleGroup: exercise?.muscleGroup ?? "custom",
    defaultWeightKg: exercise?.defaultWeightKg === null || exercise?.defaultWeightKg === undefined ? "" : String(exercise.defaultWeightKg),
    targetSets: exercise?.targetSets === null || exercise?.targetSets === undefined ? "" : String(exercise.targetSets),
    targetReps: exercise?.targetReps === null || exercise?.targetReps === undefined ? "" : String(exercise.targetReps),
    unit: exercise?.unit ?? "kg",
    notes: exercise?.notes ?? "",
    isFavorite: exercise?.isFavorite ?? false,
  };
}

function parseReps(value: string): number | string | null {
  if (!value.trim()) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && String(numeric) === value.trim() ? numeric : value.trim();
}

export function ExerciseLibraryPage({
  data,
  notify,
  onOpenExercise,
  onSaveExercise,
  onArchiveExercise,
}: ExerciseLibraryPageProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ExerciseForm>(() => toForm());
  const [pendingArchive, setPendingArchive] = useState<ExerciseTemplate | null>(null);

  const visibleExercises = useMemo(() => {
    return data.exercises
      .filter((exercise) => !exercise.isArchived)
      .filter((exercise) => {
        if (filter === "all") {
          return true;
        }
        if (filter === "arms") {
          return ["arms", "biceps", "triceps"].includes(exercise.muscleGroup);
        }
        return exercise.muscleGroup === filter;
      })
      .sort((a, b) => MUSCLE_ORDER.indexOf(a.muscleGroup) - MUSCLE_ORDER.indexOf(b.muscleGroup));
  }, [data.exercises, filter]);

  const lastDates = useMemo(() => {
    const map = new Map<string, string>();
    [...data.sessions].sort((a, b) => compareYmdDesc(a.date, b.date)).forEach((session) => {
      session.exercises.forEach((exercise) => {
        if (exercise.exerciseTemplateId && !map.has(exercise.exerciseTemplateId)) {
          map.set(exercise.exerciseTemplateId, session.date);
        }
      });
    });

    data.exercises.forEach((exercise) => {
      if (map.has(exercise.id)) {
        return;
      }
      const lastGroupSession = [...data.sessions]
        .sort((a, b) => compareYmdDesc(a.date, b.date))
        .find((session) => {
          if (exercise.muscleGroup === "biceps" || exercise.muscleGroup === "triceps") {
            return (
              session.muscleGroups.includes("arms") ||
              session.muscleGroups.includes("biceps") ||
              session.muscleGroups.includes("triceps")
            );
          }
          return session.muscleGroups.includes(exercise.muscleGroup);
        });
      if (lastGroupSession) {
        map.set(exercise.id, lastGroupSession.date);
      }
    });

    return map;
  }, [data.exercises, data.sessions]);

  const groupedExercises = useMemo(() => {
    return MUSCLE_ORDER.map((group) => ({
      group,
      exercises: visibleExercises.filter((exercise) => exercise.muscleGroup === group),
    })).filter((section) => section.exercises.length);
  }, [visibleExercises]);

  function openNew() {
    setForm(toForm());
    setFormOpen(true);
  }

  function openEdit(exercise: ExerciseTemplate) {
    setForm(toForm(exercise));
    setFormOpen(true);
  }

  function quickUpdateWeight(exercise: ExerciseTemplate) {
    const value = window.prompt("新的模板重量 kg", exercise.defaultWeightKg ? String(exercise.defaultWeightKg) : "");
    if (value === null) {
      return;
    }
    const nextWeight = normalizeOptionalNumber(value);
    if (nextWeight === null && value.trim()) {
      notify("重量格式不对", "warning");
      return;
    }
    onSaveExercise({ ...exercise, defaultWeightKg: nextWeight, updatedAt: new Date().toISOString() });
  }

  function submitForm() {
    if (!form.name.trim()) {
      notify("动作名不能为空", "warning");
      return;
    }

    const existing = form.id ? data.exercises.find((item) => item.id === form.id) : undefined;
    const now = new Date().toISOString();
    const exercise: ExerciseTemplate = {
      id: form.id ?? createId("exercise"),
      name: form.name.trim(),
      muscleGroup: form.muscleGroup,
      defaultWeightKg: normalizeOptionalNumber(form.defaultWeightKg),
      targetSets: normalizeOptionalNumber(form.targetSets),
      targetReps: parseReps(form.targetReps),
      unit: form.unit,
      notes: form.notes.trim(),
      isFavorite: form.isFavorite,
      isArchived: existing?.isArchived ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    onSaveExercise(exercise);
    setFormOpen(false);
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">动作</p>
          <h1>动作库</h1>
        </div>
        <button className="button button--primary" type="button" onClick={openNew}>
          新增动作
        </button>
      </header>

      <section className="panel">
        <div className="filter-row">
          {filters.map((option) =>
            option === "all" ? (
              <button
                className={`muscle-chip ${filter === "all" ? "is-selected" : ""}`}
                key={option}
                type="button"
                onClick={() => setFilter("all")}
              >
                全部
              </button>
            ) : (
              <MuscleChip
                group={option}
                key={option}
                selected={filter === option}
                onClick={() => setFilter(option)}
              />
            ),
          )}
        </div>
      </section>

      <section className="exercise-list">
        {visibleExercises.length ? (
          groupedExercises.map((section) => (
            <div className="exercise-section" key={section.group}>
              <div className="section-title section-title--compact">
                <h2>{MUSCLE_LABELS[section.group]}</h2>
                <span>{section.exercises.length} 个动作</span>
              </div>
              {section.exercises.map((exercise) => (
                <ExerciseCard
                  exercise={exercise}
                  key={exercise.id}
                  lastDate={lastDates.get(exercise.id) ? formatDateCN(lastDates.get(exercise.id) as string) : undefined}
                  onOpen={() => onOpenExercise(exercise.id)}
                  onEdit={() => openEdit(exercise)}
                  onUpdateWeight={() => quickUpdateWeight(exercise)}
                  onArchive={() => setPendingArchive(exercise)}
                />
              ))}
            </div>
          ))
        ) : (
          <EmptyState title="没有动作" actionLabel="新增动作" onAction={openNew} />
        )}
      </section>

      {formOpen ? (
        <div className="sheet-backdrop" role="presentation">
          <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="exercise-form-title">
            <div className="section-title">
              <h2 id="exercise-form-title">{form.id ? "编辑动作" : "新增动作"}</h2>
              <button className="icon-button" type="button" onClick={() => setFormOpen(false)}>
                关闭
              </button>
            </div>
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
                  <select
                    value={form.unit}
                    onChange={(event) => setForm({ ...form, unit: event.target.value as ExerciseUnit })}
                  >
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
                  重量 kg
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
                  <input
                    value={form.targetReps}
                    onChange={(event) => setForm({ ...form, targetReps: event.target.value })}
                  />
                </label>
              </div>
              <label>
                备注
                <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={form.isFavorite}
                  onChange={(event) => setForm({ ...form, isFavorite: event.target.checked })}
                />
                <span>收藏</span>
              </label>
              <button className="button button--primary button--block" type="button" onClick={submitForm}>
                保存动作
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingArchive)}
        title="归档这个动作？"
        description={pendingArchive?.name}
        confirmLabel="归档"
        onCancel={() => setPendingArchive(null)}
        onConfirm={() => {
          if (pendingArchive) {
            onArchiveExercise(pendingArchive.id);
            setPendingArchive(null);
          }
        }}
      />
    </div>
  );
}
