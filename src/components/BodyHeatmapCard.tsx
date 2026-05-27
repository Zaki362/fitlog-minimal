import type { MuscleGroup } from "../types";
import { MUSCLE_LABELS } from "../types";
import { diffDays, todayYmd } from "../lib/date";
import { formatLastTrainedStatus } from "../lib/stats";

type BodyHeatmapCardProps = {
  lastTrainedMap: Partial<Record<MuscleGroup, string | null>>;
};

type BodyStatusItem = {
  group: MuscleGroup;
  lastDate: string | null;
  status: string;
  daysSince: number | null;
};

const BODY_STATUS_GROUPS: MuscleGroup[] = ["legs", "chest", "shoulder", "back", "abs", "arms"];

function getLastDate(group: MuscleGroup, lastTrainedMap: Partial<Record<MuscleGroup, string | null>>): string | null {
  if (group === "arms") {
    return lastTrainedMap.arms ?? lastTrainedMap.biceps ?? lastTrainedMap.triceps ?? null;
  }
  return lastTrainedMap[group] ?? null;
}

export function BodyHeatmapCard({ lastTrainedMap }: BodyHeatmapCardProps) {
  const referenceYmd = todayYmd();
  const items: BodyStatusItem[] = BODY_STATUS_GROUPS.map((group) => {
    const lastDate = getLastDate(group, lastTrainedMap);
    return {
      group,
      lastDate,
      status: formatLastTrainedStatus(group, lastDate, referenceYmd),
      daysSince: lastDate ? Math.max(0, diffDays(lastDate, referenceYmd)) : null,
    };
  }).sort((a, b) => {
    const aScore = a.daysSince ?? Number.POSITIVE_INFINITY;
    const bScore = b.daysSince ?? Number.POSITIVE_INFINITY;
    return bScore - aScore || BODY_STATUS_GROUPS.indexOf(a.group) - BODY_STATUS_GROUPS.indexOf(b.group);
  });

  return (
    <section className="body-heatmap-card" aria-labelledby="body-heatmap-title">
      <div className="body-heatmap-card__header">
        <h2 id="body-heatmap-title">部位状态</h2>
        <span>久未训练优先</span>
      </div>
      <div className="body-status-list">
        {items.map((item, index) => (
          <article className="body-status-row" key={item.group}>
            <span className="body-status-row__rank">{index + 1}</span>
            <div>
              <strong>{MUSCLE_LABELS[item.group]}</strong>
              <span>{item.status}</span>
            </div>
            <em>{item.daysSince === null ? "从未" : `${item.daysSince}天`}</em>
          </article>
        ))}
      </div>
    </section>
  );
}
