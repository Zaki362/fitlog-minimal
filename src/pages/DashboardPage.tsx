import { EmptyState } from "../components/EmptyState";
import { MuscleChip } from "../components/MuscleChip";
import { StatCard } from "../components/StatCard";
import { formatDateCN, todayYmd } from "../lib/date";
import {
  getMuscleGroupCounts,
  getRecentSessions,
  getThisMonthWorkoutCount,
  getThisWeekWorkoutCount,
  getTotalWorkoutCount,
  getUndertrainedMuscleGroups,
  getWorkoutCalendarData,
} from "../lib/stats";
import { formatSessionLine } from "../lib/workout";
import type { AppData, MuscleGroup, WorkoutSession } from "../types";
import { MUSCLE_LABELS } from "../types";

type DashboardPageProps = {
  data: AppData;
  onQuickStart: (groups: MuscleGroup[]) => void;
  onOpenSession: (session: WorkoutSession) => void;
  onOpenSettings: () => void;
};

const quickGroups: Array<{ label: string; groups: MuscleGroup[] }> = [
  { label: "背", groups: ["back"] },
  { label: "胸", groups: ["chest"] },
  { label: "肩", groups: ["shoulder"] },
  { label: "腹", groups: ["abs"] },
  { label: "胳膊", groups: ["arms"] },
  { label: "腿", groups: ["legs"] },
  { label: "自定义", groups: ["custom"] },
];

export function DashboardPage({ data, onQuickStart, onOpenSession, onOpenSettings }: DashboardPageProps) {
  const recent = getRecentSessions(data, 5);
  const lastSession = recent[0];
  const counts = getMuscleGroupCounts(data, 30);
  const undertrained = getUndertrainedMuscleGroups(data);
  const calendar = getWorkoutCalendarData(data, 30);
  const maxCount = Math.max(1, ...Object.values(counts).map((value) => value ?? 0));
  const distribution = Object.entries(counts)
    .filter(([, count]) => Boolean(count))
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0)) as Array<[MuscleGroup, number]>;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">今日 {formatDateCN(todayYmd())}</p>
          <h1>练一下</h1>
        </div>
        <button className="icon-button icon-button--solid" type="button" onClick={onOpenSettings}>
          设置
        </button>
      </header>

      <section className="stat-grid" aria-label="训练统计">
        <StatCard label="本周" value={getThisWeekWorkoutCount(data)} hint="次训练" />
        <StatCard label="本月" value={getThisMonthWorkoutCount(data)} hint="次训练" />
        <StatCard label="总计" value={getTotalWorkoutCount(data)} hint="条记录" />
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>最近一次</h2>
        </div>
        {lastSession ? (
          <button className="session-row session-row--button" type="button" onClick={() => onOpenSession(lastSession)}>
            <span>{formatSessionLine(lastSession)}</span>
            <small>{formatDateCN(lastSession.date)}</small>
          </button>
        ) : (
          <EmptyState title="还没有训练记录" actionLabel="开始一练" onAction={() => onQuickStart(["custom"])} />
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>快捷开始</h2>
        </div>
        <div className="quick-grid">
          {quickGroups.map((item) => (
            <button className="quick-button" key={item.label} type="button" onClick={() => onQuickStart(item.groups)}>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>最近 30 天</h2>
        </div>
        {distribution.length ? (
          <div className="distribution">
            {distribution.map(([group, count]) => (
              <div className="distribution__row" key={group}>
                <span>{MUSCLE_LABELS[group]}</span>
                <div className="distribution__bar">
                  <i style={{ width: `${Math.max(12, (count / maxCount) * 100)}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="最近 30 天还没有记录" />
        )}

        <div className="calendar-strip" aria-label="最近 30 天训练日历">
          {calendar.map((day) => (
            <span
              className={`calendar-dot ${day.count ? "is-active" : ""}`}
              key={day.date}
              title={`${day.date} ${day.count}次`}
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>久未训练</h2>
        </div>
        {undertrained.length ? (
          <div className="alert-list">
            {undertrained.map((item) => (
              <div className="alert-card" key={item.muscleGroup}>
                <MuscleChip group={item.muscleGroup} />
                <span>{item.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">主要部位节奏不错。</p>
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>最近记录</h2>
        </div>
        {recent.length ? (
          <div className="session-list">
            {recent.map((session) => (
              <button
                className="session-row session-row--button"
                key={session.id}
                type="button"
                onClick={() => onOpenSession(session)}
              >
                <span>{formatSessionLine(session)}</span>
                <small>{session.muscleGroups.map((group) => MUSCLE_LABELS[group]).join(" + ")}</small>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="没有训练记录" />
        )}
      </section>
    </div>
  );
}
