"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, type CoopSession } from "@/lib/auth-local";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<CoopSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
    } else {
      setSession(s);
    }
    setChecking(false);
  }, [router]);

  if (checking || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        role={session.role}
        memberName={session.name ?? session.email}
      />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
