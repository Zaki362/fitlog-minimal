import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ActiveWorkoutPage } from "./pages/ActiveWorkoutPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { ExerciseLibraryPage } from "./pages/ExerciseLibraryPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SessionDetailPage } from "./pages/SessionDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StartWorkoutPage as StartWorkoutView } from "./pages/StartWorkoutPage";
import { TrainingCalendarPage } from "./pages/TrainingCalendarPage";
import { clearData, loadData, resetData, saveData, saveLocalDataBackup } from "./lib/storage";
import { clearActiveWorkoutDraft, loadActiveWorkoutDraft, saveActiveWorkoutDraft } from "./lib/activeWorkoutDraft";
import { loadCloudSyncSettings, pushCloudData, saveCloudSyncSettings } from "./lib/cloudSync";
import { activatePwaUpdate, isStandalonePwa, registerPwa, type BeforeInstallPromptEvent } from "./lib/pwa";
import { buildWorkoutTitle, createId, sortMuscleGroups } from "./lib/workout";
import { todayYmd } from "./lib/date";
import { getDefaultTrainingPlan } from "./lib/trainingPlan";
import type {
  ActiveWorkoutDraft,
  AppData,
  ExerciseTemplate,
  MuscleGroup,
  ProgressUpdate,
  SessionExercise,
  TrainingPlan,
  WorkoutSession,
} from "./types";

export type MainTab = "dashboard" | "start" | "history" | "exercises";

type View =
  | { name: MainTab }
  | { name: "active"; draft: ActiveWorkoutDraft }
  | { name: "session-detail"; sessionId: string; backTo?: "history" | "calendar" }
  | { name: "exercise-detail"; exerciseId: string }
  | { name: "training-calendar" }
  | { name: "settings" };

type Toast = {
  id: string;
  message: string;
  tone: "success" | "warning" | "danger";
};

function sameRep(a: number | string | null | undefined, b: number | string | null | undefined): boolean {
  return String(a ?? "") === String(b ?? "");
}

function hasTemplateMetricChange(template: ExerciseTemplate, exercise: SessionExercise): boolean {
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

function mergeOptionalText(first?: string, second?: string): string {
  const parts = [first?.trim(), second?.trim()].filter((value): value is string => Boolean(value));
  return [...new Set(parts)].join("\n");
}

function mergeDuration(first?: number | null, second?: number | null): number | null {
  const total = (first ?? 0) + (second ?? 0);
  return total > 0 ? total : null;
}

function mergeWorkoutSessions(existing: WorkoutSession, incoming: WorkoutSession): WorkoutSession {
  const cardio = [...(existing.cardio ?? []), ...(incoming.cardio ?? [])];
  const muscleGroups = sortMuscleGroups([...existing.muscleGroups, ...incoming.muscleGroups]);

  return {
    ...existing,
    title: buildWorkoutTitle(muscleGroups, cardio),
    muscleGroups,
    exercises: [...existing.exercises, ...incoming.exercises],
    cardio: cardio.length ? cardio : undefined,
    durationMinutes: mergeDuration(existing.durationMinutes, incoming.durationMinutes),
    overallFeeling: incoming.overallFeeling ?? existing.overallFeeling ?? null,
    notes: mergeOptionalText(existing.notes, incoming.notes),
    updatedAt: incoming.updatedAt,
  };
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
  if (view.name === "training-calendar") {
    return "dashboard";
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
  const [recoverableDraft, setRecoverableDraft] = useState(loadActiveWorkoutDraft);
  const [view, setView] = useState<View>({ name: "dashboard" });
  const [startPreset, setStartPreset] = useState<MuscleGroup[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cloudSettings, setCloudSettings] = useState(loadCloudSyncSettings);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [pwaRegistration, setPwaRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [pwaUpdateAvailable, setPwaUpdateAvailable] = useState(false);
  const autoSyncReadyRef = useRef(false);

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

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      notify("已安装到设备");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [notify]);

  useEffect(() => {
    function syncOnlineState() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);
    return () => {
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return undefined;
    }

    let active = true;
    void registerPwa({
      onNeedRefresh: (registration) => {
        if (!active) {
          return;
        }
        setPwaRegistration(registration);
        setPwaUpdateAvailable(true);
      },
      onOfflineReady: () => notify("离线缓存已准备好"),
      onError: () => notify("PWA 缓存注册失败，可刷新后重试", "warning"),
    }).then((registration) => {
      if (active && registration) {
        setPwaRegistration(registration);
      }
    });

    return () => {
      active = false;
    };
  }, [notify]);

  useEffect(() => {
    if (!autoSyncReadyRef.current) {
      autoSyncReadyRef.current = true;
      return;
    }

    if (!cloudSettings.autoSync || !cloudSettings.syncId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void pushCloudData(cloudSettings.syncId as string, data)
        .then((result) => {
          setCloudSettings((current) => {
            const next = saveCloudSyncSettings({
              ...current,
              lastPushedAt: result.updatedAt,
              lastSyncedAt: result.updatedAt,
            });
            return next;
          });
        })
        .catch(() => {
          notify("自动云同步失败，可稍后在设置里手动上传", "warning");
        });
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [cloudSettings.autoSync, cloudSettings.syncId, data, notify]);

  function commit(mutator: (current: AppData) => AppData) {
    setData((current) => {
      const next = saveData(mutator(current));
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

  async function installPwa() {
    if (!installPrompt) {
      notify("当前浏览器没有提供一键安装，请使用浏览器菜单添加到主屏幕", "warning");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    notify(choice.outcome === "accepted" ? "安装已开始" : "已取消安装", choice.outcome === "accepted" ? "success" : "warning");
  }

  function applyPwaUpdate() {
    if (view.name === "active") {
      notify("训练中先完成或放弃当前训练，再更新 App", "warning");
      return;
    }

    saveLocalDataBackup(data, "PWA 更新前自动备份");
    const activated = activatePwaUpdate(pwaRegistration);
    if (!activated) {
      window.location.reload();
    }
  }

  function saveSession(session: WorkoutSession, updateTemplates = false) {
    const sameDaySession = data.sessions.find((item) => item.date === session.date);
    const destinationSessionId = sameDaySession?.id ?? session.id;
    const mergedSameDay = Boolean(sameDaySession);

    clearActiveWorkoutDraft();
    setRecoverableDraft(null);
    commit((current) => {
      const progressUpdates = [...current.progressUpdates];
      const exercises = current.exercises.map((template) => {
        if (!updateTemplates) {
          return template;
        }

        const sessionExercise = session.exercises.find(
          (exercise) => exercise.exerciseTemplateId === template.id && hasTemplateMetricChange(template, exercise),
        );

        if (!sessionExercise) {
          return template;
        }

        progressUpdates.unshift({
          id: createId("progress"),
          exerciseTemplateId: template.id,
          date: session.date,
          oldWeightKg: template.defaultWeightKg ?? null,
          newWeightKg: sessionExercise.actualWeightKg ?? null,
          oldTargetSets: template.targetSets ?? null,
          newTargetSets: sessionExercise.actualSets ?? template.targetSets ?? null,
          oldTargetReps: template.targetReps ?? null,
          newTargetReps: sessionExercise.actualReps ?? template.targetReps ?? null,
          reason: `${session.title} 后更新模板`,
          createdAt: new Date().toISOString(),
        });

        return {
          ...template,
          defaultWeightKg: sessionExercise.actualWeightKg ?? template.defaultWeightKg ?? null,
          targetSets: sessionExercise.actualSets ?? template.targetSets ?? null,
          targetReps: sessionExercise.actualReps ?? template.targetReps ?? null,
          updatedAt: new Date().toISOString(),
        };
      });
      const existingSession = current.sessions.find((item) => item.date === session.date);
      const sessions = existingSession
        ? current.sessions.map((item) => (item.id === existingSession.id ? mergeWorkoutSessions(item, session) : item))
        : [session, ...current.sessions];

      return {
        ...current,
        exercises,
        progressUpdates,
        sessions,
      };
    });
    notify(mergedSameDay ? "已合并到当天训练记录" : "训练已保存");
    setView({ name: "session-detail", sessionId: destinationSessionId });
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

  function saveTrainingPlan(trainingPlan: TrainingPlan) {
    commit((current) => ({
      ...current,
      trainingPlan,
    }));
    notify("训练计划已更新");
  }

  function resetTrainingPlan() {
    const ok = window.confirm("恢复默认训练计划？当前计划设置会被覆盖。");
    if (!ok) {
      return;
    }
    commit((current) => ({
      ...current,
      trainingPlan: getDefaultTrainingPlan(new Date().toISOString()),
    }));
    notify("已恢复默认训练计划");
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
    clearActiveWorkoutDraft();
    setRecoverableDraft(null);
    setData(saveData(next));
    setView({ name: "dashboard" });
  }

  function restoreSeed() {
    clearActiveWorkoutDraft();
    setRecoverableDraft(null);
    const next = resetData();
    setData(next);
    setView({ name: "dashboard" });
    notify("已恢复初始数据");
  }

  function clearAll() {
    clearActiveWorkoutDraft();
    setRecoverableDraft(null);
    const next = clearData();
    setData(next);
    setView({ name: "dashboard" });
    notify("所有数据已清空");
  }

  return (
    <AppShell activeTab={activeTab} hideNav={view.name === "active" || view.name === "training-calendar"} onNavigate={navigate}>
      {view.name === "dashboard" ? (
        <DashboardPage
          data={data}
          onOpenCalendar={() => setView({ name: "training-calendar" })}
          onOpenHistory={() => setView({ name: "history" })}
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
          onOpenExerciseLibrary={() => setView({ name: "exercises" })}
          onStartWorkout={(draft) => {
            saveActiveWorkoutDraft(draft);
            setRecoverableDraft(null);
            setView({ name: "active", draft });
          }}
        />
      ) : null}

      {view.name === "active" ? (
        <ActiveWorkoutPage
          data={data}
          draft={view.draft}
          notify={notify}
          onDraftChange={saveActiveWorkoutDraft}
          onCancel={() => {
            clearActiveWorkoutDraft();
            setRecoverableDraft(null);
            setView({ name: "start" });
          }}
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
          onBack={() => {
            if (view.backTo === "calendar") {
              setView({ name: "training-calendar" });
              return;
            }
            setView({ name: "history" });
          }}
          onDeleteSession={deleteSession}
          onUpdateSession={updateSession}
          onUpdateTemplateFromExercise={updateTemplateFromExercise}
        />
      ) : null}

      {view.name === "training-calendar" ? (
        <TrainingCalendarPage
          data={data}
          onAddRecord={() => {
            setStartPreset([]);
            setView({ name: "start" });
          }}
          onBack={() => setView({ name: "dashboard" })}
          onOpenSession={(session) =>
            setView({ name: "session-detail", sessionId: session.id, backTo: "calendar" })
          }
        />
      ) : null}

      {view.name === "exercises" ? (
        <ExerciseLibraryPage
          data={data}
          notify={notify}
          onArchiveExercise={archiveExercise}
          onOpenExercise={(exerciseId) => setView({ name: "exercise-detail", exerciseId })}
          onSaveExercise={saveExercise}
          onSaveTrainingPlan={saveTrainingPlan}
          onResetTrainingPlan={resetTrainingPlan}
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
          cloudSettings={cloudSettings}
          onImport={importData}
          onCloudSettingsChange={setCloudSettings}
          onReset={restoreSeed}
          pwaStatus={{
            canInstall: Boolean(installPrompt),
            isOnline,
            isStandalone: isStandalonePwa(),
            serviceWorkerSupported: "serviceWorker" in navigator,
            updateAvailable: pwaUpdateAvailable,
            onInstall: () => void installPwa(),
            onUpdate: applyPwaUpdate,
          }}
        />
      ) : null}

      {pwaUpdateAvailable ? (
        <div className="pwa-update-banner" role="status">
          <span>有新版本可用，更新前会自动备份本机数据。</span>
          <div>
            <button className="button button--ghost" type="button" onClick={() => setPwaUpdateAvailable(false)}>
              稍后
            </button>
            <button className="button button--primary" type="button" onClick={applyPwaUpdate}>
              立即更新
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(recoverableDraft && view.name !== "active")}
        title="继续未完成训练？"
        description={
          recoverableDraft
            ? `${recoverableDraft.title} · ${recoverableDraft.exercises.length} 个动作，刷新前已自动保存。`
            : undefined
        }
        confirmLabel="继续训练"
        cancelLabel="丢弃"
        onCancel={() => {
          clearActiveWorkoutDraft();
          setRecoverableDraft(null);
        }}
        onConfirm={() => {
          if (!recoverableDraft) {
            return;
          }
          setView({ name: "active", draft: recoverableDraft });
          setRecoverableDraft(null);
          notify("已恢复未完成训练");
        }}
      />

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
