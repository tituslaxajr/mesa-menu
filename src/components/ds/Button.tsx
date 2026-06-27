import React from "react";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export type ButtonProps =
  | (CommonProps & { as?: "button" } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  | (CommonProps & { as: "a" } & React.AnchorHTMLAttributes<HTMLAnchorElement>);

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  as = "button",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    "mesa-btn",
    `mesa-btn--${variant}`,
    `mesa-btn--${size}`,
    block ? "mesa-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (as === "a") {
    return (
      <a className={cls} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
