import Link from "next/link";
import { notFound } from "next/navigation";
import AttachmentPanel from "@/app/components/AttachmentPanel";
import BackButton from "@/app/components/BackButton";
import DeleteEntryButton from "@/app/components/DeleteEntryButton";
import EntryForm from "@/app/components/EntryForm";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function EditEntryPage({ params }) {
  const { id } = await params;
  const user = await requireUser("EMPLOYEE");

  const entry = await prisma.healthEntry.findUnique({ where: { id } });
  if (!entry || entry.employeeId !== user.employee.id) notFound();

  // Dates aren't serialisable across the RSC boundary as Date objects in every
  // path, so hand the form plain ISO strings.
  const formEntry = {
    id: entry.id,
    issueDescription: entry.issueDescription,
    supportNeeded: entry.supportNeeded,
    supportStartDate: entry.supportStartDate.toISOString(),
    supportEndDate: entry.supportEndDate ? entry.supportEndDate.toISOString() : null,
  };

  return (
    <>
      <BackButton fallbackHref={`/passport/${entry.id}`} />

      <div className="breadcrumb">
        <Link href="/passport">My Passport</Link> /{" "}
        <Link href={`/passport/${entry.id}`}>Entry</Link> / Edit
      </div>
      <div className="page-header">
        <h1>Edit entry</h1>
      </div>

      <EntryForm mode="edit" entry={formEntry} />

      <AttachmentPanel entryId={entry.id} attachmentKey={entry.attachmentKey} />

      <div className="card">
        <div className="card-title">Delete health entry. Please note that this action cannot be undone.</div>
        <DeleteEntryButton entryId={entry.id} />
      </div>
    </>
  );
}
