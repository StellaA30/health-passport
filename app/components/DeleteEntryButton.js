"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteEntryButton({ entryId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/health-entries/${entryId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/passport");
      router.refresh();
    } else {
      setBusy(false);
      window.alert("Could not delete the entry.");
    }
  }

  return (
    <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>
      {busy ? "Deleting…" : "Delete entry"}
    </button>
  );
}
