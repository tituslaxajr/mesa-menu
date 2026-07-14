// ============================================================================
// Cart / option helpers — pure, framework-free. Shared by the guest menu
// (MenuBrowser) and the staff cashier terminal (PosTab) so both build a line
// the same way. Choice ids are unique within an item, so a flat list of chosen
// ids is enough to key, price, and label a configured line.
// ============================================================================
import type { MenuItem } from "@/lib/data";

export type CartEntry = { itemId: string; qty: number; choiceIds: string[] };

/** Stable cart key: the item id, plus its sorted choice ids when configured. */
export const cartKey = (itemId: string, choiceIds: string[]) =>
  choiceIds.length ? `${itemId}#${[...choiceIds].sort().join(",")}` : itemId;

/** Base price plus every chosen option's delta. */
export function unitPrice(item: MenuItem, choiceIds: string[]): number {
  let p = item.price;
  for (const g of item.options ?? []) for (const c of g.choices) if (choiceIds.includes(c.id)) p += c.priceDelta ?? 0;
  return p;
}

/** Human labels for the chosen options (add-ons prefixed with "+"). */
export function choiceLabels(item: MenuItem, choiceIds: string[]): string[] {
  const out: string[] = [];
  for (const g of item.options ?? []) for (const c of g.choices) if (choiceIds.includes(c.id)) out.push(g.multi ? `+${c.label}` : c.label);
  return out;
}

/** Pre-select the first choice of each required single-select group. */
export function defaultChoiceIds(item: MenuItem): string[] {
  const ids: string[] = [];
  for (const g of item.options ?? []) if (g.required && !g.multi && g.choices[0]) ids.push(g.choices[0].id);
  return ids;
}
