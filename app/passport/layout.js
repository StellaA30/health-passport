import AppShell from "@/app/components/AppShell";
import { requireUser } from "@/lib/session";

export default async function PassportLayout({ children }) {
  const user = await requireUser("EMPLOYEE");
  return <AppShell user={user}>{children}</AppShell>;
}
