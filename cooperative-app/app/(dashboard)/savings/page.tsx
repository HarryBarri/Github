import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatNGN } from "@/lib/utils";
import Link from "next/link";

export default async function SavingsPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const role = session.user.role;
  const memberId = session.user.memberId;
  const isOfficer = ["treasurer","president","secretary","loan_officer","superadmin"].includes(role);
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const limit = 25;

  if (isOfficer) {
    // Officer: show all accounts summary + selected account transactions
    const accountId = sp.accountId;
    const [accounts, selectedAccount, transactions, txTotal] = await Promise.all([
      prisma.savingsAccount.findMany({
        orderBy: { createdAt: "desc" },
        include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
        take: 50,
      }),
      accountId ? prisma.savingsAccount.findUnique({ where: { id: accountId }, include: { member: { select: { firstName: true, lastName: true } } } }) : null,
      accountId ? prisma.savingsTransaction.findMany({
        where: { accountId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { transactionDate: "desc" },
      }) : [],
      accountId ? prisma.savingsTransaction.count({ where: { accountId } }) : 0,
    ]);

    const totalSavings = accounts.reduce((s, a) => s + a.balanceKobo, 0n);

    return (
      <div>
        <PageHeader
          title="Savings Management"
          description={`Total: ${formatNGN(totalSavings)} across ${accounts.length} accounts`}
          action={
            <Link href="/dashboard/savings/deposit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg">
              Record Deposit
            </Link>
          }
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">All Accounts</h3>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {accounts.map((a) => (
                <Link key={a.id} href={`?accountId=${a.id}`}
                  className={`block px-4 py-3 hover:bg-gray-50 transition ${accountId === a.id ? "bg-green-50 border-l-2 border-green-600" : ""}`}>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.member.firstName} {a.member.lastName}</p>
                      <p className="text-xs text-gray-400">{a.accountNumber}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-700">{formatNGN(a.balanceKobo)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedAccount ? (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedAccount.member.firstName} {selectedAccount.member.lastName}</h3>
                      <p className="text-xs text-gray-400">{selectedAccount.accountNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-700">{formatNGN(selectedAccount.balanceKobo)}</p>
                      <StatusBadge status={selectedAccount.status} />
                    </div>
                  </div>
                </div>
                <TransactionList transactions={transactions} total={txTotal} page={page} limit={limit} accountId={accountId!} />
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
                Select an account to view transactions
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Member: view own account
  if (!memberId) return <div className="text-gray-600">No savings account linked.</div>;

  const [account, transactions, txTotal] = await Promise.all([
    prisma.savingsAccount.findUnique({ where: { memberId } }),
    prisma.savingsTransaction.findMany({
      where: memberId ? { account: { memberId } } : {},
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { transactionDate: "desc" },
    }),
    prisma.savingsTransaction.count({ where: memberId ? { account: { memberId } } : {} }),
  ]);

  if (!account) return (
    <div>
      <PageHeader title="My Savings" />
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        No savings account found. Contact your cooperative office.
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="My Savings Account" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <p className="text-sm text-gray-500">Available Balance</p>
        <p className="text-4xl font-bold text-green-700 mt-1">{formatNGN(account.balanceKobo)}</p>
        <p className="text-xs text-gray-400 mt-1">{account.accountNumber} · <StatusBadge status={account.status} /></p>
      </div>
      <TransactionList transactions={transactions} total={txTotal} page={page} limit={limit} accountId={account.id} />
    </div>
  );
}

function TransactionList({ transactions, total, page, limit, accountId }: {
  transactions: Array<{
    id: string; transactionType: string; amountKobo: bigint;
    direction: string; balanceAfterKobo: bigint; referenceNumber: string;
    transactionDate: Date; description: string | null;
  }>;
  total: number; page: number; limit: number; accountId: string;
}) {
  const totalPages = Math.ceil(total / limit);
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2">Transactions ({total})</h3>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Date","Type","Reference","Description","Amount","Balance After"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No transactions yet.</td></tr>
            ) : transactions.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(t.transactionDate).toLocaleDateString("en-NG")}</td>
                <td className="px-4 py-3 capitalize text-gray-700">{t.transactionType.replace(/_/g," ")}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.referenceNumber}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{t.description ?? "—"}</td>
                <td className={`px-4 py-3 font-semibold whitespace-nowrap ${t.direction === "credit" ? "text-green-600" : "text-red-600"}`}>
                  {t.direction === "credit" ? "+" : "-"}{formatNGN(t.amountKobo)}
                </td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatNGN(t.balanceAfterKobo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`?accountId=${accountId}&page=${page-1}`} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">← Prev</Link>}
            {page < totalPages && <Link href={`?accountId=${accountId}&page=${page+1}`} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
