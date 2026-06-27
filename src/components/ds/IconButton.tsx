import React from "react";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "ghost" | "soft" | "primary";
  size?: "sm" | "md" | "lg";
  /** Accessible label (required) — used for aria-label and title. */
  label: string;
  children?: React.ReactNode;
}

export function IconButton({
  variant = "ghost",
  size = "md",
  label,
  className = "",
  children,
  ...rest
}: IconButtonProps) {
  const cls = ["mesa-iconbtn", `mesa-iconbtn--${variant}`, `mesa-iconbtn--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
