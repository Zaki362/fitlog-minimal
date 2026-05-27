import { useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { HistorySessionCard } from "../components/HistorySessionCard";
import { compareYmdDesc, parseYmd } from "../lib/date";
import type { AppData, MuscleGroup, WorkoutSession } from "../types";
import { MUSCLE_LABELS } from "../types";

type HistoryPageProps = {
  data: AppData;
  onOpenSession: (session: WorkoutSession) => void;
  onDeleteSession: (sessionId: string) => void;
};

const filterOptions: Array<"all" | MuscleGroup> = [
  "all",
  "back",
  "chest",
  "shoulder",
  "abs",
  "legs",
  "cardio",
  "custom",
];

type MonthGroup = {
  key: string;
  label: string;
  sessions: WorkoutSession[];
};

function monthKey(date: string): string {
  const parsed = parseYmd(date);
  if (Number.isNaN(parsed.getTime())) {
    return date.slice(0, 7) || "unknown";
  }
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: string): string {
  const parsed = parseYmd(date);
  if (Number.isNaN(parsed.getTime())) {
    return date.slice(0, 7) || "未知月份";
  }
  return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月`;
}

function groupSessionsByMonth(sessions: WorkoutSession[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  sessions.forEach((session) => {
    const key = monthKey(session.date);
    const existing = groups.get(key);
    if (existing) {
      existing.sessions.push(session);
      return;
    }
    groups.set(key, {
      key,
      label: monthLabel(session.date),
      sessions: [session],
    });
  });
  return [...groups.values()];
}

export function HistoryPage({ data, onOpenSession, onDeleteSession }: HistoryPageProps) {
  const [filter, setFilter] = useState<"all" | MuscleGroup>("all");
  const [pendingDelete, setPendingDelete] = useState<WorkoutSession | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const sessions = useMemo(() => {
    return [...data.sessions]
      .filter((session) => {
        if (filter === "all") {
          return true;
        }
        return (
          session.muscleGroups.includes(filter) ||
          session.exercises.some((exercise) =>
            filter === "arms"
              ? exercise.muscleGroup === "biceps" ||
                exercise.muscleGroup === "triceps" ||
                exercise.muscleGroup === "arms"
              : exercise.muscleGroup === filter,
          ) ||
          (filter === "cardio" && Boolean(session.cardio?.length))
        );
      })
      .sort((a, b) => compareYmdDesc(a.date, b.date));
  }, [data.sessions, filter]);

  const monthGroups = useMemo(() => groupSessionsByMonth(sessions), [sessions]);

  return (
    <div className="page history-page">
      <header className="history-header">
        <p>记录</p>
        <div className="history-header__title-row">
          <h1>训练记录</h1>
          <span>{sessions.length}条</span>
        </div>
        <small>按时间查看你的训练节奏</small>
      </header>

      <section className="history-filter" aria-label="按部位筛选记录">
        <div className="history-filter-row">
          {filterOptions.map((option) =>
            option === "all" ? (
              <button
                className={`history-filter-chip ${filter === "all" ? "is-selected" : ""}`}
                key={option}
                type="button"
                onClick={() => setFilter("all")}
              >
                全部
              </button>
            ) : (
              <button
                className={`history-filter-chip ${filter === option ? "is-selected" : ""}`}
                key={option}
                type="button"
                onClick={() => setFilter(option)}
              >
                {MUSCLE_LABELS[option]}
              </button>
            ),
          )}
        </div>
      </section>

      <section className="history-timeline">
        {monthGroups.length ? (
          monthGroups.map((group) => (
            <section className="history-month" key={group.key} aria-labelledby={`history-${group.key}`}>
              <div className="history-month__header">
                <h2 id={`history-${group.key}`}>{group.label}</h2>
                <span>{group.sessions.length}次训练</span>
              </div>
              <div className="history-month__list">
                {group.sessions.map((session) => (
                  <HistorySessionCard
                    key={session.id}
                    session={session}
                    menuOpen={openMenuId === session.id}
                    onToggleMenu={() => setOpenMenuId((current) => (current === session.id ? null : session.id))}
                    onOpen={() => {
                      setOpenMenuId(null);
                      onOpenSession(session);
                    }}
                    onDelete={() => {
                      setOpenMenuId(null);
                      setPendingDelete(session);
                    }}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <EmptyState title="没有符合筛选的记录" />
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="删除这条记录？"
        description={pendingDelete ? pendingDelete.title : undefined}
        danger
        confirmLabel="删除"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            onDeleteSession(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
