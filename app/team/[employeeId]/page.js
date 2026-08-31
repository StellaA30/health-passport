import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import EntryCard from "@/app/components/EntryCard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function EmployeeDetailsPage({ params }) {
  const { employeeId } = await params;
  const manager = await requireUser("MANAGER");

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { healthEntries: { orderBy: { supportStartDate: "desc" } } },
  });

  if (!employee || employee.managerId !== manager.employee.id) notFound();

  return (
    <>
      <BackButton fallbackHref="/team" />

      <div className="breadcrumb">
        <Link href="/team">Team Overview</Link> / {employee.firstName} {employee.surname}
      </div>

      <div className="page-header">
        <h1>
          {employee.firstName} {employee.surname}
        </h1>
        <p>{employee.jobTitle}</p>
      </div>

      <div className="card">
        <div className="card-title">Employee details</div>
        <dl className="detail-list">
          <dt>Name</dt>
          <dd>
            {employee.firstName} {employee.surname}
          </dd>
          <dt>Job title</dt>
          <dd>{employee.jobTitle}</dd>
          <dt>Email</dt>
          <dd>{employee.email}</dd>
        </dl>
      </div>

      <h2 className="mt-24" style={{ fontSize: 16, marginBottom: 12 }}>
        Health entries
      </h2>

      {employee.healthEntries.length === 0 ? (
        <div className="empty-state">This employee has no health entries.</div>
      ) : (
        employee.healthEntries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            action={
              <Link
                href={`/team/${employee.id}/${entry.id}`}
                className="btn btn-secondary btn-sm"
              >
                View Details
              </Link>
            }
          />
        ))
      )}
    </>
  );
}
