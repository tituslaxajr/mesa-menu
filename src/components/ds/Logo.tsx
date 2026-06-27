import React from "react";

export interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  showWord?: boolean;
  tone?: "default" | "onbrand" | "ondark";
}

const SIZES: Record<NonNullable<LogoProps["size"]>, number> = { sm: 22, md: 30, lg: 42 };

function Mark() {
  return (
    <svg className="mesa-logo__mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="7" width="50" height="50" rx="15" strokeWidth="3.4" />
        <rect x="33" y="14" width="7" height="7" rx="1.6" strokeWidth="2.2" />
        <rect x="43" y="14" width="7" height="7" rx="1.6" strokeWidth="2.2" />
        <rect x="33" y="24" width="7" height="7" rx="1.6" strokeWidth="2.2" />
        <path d="M43.5 24.5 49.5 30.5M49.5 24.5 43.5 30.5" strokeWidth="2.2" />
        <path d="M20.5 38.5 16.5 49M29.5 38.5 33.5 49" strokeWidth="3" />
      </g>
      <ellipse cx="25" cy="36" rx="13" ry="3.4" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  size = "md",
  showWord = true,
  tone = "default",
  className = "",
  style,
  ...rest
}: LogoProps) {
  const px = SIZES[size] || SIZES.md;
  const toneCls =
    tone === "onbrand" ? "mesa-logo--onbrand" : tone === "ondark" ? "mesa-logo--ondark" : "";
  return (
    <span
      className={`mesa-logo ${toneCls} ${className}`.trim()}
      style={{ fontSize: px, ...style }}
      {...rest}
    >
      <Mark />
      {showWord && <span className="mesa-logo__word">Mesa</span>}
    </span>
  );
}
