import type { SessionThumbnailType } from "../lib/calendar";
import { MUSCLE_LABELS } from "../types";

type SessionThumbnailProps = {
  type: SessionThumbnailType;
  size?: "tiny" | "small" | "large";
};

function ThumbnailIcon({ type }: { type: SessionThumbnailType }) {
  if (type === "cardio") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M23 8.8a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" />
        <path d="m18 17.4 5.4 3.8 4.6-1.2" />
        <path d="m23.4 21.2-4.5 5.2-6.1 1.4" />
        <path d="m22.3 23.1 4.5 5.5 4.7 1.3" />
        <path d="m15.2 16.2-4.2 4.6" />
      </svg>
    );
  }

  if (type === "legs") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M15.2 8.8h9.6l2 8.8-3.4 2.2 1.4 13.2h-5.3l-.9-10.6-2 10.6h-5.3l3.3-16.4z" />
        <path d="m20.1 9.1-.3 23.4" />
      </svg>
    );
  }

  if (type === "abs") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M13 11.5c1.4-1.8 3.7-2.7 7-2.7s5.6.9 7 2.7l-1.4 20.1H14.4z" />
        <path d="M16.4 15.6h7.2M15.9 20h8.2M15.6 24.4h8.8M20 14.2v13.8" />
      </svg>
    );
  }

  if (type === "arms") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M11.5 22.8c1.3-6.4 4.2-10.5 8.7-12.4l2.2 5.8c-3.4 1.2-5.3 3.6-5.8 7.2 2.7-2.2 6-2.1 8.8.4 2.1 1.9 2.2 5 .4 6.9-2 2.1-5.3 2.1-8.1.1l-5.1-3.7c-1.4-1-1.7-2.5-1.1-4.3Z" />
      </svg>
    );
  }

  if (type === "shoulder") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 8.5c3.6 0 6.2 1.4 7.8 4.2l6.2 2.4-3.8 8.2-4.3-2v10H14.1v-10l-4.3 2L6 15.1l6.2-2.4c1.6-2.8 4.2-4.2 7.8-4.2Z" />
        <path d="M12.2 12.7c1.7 4.5 4.3 6.8 7.8 6.8s6.1-2.3 7.8-6.8" />
      </svg>
    );
  }

  if (type === "chest") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 8.5c3.4 0 5.8 1.2 7.1 3.5l4.2 3.1-4.4 16.6H13.1L8.7 15.1l4.2-3.1c1.3-2.3 3.7-3.5 7.1-3.5Z" />
        <path d="M13.3 15.1c2.2-1.8 4.4-2.5 6.7-2.1 2.3-.4 4.5.3 6.7 2.1M20 13.1v12" />
      </svg>
    );
  }

  if (type === "back") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 8.2c3.3 0 5.8 1.2 7.4 3.6l4 3.4-5.3 16.5H13.9L8.6 15.2l4-3.4c1.6-2.4 4.1-3.6 7.4-3.6Z" />
        <path d="M13.2 14.4 20 29.2l6.8-14.8M20 10.7v18.5" />
      </svg>
    );
  }

  return <span>{MUSCLE_LABELS[type].slice(0, 1)}</span>;
}

export function SessionThumbnail({ type, size = "small" }: SessionThumbnailProps) {
  return (
    <span className={`session-thumbnail session-thumbnail--${type} session-thumbnail--${size}`} aria-hidden="true">
      <ThumbnailIcon type={type} />
    </span>
  );
}
