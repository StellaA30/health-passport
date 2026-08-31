import AppShell from "@/app/components/AppShell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const ROLE_LABEL = { EMPLOYEE: "Employee", MANAGER: "Manager" };

export default async function ProfilePage() {
  const user = await requireUser();
  const { employee } = user;

  const manager = employee.managerId
    ? await prisma.employee.findUnique({ where: { id: employee.managerId } })
    : null;

  return (
    <AppShell user={user}>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Your account details.</p>
      </div>

      <div className="card">
        <div className="card-title">Account</div>
        <dl className="detail-list">
          <dt>Name</dt>
          <dd>
            {employee.firstName} {employee.surname}
          </dd>
          <dt>Job title</dt>
          <dd>{employee.jobTitle}</dd>
          <dt>Email</dt>
          <dd>{employee.email}</dd>
          <dt>Role</dt>
          <dd>{ROLE_LABEL[user.role] ?? user.role}</dd>
          <dt>Manager</dt>
          <dd>{manager ? `${manager.firstName} ${manager.surname}` : "—"}</dd>
        </dl>
      </div>
    </AppShell>
  );
}
