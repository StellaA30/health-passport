import Link from "next/link";
import EntryCard from "@/app/components/EntryCard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isPast } from "@/lib/format";

export default async function PassportPage() {
  const user = await requireUser("EMPLOYEE");

  const entries = await prisma.healthEntry.findMany({
    where: { employeeId: user.employee.id },
    orderBy: { supportStartDate: "desc" },
  });

  const active = entries.filter((e) => !isPast(e.supportEndDate));
  const past = entries.filter((e) => isPast(e.supportEndDate));

  return (
    <>
      <div className="page-header">
        <h1>My Wellbeing Passport</h1>
        <p>A private record of your health and support needs at work.</p>
      </div>

      <div className="banner">
        <span>🔒</span>
        <span>Your information is private and only shared with authorised people.</span>
      </div>

      <div className="row-between">
        <h2 style={{ fontSize: 16 }}>Your health entries</h2>
        <Link href="/passport/new" className="btn btn-primary btn-sm">
          + New Entry
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="empty-state">
          No active entries yet. Add one to record a health condition or the support you need.
        </div>
      ) : (
        active.map((entry) => (
          <EntryCard key={entry.id} entry={entry} href={`/passport/${entry.id}`} />
        ))
      )}

      {past.length > 0 && (
        <details className="card mt-24">
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Past entries ({past.length})
          </summary>
          <div className="mt-16">
            {past.map((entry) => (
              <EntryCard key={entry.id} entry={entry} href={`/passport/${entry.id}`} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}
