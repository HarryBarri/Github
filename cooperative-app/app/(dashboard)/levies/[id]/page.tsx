import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatNGN } from "@/lib/utils";
import Link from "next/link";

export default async function LevyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["treasurer","president","superadmin","secretary"].includes(session.user.role)) redirect("/dashboard");

  const { id } = await params;
  const levy = await prisma.levy.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          member: { select: { firstName: true, lastName: true, memberNumber: true } },
          payments: true,
        },
        orderBy: { dueDate: "desc" },
      },
    },
  });
  if (!levy) notFound();

  const totalCollected = levy.assignments.reduce((s: bigint, a) => {
    const paid = a.payments.reduce((ps: bigint, p) => ps + p.amountKobo, 0n);
    return s + paid;
  }, 0n);

  return (
    <div>
      <div className="mb-4"><Link href="/dashboard/levies" className="text-sm text-gray-500 hover:text-gray-700">← Levies</Link></div>
      <PageHeader title={levy.name} action={<StatusBadge status={levy.isActive ? "active" : "inactive"} />} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Amount", value: formatNGN(levy.amountKobo) },
          { label: "Type", value: levy.levyType },
          { label: "Applies To", value: levy.appliesTo.replace("_", " ") },
          { label: "Collected", value: formatNGN(totalCollected) },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase">{k.label}</p>
            <p className="text-lg font-semibold text-gray-800 mt-1 capitalize">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Assignments ({levy.assignments.length})</h3>
        {levy.assignments.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No assignments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50"><tr>
                {["Member", "Amount Due", "Amount Paid", "Balance", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {levy.assignments.map((a) => {
                  const paid = a.payments.reduce((s: bigint, p) => s + p.amountKobo, 0n);
                  const balance = a.amountDueKobo - paid;
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {a.member.firstName} {a.member.lastName}
                        <div className="text-xs text-gray-400">{a.member.memberNumber}</div>
                      </td>
                      <td className="px-4 py-3">{formatNGN(a.amountDueKobo)}</td>
                      <td className="px-4 py-3 text-green-700">{formatNGN(paid)}</td>
                      <td className="px-4 py-3 text-red-600">{formatNGN(balance)}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
