import { useRef, useState } from "react";
import { formatNumber, getDefaultWeightStep } from "../lib/workout";

type WeightAdjusterProps = {
  value: number | null;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (next: number | null) => void;
};

function clamp(value: number, min: number, max?: number): number {
  const lower = Math.max(min, value);
  return max === undefined ? lower : Math.min(max, lower);
}

function normalize(value: number): number {
  return Number(value.toFixed(2));
}

export function WeightAdjuster({ value, step, min = 0, max, disabled = false, onChange }: WeightAdjusterProps) {
  const actualStep = step ?? getDefaultWeightStep(value);
  const startY = useRef<number | null>(null);
  const residue = useRef(0);
  const latest = useRef(value);
  const didDrag = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value === null ? "" : formatNumber(value));

  latest.current = value;

  function applyDelta(direction: 1 | -1) {
    if (disabled) return;
    const base = latest.current ?? 0;
    onChange(normalize(clamp(base + direction * actualStep, min, max)));
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging || startY.current === null || disabled) return;
    const delta = startY.current - event.clientY;
    const combined = residue.current + delta;
    const steps = Math.trunc(combined / 24);
    if (steps !== 0) {
      didDrag.current = true;
      onChange(normalize(clamp((latest.current ?? 0) + steps * actualStep, min, max)));
      residue.current = combined - steps * 24;
      startY.current = event.clientY;
    }
  }

  function openInput() {
    if (disabled) return;
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    setInputValue(value === null ? "" : formatNumber(value));
    setEditing(true);
  }

  function saveInput() {
    if (!inputValue.trim()) {
      onChange(null);
      setEditing(false);
      return;
    }
    const next = Number(inputValue);
    if (!Number.isFinite(next)) {
      return;
    }
    onChange(normalize(clamp(next, min, max)));
    setEditing(false);
  }

  return (
    <div className={`weight-adjuster ${dragging ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""}`}>
      <div className="weight-adjuster__row">
        <button
          className="weight-adjuster__control"
          type="button"
          aria-label="减少重量"
          disabled={disabled}
          onClick={() => applyDelta(-1)}
        >
          -
        </button>
        <button
          aria-label="上下滑动调整重量，点击精确输入"
          className="weight-adjuster__display"
          type="button"
          disabled={disabled}
          onClick={openInput}
          onPointerDown={(event) => {
            if (disabled) return;
            startY.current = event.clientY;
            residue.current = 0;
            didDrag.current = false;
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => {
            setDragging(false);
            startY.current = null;
            residue.current = 0;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            setDragging(false);
            startY.current = null;
            residue.current = 0;
          }}
        >
          <strong>{value === null ? "无重量" : formatNumber(value)}</strong>
          {value === null ? null : <span>kg</span>}
        </button>
        <button
          className="weight-adjuster__control"
          type="button"
          aria-label="增加重量"
          disabled={disabled}
          onClick={() => applyDelta(1)}
        >
          +
        </button>
      </div>
      <span className="weight-adjuster__hint">上下滑动调整重量，点击数字精确输入</span>

      {editing ? (
        <div className="weight-adjuster__input">
          <input
            autoFocus
            inputMode="decimal"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveInput();
              if (event.key === "Escape") setEditing(false);
            }}
            placeholder="例如 42.5"
          />
          <button className="button button--primary" type="button" onClick={saveInput}>
            确定
          </button>
        </div>
      ) : null}
    </div>
  );
}
