import { BodyHeatmapCard } from "../components/BodyHeatmapCard";
import { DashboardTrainingVisual } from "../components/DashboardTrainingVisual";
import { EmptyState } from "../components/EmptyState";
import { StatCard } from "../components/StatCard";
import { formatDateCN, todayYmd } from "../lib/date";
import {
  getLastTrainedDateByMuscleGroup,
  getRecentSessions,
  getThisMonthWorkoutCount,
  getThisWeekWorkoutCount,
  getTotalWorkoutCount,
  getTrainingRecommendation,
} from "../lib/stats";
import { formatSessionLine, templateMatchesSelected } from "../lib/workout";
import type { AppData, MuscleGroup, WorkoutSession } from "../types";

type DashboardPageProps = {
  data: AppData;
  onQuickStart: (groups: MuscleGroup[]) => void;
  onOpenHistory: () => void;
  onOpenSession: (session: WorkoutSession) => void;
  onOpenSettings: () => void;
};

export function DashboardPage({ data, onQuickStart, onOpenHistory, onOpenSession, onOpenSettings }: DashboardPageProps) {
  const recent = getRecentSessions(data, 3);
  const recommendation = getTrainingRecommendation(data);
  const lastTrainedMap = getLastTrainedDateByMuscleGroup(data);
  const heroExercise = data.exercises.find(
    (exercise) => !exercise.isArchived && templateMatchesSelected(exercise, recommendation.primaryGroups),
  );

  return (
    <div className="page dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <h1>练一下</h1>
          <p className="dashboard-date">{formatDateCN(todayYmd())}</p>
        </div>
        <button className="icon-button icon-button--plain" type="button" onClick={onOpenSettings} aria-label="打开设置">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z" />
            <path d="M19 13.2a7.5 7.5 0 0 0 .1-1.2 7.5 7.5 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a8.2 8.2 0 0 0-2.1-1.2L14.2 3h-4.4l-.4 2.6a8.2 8.2 0 0 0-2.1 1.2l-2.4-1-2 3.5 2 1.5a7.5 7.5 0 0 0-.1 1.2c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1c.6.5 1.3.9 2.1 1.2l.4 2.6h4.4l.4-2.6c.8-.3 1.5-.7 2.1-1.2l2.4 1 2-3.5Z" />
          </svg>
        </button>
      </header>

      <section className="stat-grid stat-grid--compact" aria-label="训练统计">
        <StatCard label="本周训练" value={getThisWeekWorkoutCount(data)} hint="次" />
        <StatCard label="本月训练" value={getThisMonthWorkoutCount(data)} hint="次" />
        <StatCard label="总训练" value={getTotalWorkoutCount(data)} hint="次" />
      </section>

      <section className="dashboard-start">
        <button className="button button--primary button--block dashboard-start__button" type="button" onClick={() => onQuickStart([])}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13.2 2.8 5.7 13.1h5.7l-.6 8.1 7.5-10.4h-5.7z" />
          </svg>
          开始训练
        </button>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>今日任务</h2>
        </div>
        <DashboardTrainingVisual
          heroExercise={heroExercise}
          recommendation={recommendation}
          onStart={onQuickStart}
        />
      </section>

      <BodyHeatmapCard lastTrainedMap={lastTrainedMap} />

      <section className="panel">
        <div className="section-title">
          <h2>最近三次</h2>
          <button className="text-link" type="button" onClick={onOpenHistory}>
            查看全部
            <span aria-hidden="true">›</span>
          </button>
        </div>
        {recent.length ? (
          <div className="session-list session-list--compact">
            {recent.map((session) => (
              <button
                className="session-row session-row--button"
                key={session.id}
                type="button"
                onClick={() => onOpenSession(session)}
              >
                <span>{formatSessionLine(session)}</span>
                <small>{formatDateCN(session.date)}</small>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="还没有训练记录" actionLabel="开始训练" onAction={() => onQuickStart([])} />
        )}
      </section>
    </div>
  );
}
