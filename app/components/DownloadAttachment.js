"use client";

import { useState } from "react";

export default function DownloadAttachment({ entryId, label = "Download" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/health-entries/${entryId}/attachment`);
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.open(url, "_blank", "noopener");
    } catch {
      setError("Could not open the document. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="btn-row">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={download}
        disabled={busy}
      >
        {busy ? "Opening…" : label}
      </button>
      {error && <span className="form-error">{error}</span>}
    </span>
  );
}
