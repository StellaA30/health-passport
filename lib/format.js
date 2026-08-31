const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Format a Date / ISO string as "10 Apr 2024". Returns "—" for empty values. */
export function formatDate(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FMT.format(date);
}

/** ISO "yyyy-mm-dd" for <input type="date"> defaultValue. */
export function toDateInput(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** True when an entry's support end date is in the past (entry is "closed"). */
export function isPast(endDate) {
  if (!endDate) return false;
  const date = endDate instanceof Date ? endDate : new Date(endDate);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/** Turn an S3 key like "health-entries/<id>/1700000000000-report.pdf" into "report.pdf". */
export function attachmentName(key) {
  if (!key) return "";
  const last = key.split("/").pop() || key;
  return last.replace(/^\d+-/, "");
}

/** Two-letter initials for an avatar. */
export function initials(firstName = "", surname = "") {
  return `${firstName[0] || ""}${surname[0] || ""}`.toUpperCase() || "?";
}
