"use server";
// Feedback / support messaging — the server seam for the two-way café ↔ admin
// conversation. Reads use the RLS-scoped server client (so the same functions
// are safe for both a café member and a platform admin); writes call the
// SECURITY DEFINER RPCs from migration 0012, which decide the sender role
// server-side. Mirrors the shape of order-actions.ts.
import { verifySession } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export type SenderRole = "owner" | "admin";
export type FeedbackStatus = "open" | "closed";
export type ActionResult = { ok: true } | { ok: false; error: string };

export interface FeedbackMessage {
  id: string;
  senderRole: SenderRole;
  body: string;
  createdAt: number;
}

/** A thread as the café-owner side sees it (own account, RLS-scoped). */
export interface OwnerThread {
  id: string;
  subject: string;
  status: FeedbackStatus;
  lastMessageAt: number;
  lastSenderRole: SenderRole;
  /** Admin replied and the café side hasn't opened it since. */
  unread: boolean;
}

export interface ThreadDetail {
  id: string;
  subject: string;
  status: FeedbackStatus;
  messages: FeedbackMessage[];
}

/** A row in the platform-admin inbox (admin_feedback_overview view). */
export interface AdminInboxRow {
  threadId: string;
  accountName: string;
  cafeName: string | null;
  cafeSlug: string | null;
  subject: string;
  status: FeedbackStatus;
  lastMessageAt: number;
  lastSenderRole: SenderRole;
  needsReply: boolean;
  messageCount: number;
}

export interface AdminThreadDetail extends ThreadDetail {
  accountName: string;
  cafeName: string | null;
}

const ms = (s: string) => new Date(s).getTime();

/* eslint-disable @typescript-eslint/no-explicit-any */
function toMessage(r: any): FeedbackMessage {
  return { id: r.id, senderRole: r.sender_role, body: r.body, createdAt: ms(r.created_at) };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- Owner-side reads ------------------------------------------------------

/** The caller's own account threads, newest activity first, with unread flags. */
export async function getMyThreads(): Promise<OwnerThread[]> {
  await verifySession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("feedback_threads")
    .select("id, subject, status, last_message_at, last_sender_role, owner_read_at")
    .order("last_message_at", { ascending: false });
  return (data ?? []).map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status as FeedbackStatus,
    lastMessageAt: ms(t.last_message_at),
    lastSenderRole: t.last_sender_role as SenderRole,
    unread:
      t.last_sender_role === "admin" &&
      (!t.owner_read_at || ms(t.owner_read_at) < ms(t.last_message_at)),
  }));
}

/** One thread + its messages (RLS lets a member read only their own). */
export async function getThread(threadId: string): Promise<ThreadDetail | null> {
  await verifySession();
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("feedback_threads")
    .select("id, subject, status")
    .eq("id", threadId)
    .maybeSingle();
  if (!t) return null;
  const { data: msgs } = await supabase
    .from("feedback_messages")
    .select("id, sender_role, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return {
    id: t.id,
    subject: t.subject,
    status: t.status as FeedbackStatus,
    messages: (msgs ?? []).map(toMessage),
  };
}

// ---- Admin-side reads ------------------------------------------------------

/** The whole inbox for platform admins (view returns zero rows to non-admins). */
export async function getAdminInbox(): Promise<AdminInboxRow[]> {
  await verifySession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_feedback_overview")
    .select("*")
    .order("last_message_at", { ascending: false });
  return (data ?? []).map((r) => ({
    threadId: r.thread_id,
    accountName: r.account_name,
    cafeName: r.cafe_name ?? null,
    cafeSlug: r.cafe_slug ?? null,
    subject: r.subject,
    status: r.status as FeedbackStatus,
    lastMessageAt: ms(r.last_message_at),
    lastSenderRole: r.last_sender_role as SenderRole,
    needsReply: !!r.needs_reply,
    messageCount: r.message_count,
  }));
}

/** One thread for the admin view — messages via RLS, names via the view. */
export async function getAdminThread(threadId: string): Promise<AdminThreadDetail | null> {
  await verifySession();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("admin_feedback_overview")
    .select("thread_id, subject, status, account_name, cafe_name")
    .eq("thread_id", threadId)
    .maybeSingle();
  if (!row) return null;
  const { data: msgs } = await supabase
    .from("feedback_messages")
    .select("id, sender_role, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return {
    id: row.thread_id,
    subject: row.subject,
    status: row.status as FeedbackStatus,
    accountName: row.account_name,
    cafeName: row.cafe_name ?? null,
    messages: (msgs ?? []).map(toMessage),
  };
}

// ---- Writes (definer RPCs) -------------------------------------------------

/** Café member starts a new topic; returns the new thread id. */
export async function openThread(
  subject: string,
  body: string,
): Promise<{ ok: true; threadId: string } | { ok: false; error: string }> {
  await verifySession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_feedback_thread", {
    p_subject: subject,
    p_body: body,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, threadId: data as string };
}

/** Add a message to a thread — sender role is decided by the RPC. */
export async function sendMessage(threadId: string, body: string): Promise<ActionResult> {
  await verifySession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_feedback_message", {
    p_thread_id: threadId,
    p_body: body,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Mark the viewing side's unread as cleared (called when a thread is opened). */
export async function markRead(threadId: string): Promise<ActionResult> {
  await verifySession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_feedback_read", { p_thread_id: threadId });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Close or reopen a thread. */
export async function setStatus(threadId: string, status: FeedbackStatus): Promise<ActionResult> {
  await verifySession();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_feedback_status", {
    p_thread_id: threadId,
    p_status: status,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
