-- POS (staff cashier terminal) — enum additions.
-- Kept in their own migration because Postgres won't let a newly-added enum
-- value be used in the SAME transaction that adds it; the next migration
-- (20260714000016_pos.sql) references 'pos' / 'refunded' freely once these
-- have committed.
--
--   * order_channel 'pos'      — a staff-rung, cash/manual-tendered sale.
--                                DB-backed like counter/kitchen; never touches
--                                the localStorage board, counts as a real sale.
--   * order_status  'refunded' — a completed POS sale that was returned; drops
--                                out of revenue but stays for the audit trail.

alter type order_channel add value if not exists 'pos';
alter type order_status  add value if not exists 'refunded';
