import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatNGN } from "@/lib/utils";
import Link from "next/link";

export default async function DividendsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const memberId = session.user.memberId;

  if (!["treasurer","president","superadmin"].includes(role)) {
    // Members see own allocations
    const allocations = memberId ? await prisma.dividendAllocation.findMany({
      where: { memberId },
      include: { dividend: { select: { financialYear: true, declarationDate: true, status: true } } },
      orderBy: { dividend: { financialYear: "desc" } },
    }) : [];

    return (
      <div>
        <PageHeader title="My Dividends" />
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50"><tr>
              {["Year","Declaration Date","My Allocation","Status"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {allocations.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{a.dividend.financialYear}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(a.dividend.declarationDate).toLocaleDateString("en-NG")}</td>
                  <td className="px-4 py-3 font-bold text-green-700">{formatNGN(a.allocationAmountKobo)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
              {allocations.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No dividend records.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const dividends = await prisma.dividend.findMany({
    orderBy: { financialYear: "desc" },
    include: { _count: { select: { allocations: true } } },
  });

  return (
    <div>
      <PageHeader title="Dividends" description="Year-end profit sharing"
        action={
          <Link href="/dashboard/dividends/new" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg">
            + Declare Dividend
          </Link>
        }
      />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50"><tr>
            {["Year","Declaration Date","Total Profit","Dividend Fund","Rate","Members","Status",""].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {dividends.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-bold text-gray-800">{d.financialYear}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(d.declarationDate).toLocaleDateString("en-NG")}</td>
                <td className="px-4 py-3">{formatNGN(d.totalProfitKobo)}</td>
                <td className="px-4 py-3 font-medium text-green-700">{formatNGN(d.dividendFundKobo)}</td>
                <td className="px-4 py-3 text-gray-600">{d.dividendRatePct ? `${d.dividendRatePct}%` : "—"}</td>
                <td className="px-4 py-3 text-gray-600">{d._count.allocations}</td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/dividends/${d.id}`} className="text-green-600 hover:underline text-xs">View →</Link>
                </td>
              </tr>
            ))}
            {dividends.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No dividend declarations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
