import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import DownloadAttachment from "@/app/components/DownloadAttachment";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { attachmentName, formatDate, isPast } from "@/lib/format";

export default async function ManagerEntryViewPage({ params }) {
  const { employeeId, entryId } = await params;
  const manager = await requireUser("MANAGER");

  const entry = await prisma.healthEntry.findUnique({
    where: { id: entryId },
    include: { employee: true },
  });

  if (
    !entry ||
    entry.employeeId !== employeeId ||
    entry.employee.managerId !== manager.employee.id
  ) {
    notFound();
  }

  const closed = isPast(entry.supportEndDate);

  return (
    <>
      <BackButton fallbackHref={`/team/${employeeId}`} />

      <div className="breadcrumb">
        <Link href="/team">Team Overview</Link> /{" "}
        <Link href={`/team/${employeeId}`}>
          {entry.employee.firstName} {entry.employee.surname}
        </Link>{" "}
        / Entry
      </div>

      <div className="entry-card-head">
        <h1 style={{ fontSize: 22 }}>{entry.issueDescription}</h1>
        <span className={`badge ${closed ? "badge-closed" : "badge-active"}`}>
          {closed ? "Closed" : "Active"}
        </span>
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
          <p className="entry-desc">No document attached.</p>
        )}
      </div>
    </>
  );
}
