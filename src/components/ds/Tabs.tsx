import React from "react";

export interface TabItem {
  value: string;
  label: React.ReactNode;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: (string | TabItem)[];
  value?: string;
  onChange?: (value: string) => void;
  variant?: "pill" | "underline";
}

export function Tabs({
  items = [],
  value,
  onChange,
  variant = "pill",
  className = "",
  ...rest
}: TabsProps) {
  const norm: TabItem[] = items.map((it) =>
    typeof it === "string" ? { value: it, label: it } : it
  );
  const current = value ?? norm[0]?.value;
  return (
    <div
      className={`mesa-tabs ${variant === "underline" ? "mesa-tabs--underline" : ""} ${className}`.trim()}
      role="tablist"
      {...rest}
    >
      {norm.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          className="mesa-tab"
          aria-selected={it.value === current}
          onClick={() => onChange && onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
