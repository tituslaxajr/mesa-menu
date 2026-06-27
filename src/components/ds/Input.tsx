"use client";

import React from "react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  required?: boolean;
  as?: "input" | "textarea";
}

export function Input({
  label,
  hint,
  error,
  icon,
  required,
  id,
  as = "input",
  className = "",
  ...rest
}: InputProps) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  const hasIcon = !!icon && as !== "textarea";
  const fieldCls = `mesa-input ${error ? "mesa-input--error" : ""}`.trim();

  return (
    <div className={`mesa-field ${className}`.trim()}>
      {label && (
        <label className="mesa-field__label" htmlFor={fieldId}>
          {label}
          {required && <span className="mesa-field__req">*</span>}
        </label>
      )}
      <div className={`mesa-input-wrap ${hasIcon ? "mesa-input-wrap--icon" : ""}`.trim()}>
        {hasIcon && icon}
        {as === "textarea" ? (
          <textarea
            id={fieldId}
            className={fieldCls}
            aria-invalid={!!error}
            {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input id={fieldId} className={fieldCls} aria-invalid={!!error} {...rest} />
        )}
      </div>
      {(error || hint) && (
        <span className={`mesa-field__hint ${error ? "mesa-field__hint--error" : ""}`.trim()}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
