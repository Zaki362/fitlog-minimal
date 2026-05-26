import type { MuscleGroup } from "../types";
import { MUSCLE_LABELS } from "../types";

type MuscleChipProps = {
  group: MuscleGroup;
  selected?: boolean;
  muted?: boolean;
  onClick?: () => void;
};

export function MuscleChip({ group, selected = false, muted = false, onClick }: MuscleChipProps) {
  const className = ["muscle-chip", selected ? "is-selected" : "", muted ? "is-muted" : ""]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button className={className} type="button" onClick={onClick}>
        {MUSCLE_LABELS[group]}
      </button>
    );
  }

  return <span className={className}>{MUSCLE_LABELS[group]}</span>;
}
