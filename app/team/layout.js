import AppShell from "@/app/components/AppShell";
import { requireUser } from "@/lib/session";

export default async function TeamLayout({ children }) {
  const user = await requireUser("MANAGER");
  return <AppShell user={user}>{children}</AppShell>;
}
