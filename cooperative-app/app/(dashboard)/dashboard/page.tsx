import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNGN } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const role = session!.user.role;
  const memberId = session!.user.memberId;

  const isOfficer = ["loan_officer", "treasurer", "secretary", "president", "superadmin"].includes(role);

  // Officer: fetch aggregate KPIs
  if (isOfficer) {
    const [memberCount, activeLoanCount, savingsAccounts, activeLoans] =
      await Promise.all([
        prisma.member.count({ where: { status: "active", deletedAt: null } }),
        prisma.loan.count({ where: { status: "active" } }),
        prisma.savingsAccount.aggregate({ _sum: { balanceKobo: true } }),
        prisma.loan.aggregate({
          _sum: { totalPayableKobo: true, amountPaidKobo: true },
          where: { status: "active" },
        }),
      ]);

    const totalSavings = savingsAccounts._sum.balanceKobo ?? 0n;
    const loanPortfolio =
      (activeLoans._sum.totalPayableKobo ?? 0n) -
      (activeLoans._sum.amountPaidKobo ?? 0n);

    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Active Members" value={String(memberCount)} />
          <KpiCard label="Total Savings" value={formatNGN(totalSavings)} />
          <KpiCard label="Active Loans" value={String(activeLoanCount)} />
          <KpiCard label="Loan Portfolio" value={formatNGN(loanPortfolio)} />
        </div>
      </div>
    );
  }

  // Member: show own summary
  if (!memberId) {
    return <div className="text-gray-600">No member profile linked to this account.</div>;
  }

  const [savings, loans] = await Promise.all([
    prisma.savingsAccount.findUnique({
      where: { memberId },
      select: { balanceKobo: true, accountNumber: true },
    }),
    prisma.loan.findMany({
      where: { memberId, status: "active" },
      select: { totalPayableKobo: true, amountPaidKobo: true },
    }),
  ]);

  const totalOutstanding = loans.reduce(
    (sum, l) => sum + l.totalPayableKobo - l.amountPaidKobo,
    0n
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Account</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Savings Balance"
          value={savings ? formatNGN(savings.balanceKobo) : "₦0.00"}
          sub={savings?.accountNumber}
        />
        <KpiCard
          label="Active Loans"
          value={String(loans.length)}
        />
        <KpiCard
          label="Loan Outstanding"
          value={formatNGN(totalOutstanding)}
        />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
