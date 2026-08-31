import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import DownloadAttachment from "@/app/components/DownloadAttachment";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { attachmentName, formatDate, isPast } from "@/lib/format";

export default async function EntryDetailPage({ params }) {
  const { id } = await params;
  const user = await requireUser("EMPLOYEE");

  const entry = await prisma.healthEntry.findUnique({ where: { id } });
  if (!entry || entry.employeeId !== user.employee.id) notFound();

  const closed = isPast(entry.supportEndDate);

  return (
    <>
      <BackButton fallbackHref="/passport" />

      <div className="breadcrumb">
        <Link href="/passport">My Passport</Link> / Entry
      </div>

      <div className="row-between">
        <div className="entry-card-head">
          <h1 style={{ fontSize: 22 }}>{entry.issueDescription}</h1>
          <span className={`badge ${closed ? "badge-closed" : "badge-active"}`}>
            {closed ? "Closed" : "Active"}
          </span>
        </div>
        <Link href={`/passport/${entry.id}/edit`} className="btn btn-secondary btn-sm">
          Edit Entry
        </Link>
      </div>

      <div className="card">
        <div className="card-title">Details</div>
        <dl className="detail-list">
          <dt>Issue / condition</dt>
          <dd>{entry.issueDescription}</dd>
          <dt>Support needed</dt>
          <dd>{entry.supportNeeded}</dd>
          <dt>Support start date</dt>
          <dd>{formatDate(entry.supportStartDate)}</dd>
          <dt>Review / end date</dt>
          <dd>{formatDate(entry.supportEndDate)}</dd>
          <dt>Created</dt>
          <dd>{formatDate(entry.createdAt)}</dd>
          <dt>Last updated</dt>
          <dd>{formatDate(entry.updatedAt)}</dd>
        </dl>
      </div>

      <div className="card">
        <div className="card-title">Supporting document</div>
        {entry.attachmentKey ? (
          <>
            <p className="entry-desc">{attachmentName(entry.attachmentKey)}</p>
            <DownloadAttachment entryId={entry.id} />
          </>
        ) : (
          <p className="entry-desc">
            No document attached. You can add one from the edit page.
          </p>
        )}
      </div>
    </>
  );
}
