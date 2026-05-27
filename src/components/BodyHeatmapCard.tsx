import { useState } from "react";
import type { MuscleGroup } from "../types";
import { BodyTrainingMap } from "./BodyTrainingMap";

type BodyHeatmapCardProps = {
  lastTrainedMap: Partial<Record<MuscleGroup, string | null>>;
};

export function BodyHeatmapCard({ lastTrainedMap }: BodyHeatmapCardProps) {
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup>("legs");

  return (
    <section className="body-heatmap-card" aria-labelledby="body-heatmap-title">
      <div className="body-heatmap-card__header">
        <h2 id="body-heatmap-title">身体热力</h2>
        <span>按最近训练时间上色</span>
      </div>
      <BodyTrainingMap lastTrainedMap={lastTrainedMap} selectedGroup={selectedGroup} onSelectGroup={setSelectedGroup} />
    </section>
  );
}
