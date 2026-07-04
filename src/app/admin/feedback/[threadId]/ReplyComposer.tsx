"use client";
// Admin-side reply box + close/reopen control for one feedback thread. Calls
// the feedback server actions, then refreshes the server component so the new
// message and status show without a manual reload.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ds";
import { sendMessage, setStatus, type FeedbackStatus } from "@/lib/feedback-actions";

export function ReplyComposer({ threadId, status }: { threadId: string; status: FeedbackStatus }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    const res = await sendMessage(threadId, body);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setBody("");
    router.refresh();
  };

  const toggleStatus = async () => {
    setBusy(true);
    setError(null);
    const next: FeedbackStatus = status === "open" ? "closed" : "open";
    const res = await setStatus(threadId, next);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    router.refresh();
  };

  return (
    <div style={{ marginTop: 16 }}>
      {error && (
        <div role="alert" style={{ marginBottom: 10, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--soldout-soft, #F6E4DE)", color: "var(--text-strong)", fontSize: 13.5, fontWeight: 600 }}>{error}</div>
      )}
      {status === "open" && (
        <Input as="textarea" placeholder="Write a reply to this café…" style={{ minHeight: 100 }} value={body} onChange={(e) => setBody(e.target.value)} />
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        {status === "open" && (
          <Button variant="primary" onClick={() => void send()} disabled={busy || !body.trim()}>{busy ? "Sending…" : "Send reply"}</Button>
        )}
        <Button variant={status === "open" ? "ghost" : "secondary"} onClick={() => void toggleStatus()} disabled={busy}>
          {status === "open" ? "Mark as closed" : "Reopen thread"}
        </Button>
      </div>
    </div>
  );
}
