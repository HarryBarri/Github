import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatNGN } from "@/lib/utils";
import Link from "next/link";

export default async function LeviesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const memberId = session.user.memberId;
  const isOfficer = ["treasurer","president","superadmin"].includes(role);

  if (!isOfficer) {
    // Member: show own levy assignments
    const assignments = memberId ? await prisma.levyAssignment.findMany({
      where: { memberId },
      include: { levy: { select: { name: true, description: true } } },
      orderBy: { dueDate: "asc" },
    }) : [];

    return (
      <div>
        <PageHeader title="My Levies" />
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50"><tr>
              {["Levy","Amount Due","Amount Paid","Due Date","Status"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3"><p className="font-medium text-gray-800">{a.levy.name}</p><p className="text-xs text-gray-400">{a.levy.description}</p></td>
                  <td className="px-4 py-3">{formatNGN(a.amountDueKobo)}</td>
                  <td className="px-4 py-3 text-green-600">{formatNGN(a.amountPaidKobo)}</td>
                  <td className="px-4 py-3 text-gray-500">{a.dueDate ? new Date(a.dueDate).toLocaleDateString("en-NG") : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
              {assignments.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No levies assigned.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const levies = await prisma.levy.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { assignments: true } } },
  });

  return (
    <div>
      <PageHeader title="Levies & Fines" description="Cooperative levies and fine management"
        action={
          <Link href="/dashboard/levies/new" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg">
            + Create Levy
          </Link>
        }
      />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50"><tr>
            {["Name","Type","Amount","Applies To","Due Date","Members","Active",""].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {levies.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{l.name}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{l.levyType}</td>
                <td className="px-4 py-3">{formatNGN(l.amountKobo)}</td>
                <td className="px-4 py-3 capitalize text-gray-500">{l.appliesTo.replace(/_/g," ")}</td>
                <td className="px-4 py-3 text-gray-500">{l.dueDate ? new Date(l.dueDate).toLocaleDateString("en-NG") : "—"}</td>
                <td className="px-4 py-3 text-gray-600">{l._count.assignments}</td>
                <td className="px-4 py-3">{l.isActive ? <span className="text-green-600 text-xs">✓ Active</span> : <span className="text-gray-400 text-xs">Inactive</span>}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/levies/${l.id}`} className="text-green-600 hover:underline text-xs">View →</Link>
                </td>
              </tr>
            ))}
            {levies.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No levies created.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
