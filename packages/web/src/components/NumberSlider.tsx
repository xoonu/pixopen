import type { CSSProperties } from 'react';

type Props = {
  id?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Format the value pill (defaults to the raw number). */
  formatValue?: (value: number) => string;
  'aria-label'?: string;
  'aria-valuetext'?: string;
  className?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function NumberSlider({
  id,
  min,
  max,
  step = 1,
  value,
  onChange,
  disabled,
  formatValue = (v) => String(v),
  'aria-label': ariaLabel,
  'aria-valuetext': ariaValueText,
  className = '',
}: Props) {
  const safeMax = max >= min ? max : min;
  const clamped = clamp(value, min, safeMax);
  const progress = safeMax === min ? 0 : ((clamped - min) / (safeMax - min)) * 100;

  return (
    <div className={`number-slider${disabled ? ' is-disabled' : ''} ${className}`.trim()}>
      <input
        id={id}
        type="range"
        className="number-slider-input"
        min={min}
        max={safeMax}
        step={step}
        value={clamped}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-valuetext={ariaValueText ?? formatValue(clamped)}
        style={{ '--slider-progress': `${progress}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="number-slider-value" aria-hidden="true">
        {formatValue(clamped)}
      </span>
    </div>
  );
}
