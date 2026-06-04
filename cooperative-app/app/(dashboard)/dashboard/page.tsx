"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth-local";
import { localDb } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const session = getSession();
  const role = session?.role ?? "";
  const memberId = session?.memberId ?? null;
  const isOfficer = ["loan_officer", "treasurer", "secretary", "president", "superadmin"].includes(role);

  const [data, setData] = useState<{
    memberCount?: number;
    activeLoanCount?: number;
    totalSavings?: number;
    loanPortfolio?: number;
    savings?: { balanceKobo: number; accountNumber: string } | null;
    loans?: Array<{ totalPayableKobo: number; amountPaidKobo: number }>;
  }>({});

  useEffect(() => {
    localDb.init();
    if (isOfficer) {
      const members = localDb.members.findMany({ deletedAt: null, status: "active" } as never);
      const activeLoans = localDb.loans.findMany({ status: "active" } as never);
      const allAccounts = localDb.savingsAccounts.all();
      const totalSavings = allAccounts.reduce((s, a) => s + a.balanceKobo, 0);
      const loanPortfolio = activeLoans.reduce((s, l) => s + l.totalPayableKobo - l.amountPaidKobo, 0);

      setData({
        memberCount: members.length,
        activeLoanCount: activeLoans.length,
        totalSavings,
        loanPortfolio,
      });
    } else if (memberId) {
      const savings = localDb.savingsAccounts.findFirst({ memberId } as never);
      const loans = localDb.loans.findMany({ memberId, status: "active" } as never);
      setData({ savings, loans });
    }
  }, [isOfficer, memberId]);

  if (isOfficer) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Active Members" value={String(data.memberCount ?? 0)} />
          <KpiCard label="Total Savings" value={formatNGN(data.totalSavings ?? 0)} />
          <KpiCard label="Active Loans" value={String(data.activeLoanCount ?? 0)} />
          <KpiCard label="Loan Portfolio" value={formatNGN(data.loanPortfolio ?? 0)} />
        </div>
      </div>
    );
  }

  if (!memberId) {
    return <div className="text-gray-600">No member profile linked to this account.</div>;
  }

  const totalOutstanding = (data.loans ?? []).reduce(
    (s, l) => s + l.totalPayableKobo - l.amountPaidKobo,
    0
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Account</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Savings Balance"
          value={data.savings ? formatNGN(data.savings.balanceKobo) : "₦0.00"}
          sub={data.savings?.accountNumber}
        />
        <KpiCard label="Active Loans" value={String((data.loans ?? []).length)} />
        <KpiCard label="Loan Outstanding" value={formatNGN(totalOutstanding)} />
      </div>
    </div>
  );
}
