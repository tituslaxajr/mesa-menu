"use client";
// Admin approve/reject buttons for one beta request. Calls the server actions,
// then refreshes the server component so the updated status shows immediately.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ds";
import { approveBetaRequest, rejectBetaRequest, type BetaRequestStatus } from "@/lib/beta-actions";

export function RequestActions({ id, status }: { id: string; status: BetaRequestStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setBusy(true);
    setError(null);
    const res = await action(id);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    router.refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {status !== "approved" && (
          <Button variant="secondary" size="sm" onClick={() => void run(approveBetaRequest)} disabled={busy}>Approve</Button>
        )}
        {status !== "rejected" && (
          <Button variant="danger" size="sm" onClick={() => void run(rejectBetaRequest)} disabled={busy}>Reject</Button>
        )}
      </div>
      {error && <span style={{ fontSize: 12, color: "var(--danger, #b42318)" }}>{error}</span>}
    </div>
  );
}
