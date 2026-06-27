import React from "react";

export type BadgeVariant =
  | "available"
  | "soldout"
  | "highlight"
  | "brand"
  | "neutral"
  | "solid";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  children?: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
  children,
  ...rest
}: BadgeProps) {
  const cls = [
    "mesa-badge",
    `mesa-badge--${variant}`,
    size === "sm" ? "mesa-badge--sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {dot && <span className="mesa-badge__dot" />}
      {children}
    </span>
  );
}
