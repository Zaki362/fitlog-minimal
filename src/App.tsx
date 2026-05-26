import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ActiveWorkoutPage } from "./pages/ActiveWorkoutPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { ExerciseLibraryPage } from "./pages/ExerciseLibraryPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SessionDetailPage } from "./pages/SessionDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StartWorkoutPage as StartWorkoutView } from "./pages/StartWorkoutPage";
import { clearData, loadData, resetData, saveData } from "./lib/storage";
import { createId } from "./lib/workout";
import { todayYmd } from "./lib/date";
import type {
  ActiveWorkoutDraft,
  AppData,
  ExerciseTemplate,
  MuscleGroup,
  ProgressUpdate,
  SessionExercise,
  WorkoutSession,
} from "./types";

export type MainTab = "dashboard" | "start" | "history" | "exercises";

type View =
  | { name: MainTab }
  | { name: "active"; draft: ActiveWorkoutDraft }
  | { name: "session-detail"; sessionId: string }
  | { name: "exercise-detail"; exerciseId: string }
  | { name: "settings" };

type Toast = {
  id: string;
  message: string;
  tone: "success" | "warning" | "danger";
};

function sameRep(a: number | string | null | undefined, b: number | string | null | undefined): boolean {
  return String(a ?? "") === String(b ?? "");
}

function activeTabFromView(view: View): MainTab {
  if (view.name === "active") {
    return "start";
  }
  if (view.name === "session-detail") {
    return "history";
  }
  if (view.name === "exercise-detail") {
    return "exercises";
  }
  if (view.name === "settings") {
    return "dashboard";
  }
  return view.name;
}

export default function App() {
  const [initialLoad] = useState(loadData);
  const [data, setData] = useState<AppData>(initialLoad.data);
  const [loadError, setLoadError] = useState(initialLoad.error);
  const [view, setView] = useState<View>({ name: "dashboard" });
  const [startPreset, setStartPreset] = useState<MuscleGroup[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = createId("toast");
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2600);
  }, []);

  useEffect(() => {
    if (loadError) {
      notify(`本地数据异常：${loadError}`, "danger");
      setLoadError(undefined);
    }
  }, [loadError, notify]);

  const activeTab = useMemo(() => activeTabFromView(view), [view]);

  function commit(mutator: (current: AppData) => AppData) {
    setData((current) => {
      const next = mutator(current);
      saveData(next);
      return next;
    });
  }

  function navigate(tab: MainTab) {
    if (view.name === "active" && tab !== "start") {
      const ok = window.confirm("离开训练中页面会放弃当前未保存内容，确认离开？");
      if (!ok) {
        return;
      }
    }
    if (tab === "start") {
      setStartPreset([]);
    }
    setView({ name: tab });
  }

  function saveSession(session: WorkoutSession) {
    commit((current) => ({
      ...current,
      sessions: [session, ...current.sessions],
    }));
    notify("训练已保存");
    setView({ name: "session-detail", sessionId: session.id });
  }

  function updateSession(session: WorkoutSession) {
    commit((current) => ({
      ...current,
      sessions: current.sessions.map((item) => (item.id === session.id ? session : item)),
    }));
    notify("记录已更新");
  }

  function deleteSession(sessionId: string) {
    commit((current) => ({
      ...current,
      sessions: current.sessions.filter((session) => session.id !== sessionId),
    }));
    notify("记录已删除");
    setView({ name: "history" });
  }

  function saveExercise(exercise: ExerciseTemplate) {
    commit((current) => {
      const existing = current.exercises.find((item) => item.id === exercise.id);
      const progressUpdates = [...current.progressUpdates];

      if (existing) {
        const changed =
          existing.defaultWeightKg !== exercise.defaultWeightKg ||
          existing.targetSets !== exercise.targetSets ||
          !sameRep(existing.targetReps, exercise.targetReps);

        if (changed) {
          progressUpdates.unshift({
            id: createId("progress"),
            exerciseTemplateId: exercise.id,
            date: todayYmd(),
            oldWeightKg: existing.defaultWeightKg ?? null,
            newWeightKg: exercise.defaultWeightKg ?? null,
            oldTargetSets: existing.targetSets ?? null,
            newTargetSets: exercise.targetSets ?? null,
            oldTargetReps: existing.targetReps ?? null,
            newTargetReps: exercise.targetReps ?? null,
            reason: "手动更新动作模板",
            createdAt: new Date().toISOString(),
          });
        }

        return {
          ...current,
          exercises: current.exercises.map((item) => (item.id === exercise.id ? exercise : item)),
          progressUpdates,
        };
      }

      return {
        ...current,
        exercises: [exercise, ...current.exercises],
      };
    });
    notify("动作已保存");
  }

  function archiveExercise(exerciseId: string) {
    commit((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, isArchived: true, updatedAt: new Date().toISOString() } : exercise,
      ),
    }));
    notify("动作已归档");
  }

  function updateTemplateFromExercise(session: WorkoutSession, exercise: SessionExercise) {
    if (!exercise.exerciseTemplateId) {
      notify("这个动作没有关联模板", "warning");
      return;
    }

    let changed = false;
    commit((current) => {
      const template = current.exercises.find((item) => item.id === exercise.exerciseTemplateId);
      if (!template) {
        return current;
      }

      const nextTemplate: ExerciseTemplate = {
        ...template,
        defaultWeightKg: exercise.actualWeightKg ?? template.defaultWeightKg ?? null,
        targetSets: exercise.actualSets ?? template.targetSets ?? null,
        targetReps: exercise.actualReps ?? template.targetReps ?? null,
        updatedAt: new Date().toISOString(),
      };

      changed =
        template.defaultWeightKg !== nextTemplate.defaultWeightKg ||
        template.targetSets !== nextTemplate.targetSets ||
        !sameRep(template.targetReps, nextTemplate.targetReps);

      if (!changed) {
        return current;
      }

      const progress: ProgressUpdate = {
        id: createId("progress"),
        exerciseTemplateId: template.id,
        date: session.date,
        oldWeightKg: template.defaultWeightKg ?? null,
        newWeightKg: nextTemplate.defaultWeightKg ?? null,
        oldTargetSets: template.targetSets ?? null,
        newTargetSets: nextTemplate.targetSets ?? null,
        oldTargetReps: template.targetReps ?? null,
        newTargetReps: nextTemplate.targetReps ?? null,
        reason: `${session.title} 后更新`,
        createdAt: new Date().toISOString(),
      };

      return {
        ...current,
        exercises: current.exercises.map((item) => (item.id === template.id ? nextTemplate : item)),
        progressUpdates: [progress, ...current.progressUpdates],
      };
    });

    notify(changed ? "模板已更新" : "模板已经是当前数值", changed ? "success" : "warning");
  }

  function importData(next: AppData) {
    saveData(next);
    setData(next);
    setView({ name: "dashboard" });
  }

  function restoreSeed() {
    const next = resetData();
    setData(next);
    setView({ name: "dashboard" });
    notify("已恢复初始数据");
  }

  function clearAll() {
    const next = clearData();
    setData(next);
    setView({ name: "dashboard" });
    notify("所有数据已清空");
  }

  return (
    <AppShell activeTab={activeTab} onNavigate={navigate}>
      {view.name === "dashboard" ? (
        <DashboardPage
          data={data}
          onOpenSettings={() => setView({ name: "settings" })}
          onOpenSession={(session) => setView({ name: "session-detail", sessionId: session.id })}
          onQuickStart={(groups) => {
            setStartPreset(groups);
            setView({ name: "start" });
          }}
        />
      ) : null}

      {view.name === "start" ? (
        <StartWorkoutView
          data={data}
          initialGroups={startPreset}
          notify={notify}
          onStartWorkout={(draft) => setView({ name: "active", draft })}
        />
      ) : null}

      {view.name === "active" ? (
        <ActiveWorkoutPage
          draft={view.draft}
          notify={notify}
          onCancel={() => setView({ name: "start" })}
          onSave={saveSession}
        />
      ) : null}

      {view.name === "history" ? (
        <HistoryPage
          data={data}
          onDeleteSession={deleteSession}
          onOpenSession={(session) => setView({ name: "session-detail", sessionId: session.id })}
        />
      ) : null}

      {view.name === "session-detail" ? (
        <SessionDetailPage
          data={data}
          sessionId={view.sessionId}
          notify={notify}
          onBack={() => setView({ name: "history" })}
          onDeleteSession={deleteSession}
          onUpdateSession={updateSession}
          onUpdateTemplateFromExercise={updateTemplateFromExercise}
        />
      ) : null}

      {view.name === "exercises" ? (
        <ExerciseLibraryPage
          data={data}
          notify={notify}
          onArchiveExercise={archiveExercise}
          onOpenExercise={(exerciseId) => setView({ name: "exercise-detail", exerciseId })}
          onSaveExercise={saveExercise}
        />
      ) : null}

      {view.name === "exercise-detail" ? (
        <ExerciseDetailPage
          data={data}
          exerciseId={view.exerciseId}
          notify={notify}
          onBack={() => setView({ name: "exercises" })}
          onSaveExercise={saveExercise}
        />
      ) : null}

      {view.name === "settings" ? (
        <SettingsPage
          data={data}
          notify={notify}
          onBack={() => setView({ name: "dashboard" })}
          onClear={clearAll}
          onImport={importData}
          onReset={restoreSeed}
        />
      ) : null}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast toast--${toast.tone}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
