import { useMemo, useState } from "react";
import { diffDays, todayYmd } from "../lib/date";
import { getTrainingFreshnessColor } from "../lib/stats";
import type { MuscleGroup } from "../types";
import { MUSCLE_LABELS } from "../types";

type BodyTrainingMapProps = {
  lastTrainedMap: Partial<Record<MuscleGroup, string | null>>;
  compact?: boolean;
  selectedGroup?: MuscleGroup | null;
  onSelectGroup?: (group: MuscleGroup) => void;
};

type BodyPart = {
  group: MuscleGroup;
  label: string;
  d: string;
};

const parts: BodyPart[] = [
  {
    group: "shoulder",
    label: "肩",
    d: "M48 57 C39 60 34 67 33 78 L47 82 C50 73 56 68 64 65 Z M92 65 C100 68 106 73 109 82 L123 78 C122 67 117 60 108 57 Z M157 57 C148 60 143 67 142 78 L156 82 C159 73 165 68 173 65 Z M201 65 C209 68 215 73 218 82 L232 78 C231 67 226 60 217 57 Z",
  },
  {
    group: "chest",
    label: "胸",
    d: "M64 66 C73 61 80 63 86 70 C92 63 99 61 108 66 L104 104 C98 110 91 111 86 106 C81 111 74 110 68 104 Z",
  },
  {
    group: "back",
    label: "背",
    d: "M173 66 C182 61 192 61 201 66 L205 116 C197 125 177 125 169 116 Z",
  },
  {
    group: "arms",
    label: "胳膊",
    d: "M32 82 L47 85 L43 132 C42 145 35 153 27 150 C19 147 19 136 23 126 Z M109 85 L124 82 L133 126 C137 136 137 147 129 150 C121 153 114 145 113 132 Z M141 82 L156 85 L152 132 C151 145 144 153 136 150 C128 147 128 136 132 126 Z M218 85 L233 82 L242 126 C246 136 246 147 238 150 C230 153 223 145 222 132 Z",
  },
  {
    group: "abs",
    label: "腹",
    d: "M68 107 C75 112 97 112 104 107 L102 139 C96 144 76 144 70 139 Z",
  },
  {
    group: "legs",
    label: "腿",
    d: "M68 142 C76 146 84 146 86 142 L83 205 C82 216 77 223 70 221 C64 219 63 212 65 201 Z M86 142 C88 146 96 146 104 142 L107 201 C109 212 108 219 102 221 C95 223 90 216 89 205 Z M177 142 C185 146 193 146 195 142 L192 205 C191 216 186 223 179 221 C173 219 172 212 174 201 Z M195 142 C197 146 205 146 213 142 L216 201 C218 212 217 219 211 221 C204 223 199 216 198 205 Z",
  },
];

function freshnessText(lastDate: string | null | undefined): string {
  if (!lastDate) {
    return "从未训练";
  }
  const days = diffDays(lastDate, todayYmd());
  if (days <= 0) return "今天练过";
  return `${days} 天前`;
}

export function BodyTrainingMap({ lastTrainedMap, compact = false, selectedGroup, onSelectGroup }: BodyTrainingMapProps) {
  const [activeGroup, setActiveGroup] = useState<MuscleGroup | null>(selectedGroup ?? null);
  const today = useMemo(() => new Date(), []);
  const current = selectedGroup ?? activeGroup;

  function select(group: MuscleGroup) {
    setActiveGroup(group);
    onSelectGroup?.(group);
  }

  return (
    <div className={`body-map ${compact ? "body-map--compact" : ""}`} aria-label="人体训练状态图">
      <svg viewBox="0 0 260 230" role="img" aria-label="训练部位热力图">
        <path
          className="body-map__outline"
          d="M72 28 C72 17 79 10 86 10 C93 10 100 17 100 28 C100 38 94 47 86 47 C78 47 72 38 72 28 Z M78 49 L94 49 L97 61 L75 61 Z M64 66 L58 122 L66 142 L106 142 L114 122 L108 66 M47 84 L42 131 M124 84 L129 131 M170 28 C170 17 177 10 184 10 C191 10 198 17 198 28 C198 38 192 47 184 47 C176 47 170 38 170 28 Z M176 49 L192 49 L195 61 L173 61 Z M162 66 L156 122 L164 142 L204 142 L212 122 L206 66 M156 84 L151 131 M233 84 L238 131"
        />
        <path
          className="body-map__outline body-map__outline--light"
          d="M74 75 C80 81 92 81 98 75 M73 93 H99 M75 111 H97 M181 76 C187 84 199 84 205 76 M179 96 H207 M177 116 H209 M86 142 L86 222 M195 142 L195 222"
        />
        {parts.map((part) => {
          const lastDate = lastTrainedMap[part.group] ?? null;
          const selected = current === part.group;
          return (
            <path
              className={`body-map__part ${selected ? "is-selected" : ""}`}
              d={part.d}
              fill={getTrainingFreshnessColor(lastDate, today)}
              key={part.group}
              onClick={() => select(part.group)}
              onMouseEnter={() => setActiveGroup(part.group)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  select(part.group);
                }
              }}
            >
              <title>{`${part.label} · ${freshnessText(lastDate)}`}</title>
            </path>
          );
        })}
      </svg>
      <div className="body-map__legend">
        <strong>{current ? MUSCLE_LABELS[current] : "训练状态"}</strong>
        <span>{current ? freshnessText(lastTrainedMap[current] ?? null) : "颜色越亮，越近期训练"}</span>
      </div>
    </div>
  );
}
