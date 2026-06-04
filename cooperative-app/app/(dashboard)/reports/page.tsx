import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatNGN } from "@/lib/utils";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  if (!["loan_officer","treasurer","secretary","president","superadmin"].includes(role)) {
    redirect("/dashboard");
  }

  const [
    memberStats, savingsStats, loanStats,
    recentDeposits, overdueLoans, topSavers,
  ] = await Promise.all([
    prisma.member.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.savingsAccount.aggregate({ _sum: { balanceKobo: true }, _count: { id: true } }),
    prisma.loan.groupBy({ by: ["status"], _sum: { totalPayableKobo: true, amountPaidKobo: true }, _count: { id: true } }),
    prisma.savingsTransaction.findMany({
      where: { transactionType: "deposit" },
      orderBy: { transactionDate: "desc" },
      take: 5,
      include: { account: { include: { member: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.loan.findMany({
      where: { status: "active", maturityDate: { lt: new Date() } },
      include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
      take: 10,
    }),
    prisma.savingsAccount.findMany({
      orderBy: { balanceKobo: "desc" },
      take: 5,
      include: { member: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const memberCountByStatus = Object.fromEntries(memberStats.map(s => [s.status, s._count.id]));
  const activeLoans = loanStats.find(s => s.status === "active");
  const totalOutstanding = activeLoans ? (activeLoans._sum.totalPayableKobo ?? 0n) - (activeLoans._sum.amountPaidKobo ?? 0n) : 0n;

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Cooperative performance overview" />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Members", value: String(memberCountByStatus["active"] ?? 0), sub: `${memberCountByStatus["pending"] ?? 0} pending` },
          { label: "Total Savings", value: formatNGN(savingsStats._sum.balanceKobo ?? 0n), sub: `${savingsStats._count.id} accounts` },
          { label: "Active Loans", value: String(activeLoans?._count.id ?? 0), sub: formatNGN(totalOutstanding) + " outstanding" },
          { label: "Overdue Loans", value: String(overdueLoans.length), sub: overdueLoans.length > 0 ? "⚠ needs attention" : "✓ none" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Member Status Breakdown</h3>
          <div className="space-y-2">
            {(["active","pending","suspended","exited"] as const).map(s => (
              <div key={s} className="flex justify-between text-sm">
                <span className="capitalize text-gray-600">{s}</span>
                <span className="font-semibold text-gray-800">{memberCountByStatus[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top savers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Top 5 Savers</h3>
          <div className="space-y-2">
            {topSavers.map((a, i) => (
              <div key={a.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                  <span className="text-gray-700">{a.member.firstName} {a.member.lastName}</span>
                </div>
                <span className="font-semibold text-green-700">{formatNGN(a.balanceKobo)}</span>
              </div>
            ))}
            {topSavers.length === 0 && <p className="text-sm text-gray-400">No savings data.</p>}
          </div>
        </div>

        {/* Loan portfolio */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Loan Portfolio</h3>
          <div className="space-y-2">
            {loanStats.map(s => (
              <div key={s.status} className="flex justify-between text-sm">
                <span className="capitalize text-gray-600">{s.status}</span>
                <span className="font-semibold text-gray-800">{s._count.id} loans</span>
              </div>
            ))}
            {loanStats.length === 0 && <p className="text-sm text-gray-400">No loan data.</p>}
          </div>
        </div>

        {/* Recent deposits */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-700 mb-3">Recent Deposits</h3>
          <div className="space-y-2">
            {recentDeposits.map(d => (
              <div key={d.id} className="flex justify-between text-sm">
                <div>
                  <span className="text-gray-700 font-medium">{d.account.member.firstName} {d.account.member.lastName}</span>
                  <span className="text-gray-400 text-xs ml-2">{new Date(d.transactionDate).toLocaleDateString("en-NG")}</span>
                </div>
                <span className="font-semibold text-green-700">+{formatNGN(d.amountKobo)}</span>
              </div>
            ))}
            {recentDeposits.length === 0 && <p className="text-sm text-gray-400">No recent deposits.</p>}
          </div>
        </div>

        {/* Overdue loans */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Overdue Loans</h3>
          {overdueLoans.length === 0 ? (
            <p className="text-sm text-green-600">✓ No overdue loans</p>
          ) : (
            <div className="space-y-2">
              {overdueLoans.map(l => (
                <div key={l.id} className="text-sm">
                  <p className="font-medium text-gray-800">{l.member.firstName} {l.member.lastName}</p>
                  <p className="text-red-600 text-xs">{formatNGN(l.totalPayableKobo - l.amountPaidKobo)} outstanding</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
