import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: (string | SelectOption)[];
  placeholder?: string;
  /** Optional field label rendered above the select. */
  label?: string;
  hint?: string;
  children?: React.ReactNode;
}

export function Select({
  options = [],
  placeholder,
  label,
  hint,
  className = "",
  children,
  ...rest
}: SelectProps) {
  const control = (
    <div className="mesa-select-wrap">
      <select className="mesa-select" {...rest}>
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {children ||
          options.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
      </select>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );

  if (!label && !hint) {
    return React.cloneElement(control, { className: `mesa-select-wrap ${className}`.trim() });
  }

  return (
    <div className={`mesa-field ${className}`.trim()}>
      {label && <span className="mesa-field__label">{label}</span>}
      {control}
      {hint && <span className="mesa-field__hint">{hint}</span>}
    </div>
  );
}
