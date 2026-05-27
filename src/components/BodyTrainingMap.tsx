import { useEffect, useMemo, useState } from "react";
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

type MuscleZone = {
  group: MuscleGroup;
  label: string;
  paths: string[];
};

const muscleZones: MuscleZone[] = [
  {
    group: "shoulder",
    label: "肩",
    paths: [
      "M113 141 C125 121 146 116 156 130 C150 153 129 173 104 174 C99 160 102 149 113 141Z",
      "M214 130 C224 116 245 121 257 141 C268 149 271 160 266 174 C241 173 220 153 214 130Z",
      "M366 143 C380 123 402 121 412 136 C405 158 386 174 360 174 C355 161 357 151 366 143Z",
      "M518 136 C528 121 550 123 564 143 C573 151 575 161 570 174 C544 174 525 158 518 136Z",
    ],
  },
  {
    group: "chest",
    label: "胸",
    paths: [
      "M136 137 C151 119 176 119 185 136 L185 180 C164 188 142 178 134 158 C130 149 130 142 136 137Z",
      "M185 136 C194 119 219 119 234 137 C240 142 240 149 236 158 C228 178 206 188 185 180Z",
    ],
  },
  {
    group: "abs",
    label: "腹",
    paths: [
      "M158 188 C166 183 178 182 185 186 L185 211 C176 214 161 214 154 210 C153 201 154 193 158 188Z",
      "M185 186 C192 182 204 183 212 188 C216 193 217 201 216 210 C209 214 194 214 185 211Z",
      "M154 217 C162 213 176 213 185 216 L185 243 C175 247 161 247 153 242 C151 233 151 224 154 217Z",
      "M185 216 C194 213 208 213 216 217 C219 224 219 233 217 242 C209 247 195 247 185 243Z",
      "M153 249 C162 246 176 246 185 249 L185 282 C174 288 161 285 154 277 C151 268 151 257 153 249Z",
      "M185 249 C194 246 208 246 217 249 C219 257 219 268 216 277 C209 285 196 288 185 282Z",
      "M136 198 C147 204 151 224 148 255 C145 275 135 285 126 278 C125 242 127 216 136 198Z",
      "M234 198 C243 216 245 242 244 278 C235 285 225 275 222 255 C219 224 223 204 234 198Z",
    ],
  },
  {
    group: "back",
    label: "背",
    paths: [
      "M430 103 C437 120 440 139 440 161 C427 159 410 150 402 137 C408 120 417 110 430 103Z",
      "M494 103 C507 110 516 120 522 137 C514 150 497 159 484 161 C484 139 487 120 494 103Z",
      "M412 141 C427 163 435 197 434 234 C411 224 392 197 389 167 C393 155 401 147 412 141Z",
      "M512 141 C523 147 531 155 535 167 C532 197 513 224 490 234 C489 197 497 163 512 141Z",
      "M436 163 C444 166 454 168 462 168 C470 168 480 166 488 163 L487 235 C480 243 471 248 462 248 C453 248 444 243 437 235Z",
      "M435 241 C443 251 452 256 462 256 C472 256 481 251 489 241 C492 260 487 278 476 289 C468 296 456 296 448 289 C437 278 432 260 435 241Z",
    ],
  },
  {
    group: "arms",
    label: "胳膊",
    paths: [
      "M96 178 C111 180 124 190 127 205 L117 274 C115 290 105 300 94 296 C85 292 86 278 91 262Z",
      "M87 274 C99 278 109 285 112 297 L104 343 C101 361 90 369 80 362 C72 356 75 339 80 323Z",
      "M273 178 C258 180 245 190 242 205 L252 274 C254 290 264 300 275 296 C284 292 283 278 278 262Z",
      "M282 274 C270 278 260 285 257 297 L265 343 C268 361 279 369 289 362 C297 356 294 339 289 323Z",
      "M354 178 C368 180 380 191 382 205 L371 276 C369 290 360 298 350 294 C342 291 342 279 347 263Z",
      "M345 275 C356 279 366 286 369 299 L361 344 C358 359 349 367 339 362 C331 356 334 340 338 324Z",
      "M573 178 C559 180 547 191 545 205 L556 276 C558 290 567 298 577 294 C585 291 585 279 580 263Z",
      "M582 275 C571 279 561 286 558 299 L566 344 C569 359 578 367 588 362 C596 356 593 340 589 324Z",
    ],
  },
  {
    group: "legs",
    label: "腿",
    paths: [
      "M142 301 C154 309 174 309 183 299 L177 392 C174 411 161 418 150 409 C140 401 140 383 144 366Z",
      "M187 299 C196 309 216 309 228 301 L226 366 C230 383 230 401 220 409 C209 418 196 411 193 392Z",
      "M151 419 C161 423 171 423 178 417 L176 475 C173 492 164 501 155 496 C148 491 149 476 151 462Z",
      "M194 417 C201 423 211 423 221 419 L223 462 C225 476 226 491 219 496 C210 501 201 492 198 475Z",
      "M416 284 C427 294 448 298 461 288 L455 376 C452 395 439 404 427 397 C415 390 414 368 417 350Z",
      "M463 288 C476 298 497 294 508 284 L507 350 C510 368 509 390 497 397 C485 404 472 395 469 376Z",
      "M420 405 C432 411 444 411 454 404 L451 474 C448 490 438 499 429 493 C421 488 421 472 423 455Z",
      "M470 404 C480 411 492 411 504 405 L501 455 C503 472 503 488 495 493 C486 499 476 490 473 474Z",
      "M417 252 C429 241 449 241 461 253 C462 272 456 286 439 291 C422 286 416 272 417 252Z",
      "M463 253 C475 241 495 241 507 252 C508 272 502 286 485 291 C468 286 462 272 463 253Z",
    ],
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

function colorForGroup(
  group: MuscleGroup,
  lastTrainedMap: Partial<Record<MuscleGroup, string | null>>,
  today: Date,
): string {
  return getTrainingFreshnessColor(lastTrainedMap[group] ?? null, today);
}

export function BodyTrainingMap({ lastTrainedMap, compact = false, selectedGroup, onSelectGroup }: BodyTrainingMapProps) {
  const [activeGroup, setActiveGroup] = useState<MuscleGroup | null>(selectedGroup ?? null);
  const today = useMemo(() => new Date(), []);
  const current = activeGroup ?? selectedGroup ?? null;

  useEffect(() => {
    setActiveGroup(selectedGroup ?? null);
  }, [selectedGroup]);

  function select(group: MuscleGroup) {
    setActiveGroup(group);
    onSelectGroup?.(group);
  }

  return (
    <div className={`body-map ${compact ? "body-map--compact" : ""}`} aria-label="人体训练状态图">
      <svg viewBox="0 0 640 520" role="img" aria-label="训练部位热力图，按最近训练时间显示颜色深浅">
        <defs>
          <radialGradient id="bodyBase" cx="50%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="62%" stopColor="#f0f1ed" />
            <stop offset="100%" stopColor="#dcddd8" />
          </radialGradient>
          <radialGradient id="muscleHighlight" cx="45%" cy="35%" r="78%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="38%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#111111" stopOpacity="0.05" />
          </radialGradient>
          <filter id="softInset" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#111111" floodOpacity="0.12" />
          </filter>
        </defs>

        <g className="body-map__figure" filter="url(#softInset)">
          <path
            className="body-map__body"
            d="M155 55 C155 25 170 11 185 11 C200 11 215 25 215 55 C215 86 201 106 185 109 C169 106 155 86 155 55Z M151 62 C142 64 140 77 149 89 M219 62 C228 64 230 77 221 89 M169 105 L160 127 L132 137 C114 143 101 159 96 181 L84 260 C78 273 75 293 85 300 C91 304 99 302 104 294 L123 198 L137 300 L138 366 L150 492 C157 505 175 504 181 488 L185 414 L189 488 C195 504 213 505 220 492 L232 366 L233 300 L247 198 L266 294 C271 302 279 304 285 300 C295 293 292 273 286 260 L274 181 C269 159 256 143 238 137 L210 127 L201 105"
          />
          <path
            className="body-map__body"
            d="M432 57 C432 27 447 12 462 12 C477 12 492 27 492 57 C492 87 478 106 462 109 C446 106 432 87 432 57Z M428 64 C419 67 418 80 426 92 M496 64 C505 67 506 80 498 92 M446 105 L437 127 L408 136 C386 141 367 155 357 180 L344 260 C338 273 335 291 345 298 C352 303 360 300 365 292 L384 196 L400 285 L408 354 L421 492 C428 505 446 504 452 488 L462 409 L472 488 C478 504 496 505 503 492 L516 354 L524 285 L540 196 L559 292 C564 300 572 303 579 298 C589 291 586 273 580 260 L567 180 C557 155 538 141 516 136 L487 127 L478 105"
          />
        </g>

        <g className="body-map__segments" aria-hidden="true">
          <path d="M154 132 C164 121 176 117 185 118 C194 117 206 121 216 132" />
          <path d="M185 126 L185 286" />
          <path d="M134 182 C151 190 170 190 185 180 C200 190 219 190 236 182" />
          <path d="M138 300 C153 311 174 311 185 299 C196 311 217 311 232 300" />
          <path d="M418 134 C433 148 446 154 462 154 C478 154 491 148 506 134" />
          <path d="M462 115 L462 291" />
          <path d="M400 285 C419 303 444 307 462 291 C480 307 505 303 524 285" />
        </g>

        {muscleZones.map((zone) => {
          const lastDate = lastTrainedMap[zone.group] ?? null;
          const selected = current === zone.group;
          const fill = colorForGroup(zone.group, lastTrainedMap, today);
          return (
            <g
              className={`body-map__muscle ${selected ? "is-selected" : ""}`}
              key={zone.group}
              onClick={() => select(zone.group)}
              onMouseEnter={() => setActiveGroup(zone.group)}
              onFocus={() => setActiveGroup(zone.group)}
              role="button"
              tabIndex={0}
              aria-label={`${zone.label}，${freshnessText(lastDate)}`}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  select(zone.group);
                }
              }}
            >
              <title>{`${zone.label} · ${freshnessText(lastDate)}`}</title>
              {zone.paths.map((path) => (
                <path d={path} fill={fill} key={path} />
              ))}
            </g>
          );
        })}

        <g className="body-map__labels" aria-hidden="true">
          <text x="185" y="512">
            正面
          </text>
          <text x="462" y="512">
            背面
          </text>
        </g>
      </svg>

      <div className="body-map__legend">
        <div>
          <strong>{current ? MUSCLE_LABELS[current] : "身体热力"}</strong>
          <span>{current ? freshnessText(lastTrainedMap[current] ?? null) : "颜色越亮，越近期训练"}</span>
        </div>
        <div className="body-map__scale" aria-hidden="true">
          <i style={{ background: "#B8FF3C" }} />
          <i style={{ background: "#D8FF76" }} />
          <i style={{ background: "#E9F8B4" }} />
          <i style={{ background: "#E4E8D8" }} />
          <i style={{ background: "#DCDDD8" }} />
        </div>
      </div>
    </div>
  );
}
