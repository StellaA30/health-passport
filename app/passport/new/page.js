import Link from "next/link";
import EntryForm from "@/app/components/EntryForm";
import { requireUser } from "@/lib/session";

export default async function NewEntryPage() {
  await requireUser("EMPLOYEE");

  return (
    <>
      <div className="breadcrumb">
        <Link href="/passport">My Passport</Link> / New Entry
      </div>
      <div className="page-header">
        <h1>Create new entry</h1>
        <p>Record a health condition or the support you need at work.</p>
      </div>

      <EntryForm mode="create" />
    </>
  );
}
