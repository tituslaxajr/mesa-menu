import React from "react";
import { Badge } from "./Badge";

export interface MenuItemProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "onClick"> {
  name: string;
  description?: string;
  price?: number | string;
  image?: string;
  layout?: "row" | "card";
  soldOut?: boolean;
  badge?: string;
  onClick?: React.MouseEventHandler;
}

function Photo({
  image,
  name,
  className,
}: {
  image?: string;
  name?: string;
  className?: string;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={`mesa-mi__photo ${className || ""}`} src={image} alt={name} loading="lazy" />
    );
  }
  return (
    <div className={`mesa-mi__photo mesa-mi__placeholder ${className || ""}`}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z" />
        <line x1="6" x2="6" y1="2" y2="4" />
        <line x1="10" x2="10" y1="2" y2="4" />
        <line x1="14" x2="14" y1="2" y2="4" />
      </svg>
    </div>
  );
}

function priceText(price?: number | string): string {
  if (price == null || price === "") return "";
  return typeof price === "number" ? `₱${price}` : String(price);
}

export function MenuItem({
  name,
  description,
  price,
  image,
  layout = "row",
  soldOut = false,
  badge,
  onClick,
  className = "",
  ...rest
}: MenuItemProps) {
  const clickable = !!onClick;
  const cls = ["mesa-mi", `mesa-mi--${layout}`, soldOut ? "mesa-mi--soldout" : "", className]
    .filter(Boolean)
    .join(" ");
  const statusBadge = soldOut ? (
    <Badge variant="soldout" size="sm">
      Sold out for today
    </Badge>
  ) : badge ? (
    <Badge variant="highlight" size="sm">
      {badge}
    </Badge>
  ) : null;

  if (layout === "card") {
    const Tag = clickable ? "button" : "div";
    return (
      <Tag className={cls} data-clickable={clickable} onClick={onClick} {...(rest as object)}>
        <div className="mesa-mi__photowrap">
          <Photo image={image} name={name} />
          {statusBadge && <span className="mesa-mi__badge">{statusBadge}</span>}
        </div>
        <div className="mesa-mi__body">
          <div className="mesa-mi__top">
            <span className="mesa-mi__name">{name}</span>
            <span className="mesa-mi__price">{priceText(price)}</span>
          </div>
          {description && <p className="mesa-mi__desc">{description}</p>}
        </div>
      </Tag>
    );
  }

  const Tag = clickable ? "button" : "div";
  return (
    <Tag className={cls} data-clickable={clickable} onClick={onClick} {...(rest as object)}>
      <Photo image={image} name={name} />
      <div className="mesa-mi__body">
        <div className="mesa-mi__top">
          <span className="mesa-mi__name">{name}</span>
          <span className="mesa-mi__price">{priceText(price)}</span>
        </div>
        {description && <p className="mesa-mi__desc">{description}</p>}
        {statusBadge && <div style={{ marginTop: 8 }}>{statusBadge}</div>}
      </div>
    </Tag>
  );
}
