import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { MuscleChip } from "../components/MuscleChip";
import { TrainingRecommendationCard } from "../components/TrainingRecommendationCard";
import { todayYmd } from "../lib/date";
import { getTrainingRecommendation } from "../lib/stats";
import { buildWorkoutTitle, createId, templateMatchesSelected, templateToSessionExercise } from "../lib/workout";
import type { ActiveWorkoutDraft, AppData, CardioEntry, ExerciseTemplate, MuscleGroup } from "../types";
import { MUSCLE_LABELS } from "../types";

type StartWorkoutPageProps = {
  data: AppData;
  initialGroups: MuscleGroup[];
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onStartWorkout: (draft: ActiveWorkoutDraft) => void;
  onOpenExerciseLibrary: () => void;
};

const groupOptions: MuscleGroup[] = ["back", "chest", "shoulder", "abs", "arms", "legs", "cardio"];

type PreviewGroup = {
  group: MuscleGroup;
  exercises: ExerciseTemplate[];
};

export function StartWorkoutPage({
  data,
  initialGroups,
  notify,
  onStartWorkout,
  onOpenExerciseLibrary,
}: StartWorkoutPageProps) {
  const [selected, setSelected] = useState<MuscleGroup[]>(initialGroups);
  const [collapsedGroups, setCollapsedGroups] = useState<MuscleGroup[]>([]);
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

  const previewGroups = useMemo<PreviewGroup[]>(() => {
    return selected.map((group) => ({
        group,
        exercises: data.exercises
          .filter((exercise) => !exercise.isArchived)
          .filter((exercise) => templateMatchesSelected(exercise, [group])),
      }));
  }, [data.exercises, selected]);

  const hasOnlyCardio = selected.length === 1 && selected.includes("cardio");
  const canStart = selected.length > 0 && (previewExercises.length > 0 || selected.includes("cardio"));

  function toggleGroup(group: MuscleGroup) {
    setSelected((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group],
    );
  }

  function useGroups(groups: MuscleGroup[]) {
    setSelected(groups);
    setCollapsedGroups([]);
  }

  function togglePreviewGroup(group: MuscleGroup) {
    setCollapsedGroups((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group],
    );
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
          <span>共 {previewExercises.length} 个动作</span>
        </div>

        {selected.length ? (
          <div className="preview-group-list">
            {previewGroups.map((section) => {
              const collapsed = collapsedGroups.includes(section.group);

              return (
                <section className="preview-group" key={section.group}>
                  <button
                    className="preview-group__header"
                    type="button"
                    onClick={() => togglePreviewGroup(section.group)}
                    aria-expanded={!collapsed}
                  >
                    <span>
                      {MUSCLE_LABELS[section.group]}（{section.exercises.length}）
                    </span>
                    <i aria-hidden="true">{collapsed ? "⌄" : "⌃"}</i>
                  </button>

                  {!collapsed ? (
                    section.exercises.length ? (
                      <ol className="preview-group__list">
                        {section.exercises.map((exercise, index) => (
                          <li key={exercise.id}>
                            <span>{index + 1}.</span>
                            <strong>{exercise.name}</strong>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="preview-group__empty">
                        <p>该部位还没有动作，请先去动作库补充</p>
                        <button className="button button--secondary" type="button" onClick={onOpenExerciseLibrary}>
                          去动作库
                        </button>
                      </div>
                    )
                  ) : null}
                </section>
              );
            })}
          </div>
        ) : (
          <EmptyState title="选择一个部位" />
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
