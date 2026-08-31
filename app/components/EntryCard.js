import Link from "next/link";
import { formatDate, isPast } from "@/lib/format";

/**
 * One health entry summary. Pass `href` to make the whole card a link
 * (employee view), or `action` to render a node in the corner (manager view).
 */
export default function EntryCard({ entry, href, action }) {
  const closed = isPast(entry.supportEndDate);

  const body = (
    <>
      <div className="entry-card-head">
        <h3>{entry.issueDescription}</h3>
        <span className={`badge ${closed ? "badge-closed" : "badge-active"}`}>
          {closed ? "Closed" : "Active"}
        </span>
      </div>
      <p className="entry-desc">{entry.supportNeeded}</p>
      <div className="entry-meta">
        <span>
          Started: <b>{formatDate(entry.supportStartDate)}</b>
        </span>
        <span>
          Review/End: <b>{formatDate(entry.supportEndDate)}</b>
        </span>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="entry-card">
        {body}
      </Link>
    );
  }

  return (
    <div className="entry-card">
      {body}
      {action && <div className="btn-row mt-16">{action}</div>}
    </div>
  );
}
