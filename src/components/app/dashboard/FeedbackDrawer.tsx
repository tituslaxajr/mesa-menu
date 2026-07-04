"use client";
// Messages drawer — the café side of the two-way feedback conversation.
// Replaces the old mailto: "Send feedback" link with an in-app inbox: list of
// topic threads, a "New message" composer, and a thread view with a reply box.
// Reads/writes go through the server actions in lib/feedback-actions.ts (RLS +
// definer RPCs). Right-side overlay drawer, reusing the app's drawer animation.
import React, { useCallback, useEffect, useState } from "react";
import { X, ArrowLeft, Plus, Send, MessageSquare } from "lucide-react";
import { Button, IconButton, Input, Badge } from "@/components/ds";
import {
  getMyThreads,
  getThread,
  openThread,
  sendMessage,
  markRead,
  type OwnerThread,
  type ThreadDetail,
} from "@/lib/feedback-actions";

/** Short "3:04 PM" / "Jul 2" stamp for message + thread times. */
function stamp(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

type View = { mode: "list" } | { mode: "new" } | { mode: "detail"; id: string };

// Mounted only while open (the shell conditionally renders it), so state is
// fresh on every open and the load effect never has to synchronously reset it.
export function FeedbackDrawer({
  onClose,
  onUnreadChange,
}: {
  onClose: () => void;
  /** Bubble the unread count up so the shell can badge the entry point. */
  onUnreadChange?: (count: number) => void;
}) {
  const [threads, setThreads] = useState<OwnerThread[]>([]);
  const [view, setView] = useState<View>({ mode: "list" });
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New-message composer fields.
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  // Reply composer field.
  const [reply, setReply] = useState("");

  const refreshThreads = useCallback(async () => {
    const rows = await getMyThreads();
    setThreads(rows);
    onUnreadChange?.(rows.filter((t) => t.unread).length);
    return rows;
  }, [onUnreadChange]);

  // Load the inbox on mount. setState lives inside the promise callback (the
  // allowed pattern) — never synchronously in the effect body.
  useEffect(() => {
    let active = true;
    getMyThreads()
      .then((rows) => {
        if (!active) return;
        setThreads(rows);
        onUnreadChange?.(rows.filter((t) => t.unread).length);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [onUnreadChange]);

  const openDetail = useCallback(
    async (id: string) => {
      setView({ mode: "detail", id });
      setDetail(null);
      setReply("");
      setError(null);
      const [t] = await Promise.all([getThread(id), markRead(id)]);
      setDetail(t);
      // Reading clears this thread's unread — reflect it in the list + badge.
      await refreshThreads();
    },
    [refreshThreads],
  );

  const submitNew = async () => {
    setError(null);
    setBusy(true);
    const res = await openThread(subject, body);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSubject("");
    setBody("");
    await refreshThreads();
    await openDetail(res.threadId);
  };

  const submitReply = async () => {
    if (view.mode !== "detail" || !reply.trim()) return;
    setError(null);
    setBusy(true);
    const res = await sendMessage(view.id, reply);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setReply("");
    const t = await getThread(view.id);
    setDetail(t);
    await refreshThreads();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
      <div className="mesa-anim-fade" onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(31,20,14,0.45)" }} />
      <aside
        className="mesa-anim-drawer-right"
        style={{ position: "relative", width: "min(440px, 96%)", background: "var(--surface-card)", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(31,20,14,0.2)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid var(--border-soft)", position: "sticky", top: 0, background: "var(--surface-card)", zIndex: 2 }}>
          {view.mode !== "list" ? (
            <IconButton label="Back to messages" variant="ghost" onClick={() => setView({ mode: "list" })}><ArrowLeft /></IconButton>
          ) : (
            <MessageSquare size={20} style={{ color: "var(--brand)" }} />
          )}
          <span style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "var(--text-strong)" }}>
            {view.mode === "new" ? "New message" : view.mode === "detail" ? (detail?.subject ?? "Message") : "Messages"}
          </span>
          <IconButton label="Close messages" variant="ghost" onClick={onClose}><X /></IconButton>
        </div>

        {error && (
          <div role="alert" style={{ margin: "12px 18px 0", padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--soldout-soft, #F6E4DE)", color: "var(--text-strong)", fontSize: 13.5, fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* LIST */}
        {view.mode === "list" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "14px 18px 18px", gap: 12 }}>
            <Button variant="primary" block onClick={() => { setError(null); setView({ mode: "new" }); }}>
              <Plus /> New message
            </Button>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              Questions, bugs, or ideas — message the Mesa team. Replies show up right here.
            </p>
            {loading ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8 }}>Loading…</p>
            ) : threads.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8 }}>No messages yet. Start one above.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => void openDetail(t.id)}
                    style={{ textAlign: "left", border: "1px solid var(--border-soft)", background: "var(--surface-page)", borderRadius: "var(--radius-md)", padding: "12px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {t.unread && <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--brand)", flex: "none" }} />}
                      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: "var(--text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", flex: "none" }}>{stamp(t.lastMessageAt)}</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {t.status === "closed" && <Badge variant="neutral" size="sm">Closed</Badge>}
                      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                        {t.lastSenderRole === "admin" ? "Mesa replied" : "You sent"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NEW */}
        {view.mode === "new" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 18px", gap: 14 }}>
            <Input label="Subject" placeholder="What's this about?" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
            <Input as="textarea" label="Message" placeholder="Tell us what's going on…" style={{ minHeight: 140 }} value={body} onChange={(e) => setBody(e.target.value)} />
            <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
              <Button variant="ghost" onClick={() => setView({ mode: "list" })}>Cancel</Button>
              <Button variant="primary" block onClick={() => void submitNew()} disabled={busy || !subject.trim() || !body.trim()}>
                <Send /> {busy ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        )}

        {/* DETAIL */}
        {view.mode === "detail" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "16px 18px" }}>
              {!detail ? (
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading…</p>
              ) : (
                detail.messages.map((m) => {
                  const mine = m.senderRole === "owner";
                  return (
                    <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%" }}>
                      <div style={{ background: mine ? "var(--brand)" : "var(--surface-page)", color: mine ? "var(--brand-on)" : "var(--text-body)", border: mine ? "none" : "1px solid var(--border-soft)", borderRadius: 14, padding: "9px 13px", fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {m.body}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, textAlign: mine ? "right" : "left" }}>
                        {mine ? "You" : "Mesa"} · {stamp(m.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {detail?.status === "closed" ? (
              <p style={{ padding: "12px 18px", borderTop: "1px solid var(--border-soft)", fontSize: 13, color: "var(--text-muted)" }}>
                This conversation is closed. Start a new message if you need anything else.
              </p>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "12px 18px", borderTop: "1px solid var(--border-soft)", position: "sticky", bottom: 0, background: "var(--surface-card)" }}>
                <div style={{ flex: 1 }}>
                  <Input as="textarea" placeholder="Write a reply…" style={{ minHeight: 52 }} value={reply} onChange={(e) => setReply(e.target.value)} />
                </div>
                <Button variant="primary" onClick={() => void submitReply()} disabled={busy || !reply.trim()} aria-label="Send reply"><Send /></Button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
