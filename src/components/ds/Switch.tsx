"use client";

import React from "react";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean, e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  tone?: "available" | "brand";
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  tone = "available",
  disabled,
  id,
  className = "",
  ...rest
}: SwitchProps) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  return (
    <label
      className={`mesa-switch ${className}`.trim()}
      htmlFor={fieldId}
      data-disabled={disabled ? "true" : "false"}
      data-tone={tone}
    >
      <input
        id={fieldId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked, e)}
        {...rest}
      />
      <span className="mesa-switch__track">
        <span className="mesa-switch__thumb" />
      </span>
      {label && <span className="mesa-switch__label">{label}</span>}
    </label>
  );
}
