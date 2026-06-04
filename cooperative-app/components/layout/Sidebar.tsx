"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth-local";

type UserRole = "member" | "loan_officer" | "treasurer" | "secretary" | "president" | "superadmin";

interface NavItem {
  label: string;
  href: string;
  minRole: UserRole;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", minRole: "member" },
  { label: "Members", href: "/dashboard/members", minRole: "loan_officer" },
  { label: "Savings", href: "/dashboard/savings", minRole: "member" },
  { label: "Loans", href: "/dashboard/loans", minRole: "member" },
  { label: "Shares", href: "/dashboard/shares", minRole: "member" },
  { label: "Dividends", href: "/dashboard/dividends", minRole: "treasurer" },
  { label: "Meetings", href: "/dashboard/meetings", minRole: "member" },
  { label: "Levies", href: "/dashboard/levies", minRole: "member" },
  { label: "Reports", href: "/dashboard/reports", minRole: "loan_officer" },
  { label: "Settings", href: "/dashboard/settings", minRole: "president" },
];

const ROLE_RANK: Record<UserRole, number> = {
  member: 0,
  loan_officer: 1,
  treasurer: 2,
  secretary: 2,
  president: 3,
  superadmin: 4,
};

interface SidebarProps {
  role: string;
  memberName: string;
}

export function Sidebar({ role, memberName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const userRole = (role as UserRole) in ROLE_RANK ? (role as UserRole) : "member";

  const visibleItems = NAV_ITEMS.filter(
    (item) => ROLE_RANK[userRole] >= ROLE_RANK[item.minRole]
  );

  function handleSignOut() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-green-800 text-white flex flex-col h-full fixed inset-y-0 left-0 z-30">
      <div className="px-6 py-5 border-b border-green-700">
        <h1 className="text-xl font-bold">CoopManager</h1>
        <p className="text-green-300 text-xs mt-0.5 truncate">{memberName}</p>
        <span className="text-green-400 text-xs capitalize">{role.replace("_", " ")}</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition",
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                ? "bg-green-700 text-white"
                : "text-green-100 hover:bg-green-700 hover:text-white"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-green-700">
        <button
          onClick={handleSignOut}
          className="w-full text-left text-sm text-green-300 hover:text-white transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
