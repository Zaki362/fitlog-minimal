import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { formatLastTrainedStatus, getTrainingFreshnessColor } from "../lib/stats";
import type { MuscleGroup } from "../types";
import { MUSCLE_LABELS } from "../types";

type HeatmapGroup = "shoulder" | "chest" | "back" | "arms" | "abs" | "legs";

type BodyTrainingMapProps = {
  lastTrainedMap: Partial<Record<MuscleGroup, string | null>>;
  selectedGroup?: MuscleGroup | null;
  onSelectGroup?: (group: MuscleGroup) => void;
  compact?: boolean;
};

type BodyPartGroupProps = {
  group: HeatmapGroup;
  color: string;
  label: string;
  selected: boolean;
  status: string;
  onSelect: (group: HeatmapGroup) => void;
  children: ReactNode;
};

const HEATMAP_GROUPS: HeatmapGroup[] = ["shoulder", "chest", "back", "arms", "abs", "legs"];
const LEGEND_COLORS = ["#B8FF3C", "#D8FF76", "#E9F8B4", "#E4E8D8", "#DCDDD8", "#EEF0EA"];

function normalizeGroup(group: MuscleGroup | null | undefined): HeatmapGroup | null {
  if (!group) return null;
  if (group === "biceps" || group === "triceps") return "arms";
  return HEATMAP_GROUPS.includes(group as HeatmapGroup) ? (group as HeatmapGroup) : null;
}

function latestYmd(values: Array<string | null | undefined>): string | null {
  const dates = values.filter((value): value is string => Boolean(value));
  return dates.length ? dates.sort()[dates.length - 1] : null;
}

function getLastDateForGroup(group: HeatmapGroup, lastTrainedMap: Partial<Record<MuscleGroup, string | null>>) {
  if (group === "arms") {
    return latestYmd([lastTrainedMap.arms, lastTrainedMap.biceps, lastTrainedMap.triceps]);
  }
  return lastTrainedMap[group] ?? null;
}

function BodyPartGroup({ group, color, label, selected, status, onSelect, children }: BodyPartGroupProps) {
  return (
    <g
      className={`body-map__muscle ${selected ? "is-selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${label}，${status}`}
      onClick={() => onSelect(group)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(group);
        }
      }}
      style={{ "--muscle-color": color } as CSSProperties}
    >
      <title>{`${label} · ${status}`}</title>
      {children}
    </g>
  );
}

function MusclePath({ d }: { d: string }) {
  return (
    <>
      <path className="body-map__muscle-hit" d={d} />
      <path className="body-map__muscle-fill" d={d} />
      <path className="body-map__muscle-gloss" d={d} />
    </>
  );
}

export function BodyTrainingMap({ lastTrainedMap, selectedGroup, onSelectGroup, compact = false }: BodyTrainingMapProps) {
  const [activeGroup, setActiveGroup] = useState<HeatmapGroup>(normalizeGroup(selectedGroup) ?? "legs");
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const normalized = normalizeGroup(selectedGroup);
    if (normalized) {
      setActiveGroup(normalized);
    }
  }, [selectedGroup]);

  function select(group: HeatmapGroup) {
    setActiveGroup(group);
    onSelectGroup?.(group);
  }

  const activeLastDate = getLastDateForGroup(activeGroup, lastTrainedMap);
  const activeStatus = formatLastTrainedStatus(activeGroup, activeLastDate);

  function colorFor(group: HeatmapGroup) {
    return getTrainingFreshnessColor(getLastDateForGroup(group, lastTrainedMap), today);
  }

  function statusFor(group: HeatmapGroup) {
    return formatLastTrainedStatus(group, getLastDateForGroup(group, lastTrainedMap));
  }

  return (
    <div className={`body-map ${compact ? "body-map--compact" : ""}`} aria-label="身体训练热力图">
      <div className="body-map__visual">
        <svg viewBox="0 0 640 372" role="img" aria-label="正面和背面人体训练部位热力图">
          <defs>
            <radialGradient id="bodyBaseSoft" cx="50%" cy="22%" r="88%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="58%" stopColor="#f5f6f2" />
              <stop offset="100%" stopColor="#e3e6df" />
            </radialGradient>
            <linearGradient id="muscleGlossSoft" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#111111" stopOpacity="0.04" />
            </linearGradient>
            <filter id="bodySoftShadow" x="-20%" y="-18%" width="140%" height="138%">
              <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#111111" floodOpacity="0.09" />
            </filter>
          </defs>

          <g className="body-map__figure" filter="url(#bodySoftShadow)" transform="translate(24 8)">
            <ellipse className="body-map__base" cx="150" cy="34" rx="24" ry="30" />
            <path className="body-map__detail-line" d="M126 35 C116 37 114 54 125 62 M174 35 C184 37 186 54 175 62" />
            <path
              className="body-map__base"
              d="M132 60 L125 82 C105 87 87 94 73 108 C62 119 56 137 54 158 L45 229 C38 242 37 260 48 266 C57 271 66 265 70 252 L83 174 C88 204 95 230 104 254 L108 315 L118 347 C123 363 144 363 148 346 L153 276 L158 346 C162 363 183 363 188 347 L198 315 L202 254 C211 230 218 204 223 174 L236 252 C240 265 249 271 258 266 C269 260 268 242 261 229 L252 158 C250 137 244 119 233 108 C219 94 195 87 175 82 L168 60 C158 66 142 66 132 60Z"
            />
          </g>

          <g className="body-map__figure" filter="url(#bodySoftShadow)" transform="translate(354 8)">
            <ellipse className="body-map__base" cx="150" cy="34" rx="24" ry="30" />
            <path className="body-map__detail-line" d="M126 35 C116 37 114 54 125 62 M174 35 C184 37 186 54 175 62" />
            <path
              className="body-map__base"
              d="M132 60 L124 82 C104 86 82 95 70 109 C58 124 52 141 50 162 L41 229 C34 242 34 259 45 265 C54 270 63 264 68 252 L81 174 C86 205 94 232 104 258 L109 316 L119 347 C124 363 144 363 148 346 L153 278 L158 346 C162 363 182 363 188 347 L198 316 L203 258 C213 232 221 205 226 174 L239 252 C244 264 253 270 262 265 C273 259 273 242 266 229 L257 162 C255 141 249 124 237 109 C225 95 196 86 176 82 L168 60 C158 67 142 67 132 60Z"
            />
          </g>

          <g className="body-map__separators" aria-hidden="true" transform="translate(24 8)">
            <path d="M130 82 C136 92 144 97 150 99 C156 97 164 92 170 82" />
            <path d="M150 96 L150 246" />
            <path d="M95 126 C111 144 132 149 150 138 C168 149 189 144 205 126" />
            <path d="M109 254 C124 264 140 264 150 254 C160 264 176 264 191 254" />
            <path d="M118 347 C130 354 143 353 150 344 C157 353 170 354 188 347" />
          </g>
          <g className="body-map__separators" aria-hidden="true" transform="translate(354 8)">
            <path d="M130 82 C138 96 144 105 150 108 C156 105 162 96 170 82" />
            <path d="M150 96 L150 250" />
            <path d="M88 129 C105 148 129 158 150 158 C171 158 195 148 212 129" />
            <path d="M104 258 C122 276 140 279 150 262 C160 279 178 276 196 258" />
          </g>

          <BodyPartGroup
            color={colorFor("chest")}
            group="chest"
            label={MUSCLE_LABELS.chest}
            selected={activeGroup === "chest"}
            status={statusFor("chest")}
            onSelect={select}
          >
            <g transform="translate(24 8)">
              <MusclePath d="M101 104 C115 88 140 89 148 105 L148 139 C132 148 109 144 96 127 C93 118 94 110 101 104Z" />
              <MusclePath d="M152 105 C160 89 185 88 199 104 C206 110 207 118 204 127 C191 144 168 148 152 139Z" />
            </g>
          </BodyPartGroup>

          <BodyPartGroup
            color={colorFor("abs")}
            group="abs"
            label={MUSCLE_LABELS.abs}
            selected={activeGroup === "abs"}
            status={statusFor("abs")}
            onSelect={select}
          >
            <g transform="translate(24 8)">
              <MusclePath d="M119 148 C128 144 140 144 148 148 L148 170 C139 174 126 174 118 169 C116 161 116 153 119 148Z" />
              <MusclePath d="M152 148 C160 144 172 144 181 148 C184 153 184 161 182 169 C174 174 161 174 152 170Z" />
              <MusclePath d="M117 178 C127 174 140 174 148 178 L148 202 C139 207 125 207 116 201 C114 192 114 183 117 178Z" />
              <MusclePath d="M152 178 C160 174 173 174 183 178 C186 183 186 192 184 201 C175 207 161 207 152 202Z" />
              <MusclePath d="M116 210 C126 206 140 206 148 210 L148 237 C138 244 126 242 118 234 C115 226 114 216 116 210Z" />
              <MusclePath d="M152 210 C160 206 174 206 184 210 C186 216 185 226 182 234 C174 242 162 244 152 237Z" />
              <MusclePath d="M98 150 C109 160 112 184 107 218 C104 236 94 245 86 238 C87 199 90 170 98 150Z" />
              <MusclePath d="M202 150 C210 170 213 199 214 238 C206 245 196 236 193 218 C188 184 191 160 202 150Z" />
            </g>
          </BodyPartGroup>

          <BodyPartGroup
            color={colorFor("back")}
            group="back"
            label={MUSCLE_LABELS.back}
            selected={activeGroup === "back"}
            status={statusFor("back")}
            onSelect={select}
          >
            <g transform="translate(354 8)">
              <MusclePath d="M126 86 C137 102 143 119 145 142 C127 139 107 128 98 112 C105 100 114 91 126 86Z" />
              <MusclePath d="M174 86 C186 91 195 100 202 112 C193 128 173 139 155 142 C157 119 163 102 174 86Z" />
              <MusclePath d="M96 119 C119 143 130 179 128 219 C105 210 87 185 84 151 C86 137 90 127 96 119Z" />
              <MusclePath d="M204 119 C210 127 214 137 216 151 C213 185 195 210 172 219 C170 179 181 143 204 119Z" />
              <MusclePath d="M130 145 C141 150 159 150 170 145 L169 223 C164 233 157 239 150 241 C143 239 136 233 131 223Z" />
              <MusclePath d="M129 229 C139 239 145 245 150 246 C155 245 161 239 171 229 C174 248 168 263 158 272 C153 276 147 276 142 272 C132 263 126 248 129 229Z" />
            </g>
          </BodyPartGroup>

          <BodyPartGroup
            color={colorFor("arms")}
            group="arms"
            label={MUSCLE_LABELS.arms}
            selected={activeGroup === "arms"}
            status={statusFor("arms")}
            onSelect={select}
          >
            <g transform="translate(24 8)">
              <MusclePath d="M56 142 C70 141 83 151 85 167 L78 219 C76 232 68 241 57 237 C50 234 49 222 53 209Z" />
              <MusclePath d="M53 228 C64 231 72 239 74 251 L68 289 C65 303 55 310 47 304 C40 299 42 286 46 273Z" />
              <MusclePath d="M244 142 C230 141 217 151 215 167 L222 219 C224 232 232 241 243 237 C250 234 251 222 247 209Z" />
              <MusclePath d="M247 228 C236 231 228 239 226 251 L232 289 C235 303 245 310 253 304 C260 299 258 286 254 273Z" />
            </g>
            <g transform="translate(354 8)">
              <MusclePath d="M53 143 C67 142 80 151 82 167 L75 219 C73 232 65 240 55 236 C48 233 47 222 51 209Z" />
              <MusclePath d="M50 228 C61 231 69 238 71 250 L65 288 C62 302 53 309 45 303 C38 298 40 285 44 272Z" />
              <MusclePath d="M247 143 C233 142 220 151 218 167 L225 219 C227 232 235 240 245 236 C252 233 253 222 249 209Z" />
              <MusclePath d="M250 228 C239 231 231 238 229 250 L235 288 C238 302 247 309 255 303 C262 298 260 285 256 272Z" />
            </g>
          </BodyPartGroup>

          <BodyPartGroup
            color={colorFor("legs")}
            group="legs"
            label={MUSCLE_LABELS.legs}
            selected={activeGroup === "legs"}
            status={statusFor("legs")}
            onSelect={select}
          >
            <g transform="translate(24 8)">
              <MusclePath d="M108 254 C120 264 140 265 148 252 L143 314 C140 332 129 342 118 335 C108 329 107 310 110 292Z" />
              <MusclePath d="M152 252 C160 265 180 264 192 254 L190 292 C193 310 192 329 182 335 C171 342 160 332 157 314Z" />
              <MusclePath d="M119 341 C130 347 140 346 147 339 L145 347 C142 363 123 363 118 347Z" />
              <MusclePath d="M153 339 C160 346 170 347 181 341 L188 347 C183 363 164 363 155 347Z" />
              <MusclePath d="M116 340 C128 348 139 347 147 338 L143 352 L140 362 L136 365 C126 367 119 360 116 340Z" />
              <MusclePath d="M153 338 C161 347 172 348 184 340 C181 360 174 367 164 365 L160 362 L157 352Z" />
            </g>
            <g transform="translate(354 8)">
              <MusclePath d="M105 246 C117 236 139 236 149 250 C150 269 142 282 126 285 C110 281 104 266 105 246Z" />
              <MusclePath d="M151 250 C161 236 183 236 195 246 C196 266 190 281 174 285 C158 282 150 269 151 250Z" />
              <MusclePath d="M108 279 C121 288 140 288 149 276 L143 316 C140 333 128 342 117 334 C107 327 106 309 109 292Z" />
              <MusclePath d="M151 276 C160 288 179 288 192 279 L191 292 C194 309 193 327 183 334 C172 342 160 333 157 316Z" />
              <MusclePath d="M117 340 C129 347 140 347 148 338 L144 352 C141 365 128 366 120 357 C117 353 116 348 117 340Z" />
              <MusclePath d="M152 338 C160 347 171 347 183 340 C184 348 183 353 180 357 C172 366 159 365 156 352Z" />
            </g>
          </BodyPartGroup>

          <BodyPartGroup
            color={colorFor("shoulder")}
            group="shoulder"
            label={MUSCLE_LABELS.shoulder}
            selected={activeGroup === "shoulder"}
            status={statusFor("shoulder")}
            onSelect={select}
          >
            <g transform="translate(24 8)">
              <MusclePath d="M78 108 C89 91 109 86 124 92 C122 112 104 132 78 137 C70 126 70 116 78 108Z" />
              <MusclePath d="M176 92 C191 86 211 91 222 108 C230 116 230 126 222 137 C196 132 178 112 176 92Z" />
            </g>
            <g transform="translate(354 8)">
              <MusclePath d="M76 109 C88 92 108 87 123 93 C121 113 103 133 77 138 C69 127 69 117 76 109Z" />
              <MusclePath d="M177 93 C192 87 212 92 224 109 C231 117 231 127 223 138 C197 133 179 113 177 93Z" />
            </g>
          </BodyPartGroup>

          <g className="body-map__labels" aria-hidden="true">
            <text x="174" y="360">
              Front
            </text>
            <text x="504" y="360">
              Back
            </text>
          </g>
        </svg>
      </div>

      <div className="body-map__footer">
        <p className="body-map__status">
          <strong>{MUSCLE_LABELS[activeGroup]}</strong>
          <span>{activeStatus}</span>
        </p>
        <div className="body-map__scale" aria-label="颜色图例，近到远">
          <span>近</span>
          <div>
            {LEGEND_COLORS.map((color) => (
              <i key={color} style={{ background: color }} />
            ))}
          </div>
          <span>远</span>
        </div>
      </div>
    </div>
  );
}
