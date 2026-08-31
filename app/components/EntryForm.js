"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toDateInput } from "@/lib/format";

export default function EntryForm({ mode = "create", entry }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);

  const isEdit = mode === "edit";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      issueDescription: form.get("issueDescription").trim(),
      supportNeeded: form.get("supportNeeded").trim(),
      supportStartDate: form.get("supportStartDate"),
      supportEndDate: form.get("supportEndDate") || null,
    };

    if (!payload.issueDescription || !payload.supportNeeded || !payload.supportStartDate) {
      setError("Issue, support needed and a start date are required.");
      setSaving(false);
      return;
    }

    try {
      const url = isEdit ? `/api/health-entries/${entry.id}` : "/api/health-entries";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save the entry.");
      }

      const saved = await res.json();
      const entryId = isEdit ? entry.id : saved.id;

      if (!isEdit && file) {
        const fd = new FormData();
        fd.append("file", file);
        await fetch(`/api/health-entries/${entryId}/attachment`, {
          method: "POST",
          body: fd,
        });
      }

      router.push(`/passport/${entryId}`);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      {error && <div className="form-error">{error}</div>}

      <div className="field">
        <label htmlFor="issueDescription">Issue / Condition</label>
        <textarea
          id="issueDescription"
          name="issueDescription"
          className="textarea"
          placeholder="e.g. Recurring lower back pain affecting desk-based work"
          defaultValue={entry?.issueDescription ?? ""}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="supportNeeded">Support needed</label>
        <textarea
          id="supportNeeded"
          name="supportNeeded"
          className="textarea"
          placeholder="What adjustments or support would help at work?"
          defaultValue={entry?.supportNeeded ?? ""}
          required
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="supportStartDate">Support start date</label>
          <input
            id="supportStartDate"
            name="supportStartDate"
            type="date"
            className="input"
            defaultValue={toDateInput(entry?.supportStartDate)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="supportEndDate">
            Review / end date <span className="hint">(optional)</span>
          </label>
          <input
            id="supportEndDate"
            name="supportEndDate"
            type="date"
            className="input"
            defaultValue={toDateInput(entry?.supportEndDate)}
          />
        </div>
      </div>

      {!isEdit && (
        <div className="field">
          <label htmlFor="file">
            Supporting document <span className="hint">(optional, PDF/JPG/PNG)</span>
          </label>
          <input
            id="file"
            name="file"
            type="file"
            className="input"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      <div className="btn-row btn-row-end mt-8">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Save entry"}
        </button>
      </div>
    </form>
  );
}
