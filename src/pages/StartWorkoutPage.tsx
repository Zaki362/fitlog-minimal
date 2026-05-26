import { useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { MuscleChip } from "../components/MuscleChip";
import { todayYmd } from "../lib/date";
import {
  buildWorkoutTitle,
  createId,
  formatCardioEntry,
  normalizeOptionalNumber,
  templateMatchesSelected,
  templateToSessionExercise,
} from "../lib/workout";
import type { ActiveWorkoutDraft, AppData, CardioEntry, MuscleGroup, SessionExercise } from "../types";
import { MUSCLE_LABELS } from "../types";

type StartWorkoutPageProps = {
  data: AppData;
  initialGroups: MuscleGroup[];
  notify: (message: string, tone?: "success" | "warning" | "danger") => void;
  onStartWorkout: (draft: ActiveWorkoutDraft) => void;
};

const groupOptions: MuscleGroup[] = ["back", "chest", "shoulder", "abs", "arms", "legs", "cardio", "custom"];

const cardioTypes: CardioEntry["type"][] = ["爬坡", "跑步", "有氧", "其他"];

type TempExerciseForm = {
  name: string;
  muscleGroup: MuscleGroup;
  weight: string;
  sets: string;
  reps: string;
  notes: string;
};

type CardioForm = {
  type: CardioEntry["type"];
  duration: string;
  distance: string;
  notes: string;
};

function parseReps(value: string): number | string | null {
  if (!value.trim()) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && String(numeric) === value.trim() ? numeric : value.trim();
}

function defaultTempForm(selected: MuscleGroup[]): TempExerciseForm {
  return {
    name: "",
    muscleGroup: selected.find((group) => group !== "cardio") ?? "custom",
    weight: "",
    sets: "",
    reps: "",
    notes: "",
  };
}

export function StartWorkoutPage({ data, initialGroups, notify, onStartWorkout }: StartWorkoutPageProps) {
  const [selected, setSelected] = useState<MuscleGroup[]>(initialGroups);
  const [tempExercises, setTempExercises] = useState<SessionExercise[]>([]);
  const [tempForm, setTempForm] = useState<TempExerciseForm>(() => defaultTempForm(initialGroups));
  const [cardioEntries, setCardioEntries] = useState<CardioEntry[]>([]);
  const [cardioForm, setCardioForm] = useState<CardioForm>({
    type: "爬坡",
    duration: "",
    distance: "",
    notes: "",
  });

  useEffect(() => {
    setSelected(initialGroups);
    setTempForm(defaultTempForm(initialGroups));
  }, [initialGroups]);

  function toggleGroup(group: MuscleGroup) {
    setSelected((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group],
    );
  }

  function addTempExercise() {
    if (!tempForm.name.trim()) {
      notify("先填一个动作名", "warning");
      return;
    }

    const exercise: SessionExercise = {
      id: createId("temp-ex"),
      name: tempForm.name.trim(),
      muscleGroup: tempForm.muscleGroup,
      plannedWeightKg: normalizeOptionalNumber(tempForm.weight),
      actualWeightKg: normalizeOptionalNumber(tempForm.weight),
      plannedSets: normalizeOptionalNumber(tempForm.sets),
      actualSets: normalizeOptionalNumber(tempForm.sets),
      plannedReps: parseReps(tempForm.reps),
      actualReps: parseReps(tempForm.reps),
      completed: false,
      difficulty: null,
      notes: tempForm.notes.trim(),
    };
    setTempExercises((current) => [...current, exercise]);
    setTempForm(defaultTempForm(selected));
    notify("已加入临时动作");
  }

  function addCardio() {
    if (!cardioForm.duration.trim() && !cardioForm.distance.trim() && !cardioForm.notes.trim()) {
      notify("有氧至少填分钟、公里或备注", "warning");
      return;
    }

    const entry: CardioEntry = {
      id: createId("cardio"),
      type: cardioForm.type,
      durationMinutes: normalizeOptionalNumber(cardioForm.duration),
      distanceKm: normalizeOptionalNumber(cardioForm.distance),
      notes: cardioForm.notes.trim(),
    };
    setCardioEntries((current) => [...current, entry]);
    setCardioForm({ type: "爬坡", duration: "", distance: "", notes: "" });
    if (!selected.includes("cardio")) {
      setSelected((current) => [...current, "cardio"]);
    }
    notify("已加入有氧");
  }

  function generateWorkout() {
    if (!selected.length && !tempExercises.length && !cardioEntries.length) {
      notify("先选一个部位或添加动作", "warning");
      return;
    }

    const templateExercises = data.exercises
      .filter((exercise) => !exercise.isArchived)
      .filter((exercise) => templateMatchesSelected(exercise, selected))
      .map(templateToSessionExercise);
    const cardio =
      selected.includes("cardio") && !cardioEntries.length
        ? [{ id: createId("cardio"), type: "有氧" as const, durationMinutes: null, distanceKm: null, notes: "" }]
        : cardioEntries;
    const exercises = [...templateExercises, ...tempExercises];

    if (!exercises.length && !cardio.length) {
      notify("这个组合没有模板动作，可以先加一个临时动作", "warning");
      return;
    }

    onStartWorkout({
      date: todayYmd(),
      title: buildWorkoutTitle(selected, cardio),
      muscleGroups: selected.length ? selected : ["custom"],
      exercises,
      cardio,
    });
  }

  const previewCount = data.exercises
    .filter((exercise) => !exercise.isArchived)
    .filter((exercise) => templateMatchesSelected(exercise, selected)).length;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">开练</p>
          <h1>选今天练什么</h1>
        </div>
        <button className="button button--primary" type="button" onClick={generateWorkout}>
          生成训练
        </button>
      </header>

      <section className="panel">
        <div className="section-title">
          <h2>训练部位</h2>
          <span>{previewCount + tempExercises.length} 个动作</span>
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

      <section className="panel">
        <div className="section-title">
          <h2>临时动作</h2>
        </div>
        <div className="form-stack">
          <label>
            动作名
            <input
              value={tempForm.name}
              onChange={(event) => setTempForm({ ...tempForm, name: event.target.value })}
              placeholder="例如 俯卧撑"
            />
          </label>
          <div className="form-grid form-grid--two">
            <label>
              部位
              <select
                value={tempForm.muscleGroup}
                onChange={(event) =>
                  setTempForm({ ...tempForm, muscleGroup: event.target.value as MuscleGroup })
                }
              >
                {groupOptions.map((group) => (
                  <option value={group} key={group}>
                    {MUSCLE_LABELS[group]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              重量 kg
              <input
                inputMode="decimal"
                type="number"
                step="0.5"
                value={tempForm.weight}
                onChange={(event) => setTempForm({ ...tempForm, weight: event.target.value })}
              />
            </label>
          </div>
          <div className="form-grid form-grid--two">
            <label>
              组数
              <input
                inputMode="numeric"
                type="number"
                value={tempForm.sets}
                onChange={(event) => setTempForm({ ...tempForm, sets: event.target.value })}
              />
            </label>
            <label>
              次数
              <input
                inputMode="text"
                value={tempForm.reps}
                onChange={(event) => setTempForm({ ...tempForm, reps: event.target.value })}
              />
            </label>
          </div>
          <label>
            备注
            <textarea
              rows={2}
              value={tempForm.notes}
              onChange={(event) => setTempForm({ ...tempForm, notes: event.target.value })}
            />
          </label>
          <button className="button button--secondary" type="button" onClick={addTempExercise}>
            加入动作
          </button>
        </div>

        {tempExercises.length ? (
          <div className="mini-list">
            {tempExercises.map((exercise) => (
              <div className="mini-row" key={exercise.id}>
                <span>
                  {exercise.name} · {MUSCLE_LABELS[exercise.muscleGroup]}
                </span>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  onClick={() => setTempExercises((current) => current.filter((item) => item.id !== exercise.id))}
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>有氧</h2>
        </div>
        <div className="form-stack">
          <div className="form-grid form-grid--three">
            <label>
              类型
              <select
                value={cardioForm.type}
                onChange={(event) => setCardioForm({ ...cardioForm, type: event.target.value as CardioEntry["type"] })}
              >
                {cardioTypes.map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              分钟
              <input
                inputMode="decimal"
                type="number"
                value={cardioForm.duration}
                onChange={(event) => setCardioForm({ ...cardioForm, duration: event.target.value })}
              />
            </label>
            <label>
              公里
              <input
                inputMode="decimal"
                type="number"
                step="0.1"
                value={cardioForm.distance}
                onChange={(event) => setCardioForm({ ...cardioForm, distance: event.target.value })}
              />
            </label>
          </div>
          <label>
            备注
            <textarea
              rows={2}
              value={cardioForm.notes}
              onChange={(event) => setCardioForm({ ...cardioForm, notes: event.target.value })}
            />
          </label>
          <button className="button button--secondary" type="button" onClick={addCardio}>
            加入有氧
          </button>
        </div>

        {cardioEntries.length ? (
          <div className="mini-list">
            {cardioEntries.map((entry) => (
              <div className="mini-row" key={entry.id}>
                <span>{formatCardioEntry(entry)}</span>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  onClick={() => setCardioEntries((current) => current.filter((item) => item.id !== entry.id))}
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="可以不加有氧" />
        )}
      </section>
    </div>
  );
}
