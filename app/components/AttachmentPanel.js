"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { attachmentName } from "@/lib/format";
import DownloadAttachment from "@/app/components/DownloadAttachment";

export default function AttachmentPanel({ entryId, attachmentKey }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(fileList) {
    const selected = fileList?.[0];
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", selected);
      const res = await fetch(`/api/health-entries/${entryId}/attachment`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed.");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/health-entries/${entryId}/attachment`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not remove the document.");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">Supporting document</div>
      {error && <div className="form-error">{error}</div>}

      {attachmentKey ? (
        <>
          <p className="entry-desc">{attachmentName(attachmentKey)}</p>
          <div className="btn-row">
            <DownloadAttachment entryId={entryId} />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Replace
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={remove}
              disabled={busy}
            >
              Delete
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="entry-desc">No document attached.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? "Uploading…" : "Upload document"}
          </button>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        hidden
        onChange={(e) => upload(e.target.files)}
      />
    </div>
  );
}
