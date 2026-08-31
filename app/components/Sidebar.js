"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = {
  EMPLOYEE: [
    { href: "/passport", label: "My Passport" },
    { href: "/passport/new", label: "New Entry" },
    { href: "/profile", label: "Profile" },
  ],
  MANAGER: [
    { href: "/team", label: "Team Overview" },
    { href: "/profile", label: "Profile" },
  ],
};

function isActive(pathname, href) {
  if (href === "/passport") return pathname === "/passport";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ role }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[role] ?? NAV.EMPLOYEE;

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span>🌿</span>
        <span>
          WELLBEING
          <br />
          PASSPORT
        </span>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(pathname, item.href) ? "active" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <button type="button" className="sidebar-logout" onClick={logout}>
        Logout
      </button>
    </aside>
  );
}
