import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "flat" | "raised";
  interactive?: boolean;
  /** Wrap children in --space-5 padding. */
  padded?: boolean;
  children?: React.ReactNode;
}

export function Card({
  variant = "flat",
  interactive = false,
  padded = false,
  className = "",
  children,
  ...rest
}: CardProps) {
  const cls = [
    "mesa-card",
    `mesa-card--${variant}`,
    interactive ? "mesa-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {padded ? <div className="mesa-card__pad">{children}</div> : children}
    </div>
  );
}
