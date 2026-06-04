import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["president","superadmin"].includes(session.user.role)) redirect("/dashboard");

  const settings = await prisma.cooperativeSetting.findMany({ orderBy: { key: "asc" } });
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

  return (
    <div className="max-w-2xl">
      <PageHeader title="Cooperative Settings" description="Configure your cooperative's global settings" />
      <SettingsForm settings={settingsMap} />
    </div>
  );
}
