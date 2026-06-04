"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth-local";
import { localDb } from "@/lib/local-db";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsForm } from "./SettingsForm";

export default function SettingsPage() {
  const session = getSession();
  const role = session?.role ?? "";
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!["president", "superadmin"].includes(role)) {
      router.replace("/dashboard");
      return;
    }
    localDb.init();
    setSettings(localDb.settings.getAll());
  }, [role, router]);

  if (!settings) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Cooperative Settings" description="Configure your cooperative's global settings" />
      <SettingsForm settings={settings} />
    </div>
  );
}
