import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { MuscleChip } from "../components/MuscleChip";
import { TrainingRecommendationCard } from "../components/TrainingRecommendationCard";
import { todayYmd } from "../lib/date";
import { getTrainingRecommendation } from "../lib/stats";
import { buildWorkoutTitle, createId, templateMatchesSelected, templateToSessionExercise } from "../lib/workout";
import type { ActiveWorkoutDraft, AppData, CardioEntry, MuscleGroup } from "../types";
import { MUSCLE_LABELS } from "../types";

type StartWorkoutPageProps = {
  data: AppData;
  initialGroups: MuscleGroup[];
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onStartWorkout: (draft: ActiveWorkoutDraft) => void;
  onOpenExerciseLibrary: () => void;
};

const groupOptions: MuscleGroup[] = ["back", "chest", "shoulder", "abs", "arms", "legs", "cardio"];

const combos: Array<{ label: string; groups: MuscleGroup[]; tone: string; mark: string }> = [
  { label: "背 + 腹", groups: ["back", "abs"], tone: "blue", mark: "背" },
  { label: "胸 + 腹", groups: ["chest", "abs"], tone: "red", mark: "胸" },
  { label: "肩 + 腹", groups: ["shoulder", "abs"], tone: "orange", mark: "肩" },
  { label: "腿部", groups: ["legs"], tone: "green", mark: "腿" },
  { label: "腹 + 有氧", groups: ["abs", "cardio"], tone: "purple", mark: "腹" },
];

function sameGroups(a: MuscleGroup[], b: MuscleGroup[]): boolean {
  return a.length === b.length && a.every((group) => b.includes(group));
}

export function StartWorkoutPage({
  data,
  initialGroups,
  notify,
  onStartWorkout,
  onOpenExerciseLibrary,
}: StartWorkoutPageProps) {
  const [selected, setSelected] = useState<MuscleGroup[]>(initialGroups);
  const recommendation = useMemo(() => getTrainingRecommendation(data), [data]);

  useEffect(() => {
    setSelected(initialGroups);
  }, [initialGroups]);

  const previewExercises = useMemo(
    () =>
      data.exercises
        .filter((exercise) => !exercise.isArchived)
        .filter((exercise) => templateMatchesSelected(exercise, selected)),
    [data.exercises, selected],
  );

  const selectedLabel = selected.length ? selected.map((group) => MUSCLE_LABELS[group]).join(" + ") : "还没选择";
  const hasOnlyCardio = selected.length === 1 && selected.includes("cardio");
  const canStart = selected.length > 0 && (previewExercises.length > 0 || selected.includes("cardio"));
  const noTemplateForSelection = selected.length > 0 && previewExercises.length === 0 && !hasOnlyCardio;

  function toggleGroup(group: MuscleGroup) {
    setSelected((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group],
    );
  }

  function useGroups(groups: MuscleGroup[]) {
    setSelected(groups);
  }

  function startWorkout() {
    if (!selected.length) {
      notify("先选择今天练什么", "warning");
      return;
    }
    if (!previewExercises.length && !selected.includes("cardio")) {
      notify("这个部位还没有动作，请先去动作库新增动作", "warning");
      return;
    }

    const cardio: CardioEntry[] = selected.includes("cardio")
      ? [{ id: createId("cardio"), type: "有氧", durationMinutes: null, distanceKm: null, notes: "" }]
      : [];

    onStartWorkout({
      date: todayYmd(),
      title: buildWorkoutTitle(selected, cardio),
      muscleGroups: selected,
      exercises: previewExercises.map(templateToSessionExercise),
      cardio,
    });
  }

  return (
    <div className="page start-page">
      <header className="page-header">
        <div>
          <h1>今天练什么</h1>
        </div>
        <span className="header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2.1" />
          </svg>
        </span>
      </header>

      <TrainingRecommendationCard
        recommendation={{ ...recommendation, ctaLabel: "使用建议" }}
        onStart={(groups) => {
          useGroups(groups);
          notify("已使用今日建议");
        }}
      />

      <section className="panel">
        <div className="section-title">
          <h2>常用组合</h2>
        </div>
        <div className="combo-grid">
          {combos.map((combo) => (
            <button
              className={`combo-button ${sameGroups(combo.groups, selected) ? "is-selected" : ""}`}
              key={combo.label}
              type="button"
              onClick={() => useGroups(combo.groups)}
            >
              <span className={`combo-button__icon combo-button__icon--${combo.tone}`}>{combo.mark}</span>
              <span>{combo.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>自选部位</h2>
        </div>
        <div className="chip-grid">
          {groupOptions.map((group) => (
            <MuscleChip
              group={group}
              key={group}
              selected={selected.includes(group)}
              onClick={() => toggleGroup(group)}
            />
          ))}
        </div>
      </section>

      <section className="preview-panel">
        <div className="section-title">
          <div>
            <h2>动作预览</h2>
          </div>
          <span>
            预计 {previewExercises.length + (selected.includes("cardio") ? 1 : 0)} 个动作 ›
          </span>
        </div>

        {selected.length ? (
          <>
            <p className="preview-title">{selectedLabel}</p>
            {previewExercises.length ? (
              <ol className="preview-list">
                {previewExercises.slice(0, 5).map((exercise) => (
                  <li key={exercise.id}>{exercise.name}</li>
                ))}
                {previewExercises.length > 5 ? <li>...</li> : null}
              </ol>
            ) : null}
            {selected.includes("cardio") ? <p className="preview-names">有氧记录</p> : null}
            {noTemplateForSelection ? (
              <EmptyState
                title="这个部位还没有动作，请先去动作库新增动作"
                actionLabel="去动作库"
                onAction={onOpenExerciseLibrary}
              />
            ) : null}
          </>
        ) : (
          <EmptyState title="选择一个部位或常用组合" />
        )}
      </section>

      <div className="sticky-actions sticky-actions--single">
        <button className="button button--primary button--block" type="button" onClick={startWorkout} disabled={!canStart}>
          开始训练
        </button>
      </div>
    </div>
  );
}
