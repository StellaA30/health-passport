import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDate, initials, isPast } from "@/lib/format";

export default async function TeamOverviewPage() {
  const user = await requireUser("MANAGER");

  const reports = await prisma.employee.findMany({
    where: { managerId: user.employee.id },
    orderBy: { surname: "asc" },
    include: { healthEntries: true },
  });

  const totalActive = reports.reduce(
    (sum, r) => sum + r.healthEntries.filter((e) => !isPast(e.supportEndDate)).length,
    0
  );

  return (
    <>
      <div className="page-header">
        <h1>Team Overview</h1>
        <p>View the wellbeing passports of your team members.</p>
      </div>

      <div className="grid-tiles">
        <div className="tile">
          <div className="tile-label">Team members</div>
          <div className="tile-value">{reports.length}</div>
        </div>
        <div className="tile">
          <div className="tile-label">Active entries</div>
          <div className="tile-value">{totalActive}</div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">You have no direct reports yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Active entries</th>
                <th>Last updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const activeCount = r.healthEntries.filter(
                  (e) => !isPast(e.supportEndDate)
                ).length;
                const lastUpdated = r.healthEntries.reduce(
                  (latest, e) => (e.updatedAt > latest ? e.updatedAt : latest),
                  null
                );
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="name-cell">
                        <span className="app-avatar">
                          {initials(r.firstName, r.surname)}
                        </span>
                        {r.firstName} {r.surname}
                      </span>
                    </td>
                    <td>{r.jobTitle}</td>
                    <td>{activeCount}</td>
                    <td>{lastUpdated ? formatDate(lastUpdated) : "—"}</td>
                    <td>
                      <Link
                        href={`/team/${r.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
