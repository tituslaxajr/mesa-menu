import React from "react";

export interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  showWord?: boolean;
  /** Show the "Café Menu" subtitle below the wordmark (main brand lockup only). */
  subtitle?: boolean;
  tone?: "default" | "onbrand" | "ondark";
}

const SIZES: Record<NonNullable<LogoProps["size"]>, number> = { sm: 22, md: 30, lg: 42 };

export function Logo({
  size = "md",
  showWord = true,
  subtitle = false,
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
      className={`mesa-logo ${subtitle ? "mesa-logo--stacked" : ""} ${toneCls} ${className}`.trim()}
      style={{ fontSize: px, ...style }}
      {...rest}
    >
      {showWord && <span className="mesa-logo__word">Mesa</span>}
      {subtitle && <span className="mesa-logo__sub">Café Menu</span>}
    </span>
  );
}
