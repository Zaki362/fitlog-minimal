import { useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { MuscleChip } from "../components/MuscleChip";
import { compareYmdDesc, formatDateCN } from "../lib/date";
import { formatSessionLine } from "../lib/workout";
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
  "arms",
  "legs",
  "cardio",
  "custom",
];

export function HistoryPage({ data, onOpenSession, onDeleteSession }: HistoryPageProps) {
  const [filter, setFilter] = useState<"all" | MuscleGroup>("all");
  const [pendingDelete, setPendingDelete] = useState<WorkoutSession | null>(null);

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

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">记录</p>
          <h1>训练时间线</h1>
        </div>
        <span className="counter-pill">{sessions.length} 条</span>
      </header>

      <section className="panel">
        <div className="filter-row">
          {filterOptions.map((option) =>
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

      <section className="session-list">
        {sessions.length ? (
          sessions.map((session) => (
            <article className="history-card" key={session.id}>
              <button className="card-hit" type="button" onClick={() => onOpenSession(session)} />
              <div className="card-row">
                <div>
                  <p className="eyebrow">{formatDateCN(session.date)}</p>
                  <h3>{formatSessionLine(session)}</h3>
                </div>
                <span className="counter-pill">{session.exercises.filter((item) => item.completed).length}</span>
              </div>
              <div className="chip-line">
                {session.muscleGroups.map((group) => (
                  <MuscleChip group={group} key={group} muted />
                ))}
              </div>
              <div className="inline-actions">
                <button className="button button--secondary" type="button" onClick={() => onOpenSession(session)}>
                  详情 / 编辑
                </button>
                <button
                  className="button button--danger"
                  type="button"
                  onClick={() => setPendingDelete(session)}
                >
                  删除
                </button>
              </div>
            </article>
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
