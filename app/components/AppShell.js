import Sidebar from "@/app/components/Sidebar";
import { initials } from "@/lib/format";

const ROLE_LABEL = { EMPLOYEE: "Employee", MANAGER: "Manager" };

export default function AppShell({ user, children }) {
  const { firstName, surname } = user.employee;

  return (
    <div className="app-shell">
      <Sidebar role={user.role} />
      <div className="app-main">
        <header className="app-topbar">
          <div className="app-user">
            <strong>
              {firstName} {surname}
            </strong>
            <span>{ROLE_LABEL[user.role] ?? user.role}</span>
          </div>
          <div className="app-avatar">{initials(firstName, surname)}</div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
