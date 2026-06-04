"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth-local";
import { localDb } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";

interface ReportData {
  memberCountByStatus: Record<string, number>;
  totalSavings: number;
  totalAccounts: number;
  activeLoansCount: number;
  totalOutstanding: number;
  overdueLoanCount: number;
  loanStatusBreakdown: Array<{ status: string; count: number }>;
  topSavers: Array<{ memberName: string; balanceKobo: number }>;
  recentDeposits: Array<{ memberName: string; amountKobo: number; date: string }>;
}

export default function ReportsPage() {
  const session = getSession();
  const role = session?.role ?? "";
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    if (!["loan_officer", "treasurer", "secretary", "president", "superadmin"].includes(role)) {
      router.replace("/dashboard");
      return;
    }
    localDb.init();

    const members = localDb.members.all().filter(m => !m.deletedAt);
    const memberCountByStatus: Record<string, number> = {};
    for (const m of members) {
      memberCountByStatus[m.status] = (memberCountByStatus[m.status] ?? 0) + 1;
    }

    const accounts = localDb.savingsAccounts.all();
    const totalSavings = accounts.reduce((s, a) => s + a.balanceKobo, 0);

    const loans = localDb.loans.all();
    const activeLoans = loans.filter(l => l.status === "active");
    const totalOutstanding = activeLoans.reduce((s, l) => s + l.totalPayableKobo - l.amountPaidKobo, 0);

    const now = new Date();
    const overdueLoans = activeLoans.filter(l => new Date(l.maturityDate) < now);

    const statusMap: Record<string, number> = {};
    for (const l of loans) {
      statusMap[l.status] = (statusMap[l.status] ?? 0) + 1;
    }
    const loanStatusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    const topAccounts = [...accounts]
      .sort((a, b) => b.balanceKobo - a.balanceKobo)
      .slice(0, 5);
    const topSavers = topAccounts.map(a => {
      const m = members.find(mm => mm.id === a.memberId);
      return { memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown", balanceKobo: a.balanceKobo };
    });

    const allTxns = localDb.savingsTransactions.all()
      .filter(t => t.transactionType === "deposit")
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
      .slice(0, 5);
    const recentDeposits = allTxns.map(t => {
      const acc = accounts.find(a => a.id === t.accountId);
      const m = acc ? members.find(mm => mm.id === acc.memberId) : null;
      return { memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown", amountKobo: t.amountKobo, date: t.transactionDate };
    });

    setData({
      memberCountByStatus,
      totalSavings,
      totalAccounts: accounts.length,
      activeLoansCount: activeLoans.length,
      totalOutstanding,
      overdueLoanCount: overdueLoans.length,
      loanStatusBreakdown,
      topSavers,
      recentDeposits,
    });
  }, [role, router]);

  if (!data) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div>
      <PageHeader title="Reports &amp; Analytics" description="Cooperative performance overview" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Members", value: String(data.memberCountByStatus["active"] ?? 0), sub: `${data.memberCountByStatus["pending"] ?? 0} pending` },
          { label: "Total Savings", value: formatNGN(data.totalSavings), sub: `${data.totalAccounts} accounts` },
          { label: "Active Loans", value: String(data.activeLoansCount), sub: formatNGN(data.totalOutstanding) + " outstanding" },
          { label: "Overdue Loans", value: String(data.overdueLoanCount), sub: data.overdueLoanCount > 0 ? "⚠ needs attention" : "✓ none" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Member Status Breakdown</h3>
          <div className="space-y-2">
            {(["active", "pending", "suspended", "exited"] as const).map(s => (
              <div key={s} className="flex justify-between text-sm">
                <span className="capitalize text-gray-600">{s}</span>
                <span className="font-semibold text-gray-800">{data.memberCountByStatus[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Top 5 Savers</h3>
          <div className="space-y-2">
            {data.topSavers.map((a, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                  <span className="text-gray-700">{a.memberName}</span>
                </div>
                <span className="font-semibold text-green-700">{formatNGN(a.balanceKobo)}</span>
              </div>
            ))}
            {data.topSavers.length === 0 && <p className="text-sm text-gray-400">No savings data.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Loan Portfolio</h3>
          <div className="space-y-2">
            {data.loanStatusBreakdown.map(s => (
              <div key={s.status} className="flex justify-between text-sm">
                <span className="capitalize text-gray-600">{s.status}</span>
                <span className="font-semibold text-gray-800">{s.count} loans</span>
              </div>
            ))}
            {data.loanStatusBreakdown.length === 0 && <p className="text-sm text-gray-400">No loan data.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-700 mb-3">Recent Deposits</h3>
          <div className="space-y-2">
            {data.recentDeposits.map((d, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span className="text-gray-700 font-medium">{d.memberName}</span>
                  <span className="text-gray-400 text-xs ml-2">{new Date(d.date).toLocaleDateString("en-NG")}</span>
                </div>
                <span className="font-semibold text-green-700">+{formatNGN(d.amountKobo)}</span>
              </div>
            ))}
            {data.recentDeposits.length === 0 && <p className="text-sm text-gray-400">No recent deposits.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Overdue Loans</h3>
          {data.overdueLoanCount === 0 ? (
            <p className="text-sm text-green-600">✓ No overdue loans</p>
          ) : (
            <p className="text-sm text-red-600">{data.overdueLoanCount} loan(s) past maturity date</p>
          )}
        </div>
      </div>
    </div>
  );
}
