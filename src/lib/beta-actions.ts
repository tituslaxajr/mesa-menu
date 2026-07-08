"use server";
// Beta access requests — the public "apply" seam plus the admin review side.
// requestBetaAccess is unauthenticated (RLS grants anon INSERT); the review
// actions require a session and rely on the SECURITY DEFINER RPCs (migration
// 0013) to check is_platform_admin() server-side. Mirrors feedback-actions.ts.
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type BetaRequestStatus = "pending" | "approved" | "rejected";

export interface BetaRequestState {
  error?: string;
  success?: boolean;
}

export interface BetaRequestRow {
  id: string;
  cafeName: string;
  contactName: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: BetaRequestStatus;
  reviewedAt: number | null;
  usedAt: number | null;
  createdAt: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ms = (s: string | null) => (s ? new Date(s).getTime() : null);

/** Public request form — no auth required. */
export async function requestBetaAccess(
  _prev: BetaRequestState | undefined,
  formData: FormData,
): Promise<BetaRequestState> {
  const cafeName = String(formData.get("cafe_name") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!cafeName || !contactName || !email) {
    return { error: "Café name, your name, and email are required." };
  }
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.from("beta_requests").insert({
    cafe_name: cafeName.slice(0, 120),
    contact_name: contactName.slice(0, 120),
    email,
    phone: phone.slice(0, 40) || null,
    message: message.slice(0, 2000) || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You already have a request in with this email — we'll be in touch." };
    }
    return { error: "Something went wrong. Please try again." };
  }
  return { success: true };
}

/** Admin — every beta request, newest first (RLS returns zero rows to non-admins). */
export async function getBetaRequests(): Promise<BetaRequestRow[]> {
  await verifySession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("beta_requests")
    .select("id, cafe_name, contact_name, email, phone, message, status, reviewed_at, used_at, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    cafeName: r.cafe_name,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
    message: r.message,
    status: r.status as BetaRequestStatus,
    reviewedAt: ms(r.reviewed_at),
    usedAt: ms(r.used_at),
    createdAt: ms(r.created_at)!,
  }));
}

export async function approveBetaRequest(id: string): Promise<ActionResult> {
  await verifySession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_beta_request", { p_id: id });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function rejectBetaRequest(id: string): Promise<ActionResult> {
  await verifySession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_beta_request", { p_id: id });
  return error ? { ok: false, error: error.message } : { ok: true };
}
