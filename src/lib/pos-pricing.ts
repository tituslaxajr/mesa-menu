// ============================================================================
// POS transaction-time money math — pure, whole-peso (₱) integers.
// Kept separate from sales.ts (which is analytics-oriented). PH menu prices are
// VAT-INCLUSIVE at 12%, so VAT is a portion carved OUT of the goods subtotal,
// not added on. Service charge is added on top of goods, VAT-free (the simplest
// defensible model). Always derive vat = subtotal − net so the two reconcile
// exactly and never drift by a peso from independent rounding.
// ============================================================================

export const VAT_RATE = 0.12;

/** Split a VAT-inclusive goods subtotal into net (ex-VAT) + VAT. */
export function vatBreakdown(subtotalIncl: number): { net: number; vat: number } {
  const net = Math.round(subtotalIncl / (1 + VAT_RATE));
  return { net, vat: subtotalIncl - net };
}

/** Service charge = pct of the goods subtotal (VAT-free, on top). */
export const serviceCharge = (subtotalIncl: number, pct: number): number =>
  Math.round((subtotalIncl * Math.max(0, pct)) / 100);

/** Change owed on a cash tender (never negative). */
export const changeDue = (total: number, tendered: number): number =>
  Math.max(0, tendered - total);

export interface TicketTotals {
  subtotal: number;      // goods, VAT-inclusive
  net: number;           // goods ex-VAT
  vat: number;           // 12% portion of goods
  serviceCharge: number; // on top, VAT-free
  total: number;         // grand total = subtotal + serviceCharge
}

/** The full breakdown for a ticket: goods subtotal + a service-charge %. */
export function ticketTotals(subtotal: number, serviceChargeRate: number): TicketTotals {
  const { net, vat } = vatBreakdown(subtotal);
  const svc = serviceCharge(subtotal, serviceChargeRate);
  return { subtotal, net, vat, serviceCharge: svc, total: subtotal + svc };
}
