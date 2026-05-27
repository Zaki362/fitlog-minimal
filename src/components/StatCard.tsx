import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  description?: string;
  icon?: ReactNode;
  onClick?: () => void;
};

export function StatCard({ label, value, hint, description, icon, onClick }: StatCardProps) {
  const content = (
    <>
      {icon ? <span className="stat-card__icon">{icon}</span> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
      {description ? <em>{description}</em> : null}
    </>
  );

  if (onClick) {
    return (
      <button className="stat-card stat-card--button" type="button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className="stat-card">
      {content}
    </div>
  );
}
