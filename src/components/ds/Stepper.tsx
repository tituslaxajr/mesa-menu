import React from "react";

export interface StepperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
}

export function Stepper({
  value = 1,
  min = 0,
  max = 99,
  onChange,
  className = "",
  ...rest
}: StepperProps) {
  const set = (n: number) => {
    const v = Math.max(min, Math.min(max, n));
    if (onChange) onChange(v);
  };
  return (
    <div className={`mesa-stepper ${className}`.trim()} {...rest}>
      <button
        type="button"
        className="mesa-stepper__btn"
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => set(value - 1)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>
      <span className="mesa-stepper__val">{value}</span>
      <button
        type="button"
        className="mesa-stepper__btn"
        aria-label="Increase"
        disabled={value >= max}
        onClick={() => set(value + 1)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
