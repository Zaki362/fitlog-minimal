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

type FigureParts = Partial<Record<HeatmapGroup, string[]>>;

const HEATMAP_GROUPS: HeatmapGroup[] = ["shoulder", "chest", "back", "arms", "abs", "legs"];
const LEGEND_COLORS = ["#B8FF3C", "#D8FF76", "#E9F8B4", "#E4E8D8", "#DCDDD8", "#EEF0EA"];

const FRONT_BASE = [
  "M110 8 C126 8 138 24 138 45 C138 66 126 80 110 80 C94 80 82 66 82 45 C82 24 94 8 110 8Z",
  "M92 77 C99 93 104 101 110 101 C116 101 121 93 128 77 L136 101 C129 112 120 118 110 118 C100 118 91 112 84 101Z",
  "M80 100 C62 104 48 113 39 129 C27 150 29 181 38 214 C47 246 76 267 99 270 C106 274 114 274 121 270 C144 267 173 246 182 214 C191 181 193 150 181 129 C172 113 158 104 140 100 C133 114 123 121 110 121 C97 121 87 114 80 100Z",
  "M40 131 C27 148 23 174 28 202 L35 239 C38 255 47 263 57 260 C67 257 70 243 65 226 L59 197 C56 176 61 152 72 136Z",
  "M180 131 C193 148 197 174 192 202 L185 239 C182 255 173 263 163 260 C153 257 150 243 155 226 L161 197 C164 176 159 152 148 136Z",
  "M80 267 C93 278 107 280 121 270 L118 326 C116 350 105 365 91 363 C76 361 73 339 77 316Z",
  "M139 270 C153 280 167 278 180 267 C187 339 184 361 169 363 C155 365 144 350 142 326Z",
  "M91 363 C101 371 114 369 122 357 L117 404 C113 418 101 424 92 416 C85 409 86 385 91 363Z",
  "M142 357 C150 369 163 371 173 363 C178 385 179 409 172 416 C163 424 151 418 147 404Z",
];

const BACK_BASE = [
  "M110 8 C126 8 138 24 138 45 C138 66 126 80 110 80 C94 80 82 66 82 45 C82 24 94 8 110 8Z",
  "M92 77 C99 93 104 101 110 101 C116 101 121 93 128 77 L136 101 C129 113 120 119 110 119 C100 119 91 113 84 101Z",
  "M78 100 C60 104 46 115 37 132 C27 153 29 183 38 216 C48 247 77 268 99 271 C106 275 114 275 121 271 C143 268 172 247 182 216 C191 183 193 153 183 132 C174 115 160 104 142 100 C134 114 123 122 110 122 C97 122 86 114 78 100Z",
  "M40 132 C27 149 23 176 28 203 L35 239 C38 255 47 263 57 260 C67 257 70 243 65 226 L59 197 C56 176 61 153 72 137Z",
  "M180 132 C193 149 197 176 192 203 L185 239 C182 255 173 263 163 260 C153 257 150 243 155 226 L161 197 C164 176 159 153 148 137Z",
  "M80 268 C93 279 107 281 121 271 L118 326 C116 350 105 365 91 363 C76 361 73 339 77 316Z",
  "M139 271 C153 281 167 279 180 268 C187 339 184 361 169 363 C155 365 144 350 142 326Z",
  "M91 363 C101 371 114 369 122 357 L117 404 C113 418 101 424 92 416 C85 409 86 385 91 363Z",
  "M142 357 C150 369 163 371 173 363 C178 385 179 409 172 416 C163 424 151 418 147 404Z",
];

const FRONT_LINES = [
  "M110 121 L110 266",
  "M80 151 C96 160 124 160 140 151",
  "M76 267 C92 279 107 281 121 270 C128 274 133 274 139 270 C153 281 168 279 184 267",
  "M96 270 C101 299 99 334 91 363",
  "M124 270 C119 299 121 334 129 363",
];

const BACK_LINES = [
  "M110 122 L110 270",
  "M71 140 C89 157 102 164 110 164 C118 164 131 157 149 140",
  "M76 268 C93 280 107 282 121 271 C128 275 133 275 139 271 C153 282 168 280 184 268",
];

const FRONT_PARTS: FigureParts = {
  shoulder: [
    "M47 119 C58 101 77 98 90 106 C86 124 72 137 51 139 C43 132 42 125 47 119Z",
    "M130 106 C143 98 162 101 173 119 C178 125 177 132 169 139 C148 137 134 124 130 106Z",
  ],
  chest: [
    "M76 121 C89 110 105 108 109 123 L109 151 C95 158 80 155 69 143 C68 135 70 127 76 121Z",
    "M111 123 C115 108 131 110 144 121 C150 127 152 135 151 143 C140 155 125 158 111 151Z",
  ],
  abs: [
    "M94 159 C101 156 107 156 109 159 L109 181 C104 184 96 184 91 180 C90 171 91 164 94 159Z",
    "M111 159 C113 156 119 156 126 159 C129 164 130 171 129 180 C124 184 116 184 111 181Z",
    "M92 190 C99 186 107 186 109 190 L109 213 C104 217 96 217 91 212 C89 204 89 195 92 190Z",
    "M111 190 C113 186 121 186 128 190 C131 195 131 204 129 212 C124 217 116 217 111 213Z",
    "M92 222 C99 218 107 218 109 222 L109 251 C104 256 96 255 92 248 C89 240 89 228 92 222Z",
    "M111 222 C113 218 121 218 128 222 C131 228 131 240 128 248 C124 255 116 256 111 251Z",
    "M73 160 C82 173 84 201 80 230 C78 245 69 252 63 246 C63 211 66 181 73 160Z",
    "M147 160 C154 181 157 211 157 246 C151 252 142 245 140 230 C136 201 138 173 147 160Z",
  ],
  arms: [
    "M39 166 C50 162 59 171 60 186 L55 226 C53 239 47 247 39 245 C31 242 30 231 34 219 L38 189 C38 181 38 172 39 166Z",
    "M40 249 C49 250 55 258 53 271 L45 314 C42 328 33 334 27 326 C23 320 26 306 31 294 L36 265 C37 257 38 252 40 249Z",
    "M160 186 C161 171 170 162 181 166 C182 172 182 181 182 189 L186 219 C190 231 189 242 181 245 C173 247 167 239 165 226Z",
    "M167 271 C165 258 171 250 180 249 C182 252 183 257 184 265 L189 294 C194 306 197 320 193 326 C187 334 178 328 175 314Z",
  ],
  legs: [
    "M78 272 C91 281 108 282 120 271 L116 325 C114 347 104 360 91 358 C78 356 75 337 79 316Z",
    "M140 271 C152 282 169 281 182 272 C185 337 182 356 169 358 C156 360 146 347 144 325Z",
    "M91 360 C100 366 113 365 121 355 L116 401 C113 414 101 419 92 412 C86 405 86 383 91 360Z",
    "M144 355 C152 365 165 366 174 360 C179 383 179 405 172 412 C163 419 151 414 148 401Z",
  ],
};

const BACK_PARTS: FigureParts = {
  shoulder: [
    "M47 120 C58 101 77 99 91 107 C87 126 72 139 50 141 C42 133 42 126 47 120Z",
    "M129 107 C143 99 162 101 173 120 C178 126 178 133 170 141 C148 139 133 126 129 107Z",
  ],
  back: [
    "M91 101 C102 109 109 122 111 145 C94 144 78 134 69 120 C73 111 81 105 91 101Z",
    "M129 101 C139 105 147 111 151 120 C142 134 126 144 109 145 C111 122 118 109 129 101Z",
    "M70 128 C91 151 102 180 101 222 C82 213 68 189 66 158 C66 146 67 136 70 128Z",
    "M150 128 C153 136 154 146 154 158 C152 189 138 213 119 222 C118 180 129 151 150 128Z",
    "M105 149 C111 152 116 152 122 149 L122 224 C119 233 115 240 110 243 C105 240 101 233 98 224Z",
    "M95 231 C103 242 108 247 110 248 C112 247 117 242 125 231 C128 248 122 264 114 272 C111 275 109 275 106 272 C98 264 92 248 95 231Z",
  ],
  arms: [
    "M39 166 C50 162 59 171 60 186 L55 226 C53 239 47 247 39 245 C31 242 30 231 34 219 L38 189 C38 181 38 172 39 166Z",
    "M40 249 C49 250 55 258 53 271 L45 314 C42 328 33 334 27 326 C23 320 26 306 31 294 L36 265 C37 257 38 252 40 249Z",
    "M160 186 C161 171 170 162 181 166 C182 172 182 181 182 189 L186 219 C190 231 189 242 181 245 C173 247 167 239 165 226Z",
    "M167 271 C165 258 171 250 180 249 C182 252 183 257 184 265 L189 294 C194 306 197 320 193 326 C187 334 178 328 175 314Z",
  ],
  legs: [
    "M78 270 C91 259 108 259 121 273 C121 291 112 303 99 306 C86 302 78 289 78 270Z",
    "M139 273 C152 259 169 259 182 270 C182 289 174 302 161 306 C148 303 139 291 139 273Z",
    "M80 302 C93 314 108 314 120 299 L116 326 C114 348 104 360 91 358 C78 356 75 337 79 316Z",
    "M140 299 C152 314 167 314 180 302 C185 337 182 356 169 358 C156 360 146 348 144 326Z",
    "M91 360 C100 366 113 365 121 355 L116 401 C113 414 101 419 92 412 C86 405 86 383 91 360Z",
    "M144 355 C152 365 165 366 174 360 C179 383 179 405 172 412 C163 419 151 414 148 401Z",
  ],
};

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
      className={`heatmap-part ${selected ? "is-selected" : ""}`}
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
      style={{ "--heat-color": color } as CSSProperties}
    >
      <title>{`${label} · ${status}`}</title>
      {children}
    </g>
  );
}

function Area({ d }: { d: string }) {
  return <path className="heatmap-area" d={d} />;
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

  function colorFor(group: HeatmapGroup) {
    return getTrainingFreshnessColor(getLastDateForGroup(group, lastTrainedMap), today);
  }

  function statusFor(group: HeatmapGroup) {
    return formatLastTrainedStatus(group, getLastDateForGroup(group, lastTrainedMap));
  }

  function renderFigure(base: string[], detailLines: string[], parts: FigureParts, transform: string) {
    return (
      <g className="heatmap-person" transform={transform}>
        <g className="heatmap-base">
          {base.map((path) => (
            <path d={path} key={path} />
          ))}
        </g>
        <g className="heatmap-base-lines" aria-hidden="true">
          {detailLines.map((path) => (
            <path d={path} key={path} />
          ))}
        </g>
        {HEATMAP_GROUPS.map((group) => {
          const paths = parts[group];
          if (!paths?.length) return null;

          return (
            <BodyPartGroup
              color={colorFor(group)}
              group={group}
              key={group}
              label={MUSCLE_LABELS[group]}
              selected={activeGroup === group}
              status={statusFor(group)}
              onSelect={select}
            >
              {paths.map((path) => (
                <Area d={path} key={path} />
              ))}
            </BodyPartGroup>
          );
        })}
      </g>
    );
  }

  const activeStatus = statusFor(activeGroup);

  return (
    <div className={`body-training-map ${compact ? "body-training-map--compact" : ""}`} aria-label="身体训练热力图">
      <div className="body-training-map__visual">
        <svg viewBox="0 0 500 430" preserveAspectRatio="xMidYMid meet" role="img" aria-label="正面和背面人体训练部位热力图">
          <defs>
            <radialGradient id="heatmapBodyBase" cx="50%" cy="18%" r="92%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f6f7f2" />
              <stop offset="100%" stopColor="#e8ebe4" />
            </radialGradient>
          </defs>

          {renderFigure(FRONT_BASE, FRONT_LINES, FRONT_PARTS, "translate(24 4)")}
          {renderFigure(BACK_BASE, BACK_LINES, BACK_PARTS, "translate(256 4)")}
        </svg>
      </div>

      <div className="body-training-map__footer">
        <p className="body-training-map__status">
          <strong>{MUSCLE_LABELS[activeGroup]}</strong>
          <span>{activeStatus}</span>
        </p>
        <div className="body-training-map__scale" aria-label="颜色图例，近到远">
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
