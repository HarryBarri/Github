import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatNGN } from "@/lib/utils";
import Link from "next/link";

export default async function DividendDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!["treasurer","president","superadmin"].includes(session.user.role)) redirect("/dashboard");

  const { id } = await params;
  const dividend = await prisma.dividend.findUnique({
    where: { id },
    include: {
      allocations: {
        include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
        orderBy: { allocationAmountKobo: "desc" },
      },
    },
  });
  if (!dividend) notFound();

  const totalAllocated = dividend.allocations.reduce((s, a) => s + a.allocationAmountKobo, 0n);

  return (
    <div>
      <div className="mb-4"><Link href="/dashboard/dividends" className="text-sm text-gray-500 hover:text-gray-700">← Dividends</Link></div>
      <PageHeader title={`${dividend.financialYear} Dividend`} action={<StatusBadge status={dividend.status} />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {[
          { label: "Total Profit", value: formatNGN(dividend.totalProfitKobo) },
          { label: "Dividend Fund", value: formatNGN(dividend.dividendFundKobo) },
          { label: "Allocated", value: formatNGN(totalAllocated) },
          { label: "Members", value: String(dividend.allocations.length) },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase">{k.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Member Allocations ({dividend.allocations.length})</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50"><tr>
              {["Member","Shares Held","Savings Balance","Allocation","Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {dividend.allocations.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{a.member.firstName} {a.member.lastName}<div className="text-xs text-gray-400">{a.member.memberNumber}</div></td>
                  <td className="px-4 py-3">{a.sharesHeld.toLocaleString()}</td>
                  <td className="px-4 py-3">{formatNGN(a.savingsBalanceKobo)}</td>
                  <td className="px-4 py-3 font-bold text-green-700">{formatNGN(a.allocationAmountKobo)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
              {dividend.allocations.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No allocations computed yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
