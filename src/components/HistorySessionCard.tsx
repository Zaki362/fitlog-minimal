import { parseYmd } from "../lib/date";
import { buildWorkoutTitle } from "../lib/workout";
import type { CardioEntry, MuscleGroup, WorkoutSession } from "../types";
import { MUSCLE_LABELS } from "../types";

type HistorySessionCardProps = {
  session: WorkoutSession;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onOpen: () => void;
  onDelete: () => void;
};

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatDateShort(date: string): string {
  const parsed = parseYmd(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return `${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(parsed.getDate()).padStart(2, "0")}`;
}

function formatWeekday(date: string): string {
  const parsed = parseYmd(date);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return WEEKDAYS[parsed.getDay()];
}

function formatCardio(entry: CardioEntry): string {
  const details = [
    entry.distanceKm ? `${entry.distanceKm}km` : "",
    entry.durationMinutes ? `${entry.durationMinutes}min` : "",
  ].filter(Boolean);
  return [entry.type, ...details].join(" ");
}

function getCardioSummary(session: WorkoutSession): string {
  return session.cardio?.length ? session.cardio.map(formatCardio).join(" / ") : "";
}

function getSessionTitle(session: WorkoutSession): string {
  return session.title?.trim() || buildWorkoutTitle(session.muscleGroups, session.cardio ?? []);
}

function getSessionSummary(session: WorkoutSession): string {
  const cardioSummary = getCardioSummary(session);
  if (session.exercises.length) {
    const completed = session.exercises.filter((exercise) => exercise.completed).length;
    const exerciseSummary = `完成 ${completed}/${session.exercises.length} 个动作`;
    return cardioSummary ? `${exerciseSummary} · ${cardioSummary}` : exerciseSummary;
  }
  return cardioSummary || "历史记录";
}

function getTags(session: WorkoutSession): { groups: MuscleGroup[]; moreCount: number } {
  const groups = new Set<MuscleGroup>(session.muscleGroups);
  if (session.cardio?.length) {
    groups.add("cardio");
  }
  const visible = [...groups].slice(0, 3);
  return {
    groups: visible,
    moreCount: Math.max(0, groups.size - visible.length),
  };
}

export function HistorySessionCard({
  session,
  menuOpen,
  onToggleMenu,
  onOpen,
  onDelete,
}: HistorySessionCardProps) {
  const tags = getTags(session);

  return (
    <article className="history-session-card">
      <button className="history-session-card__main" type="button" onClick={onOpen}>
        <span className="history-session-card__date">
          <strong>{formatDateShort(session.date)}</strong>
          <small>{formatWeekday(session.date)}</small>
        </span>
        <span className="history-session-card__content">
          <strong>{getSessionTitle(session)}</strong>
          <small>{getSessionSummary(session)}</small>
          <span className="history-session-card__tags">
            {tags.groups.map((group) => (
              <i key={group}>{MUSCLE_LABELS[group]}</i>
            ))}
            {tags.moreCount ? <i>+{tags.moreCount}</i> : null}
          </span>
        </span>
        <span className="history-session-card__chevron" aria-hidden="true">
          ›
        </span>
      </button>

      <button
        className="history-session-card__more"
        type="button"
        aria-label={`${getSessionTitle(session)} 更多操作`}
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.stopPropagation();
          onToggleMenu();
        }}
      >
        ...
      </button>

      {menuOpen ? (
        <div className="history-card-menu" role="menu">
          <button type="button" role="menuitem" onClick={onOpen}>
            查看 / 编辑
          </button>
          <button className="is-danger" type="button" role="menuitem" onClick={onDelete}>
            删除记录
          </button>
        </div>
      ) : null}
    </article>
  );
}
