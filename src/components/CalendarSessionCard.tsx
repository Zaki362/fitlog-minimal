import {
  getSessionCalendarMeta,
  getSessionCalendarTitle,
  getSessionThumbnailType,
} from "../lib/calendar";
import type { MuscleGroup, WorkoutSession } from "../types";
import { MUSCLE_LABELS } from "../types";
import { SessionThumbnail } from "./SessionThumbnail";

type CalendarSessionCardProps = {
  session: WorkoutSession;
  onOpen: () => void;
};

function getVisibleGroups(session: WorkoutSession): MuscleGroup[] {
  const groups = new Set<MuscleGroup>(session.muscleGroups);
  if (session.cardio?.length) {
    groups.add("cardio");
  }
  return [...groups].slice(0, 3);
}

export function CalendarSessionCard({ session, onOpen }: CalendarSessionCardProps) {
  const groups = getVisibleGroups(session);

  return (
    <button className="calendar-session-card" type="button" onClick={onOpen}>
      <SessionThumbnail type={getSessionThumbnailType(session)} size="large" />
      <strong>{getSessionCalendarTitle(session)}</strong>
      <small>{getSessionCalendarMeta(session)}</small>
      <span>
        {groups.map((group) => (
          <i key={group}>{MUSCLE_LABELS[group]}</i>
        ))}
      </span>
    </button>
  );
}
