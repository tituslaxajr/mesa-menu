import React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  /** Drives initials fallback when no src. */
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "rounded" | "circle";
  ring?: boolean;
  children?: React.ReactNode;
}

function initials(name = ""): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase() || "•";
}

export function Avatar({
  src,
  name = "",
  size = "md",
  shape = "rounded",
  ring = false,
  className = "",
  children,
  ...rest
}: AvatarProps) {
  const cls = [
    "mesa-avatar",
    `mesa-avatar--${size}`,
    shape === "circle" ? "mesa-avatar--circle" : "",
    ring ? "mesa-avatar--ring" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={name} /> : children ?? initials(name)}
    </span>
  );
}
