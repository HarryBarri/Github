"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getSession } from "@/lib/auth-local";
import { localDb, type LocalSavingsAccount, type LocalSavingsTransaction } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

type AccountWithMember = LocalSavingsAccount & { memberName: string; memberNumber: string };
type SelectedAccount = LocalSavingsAccount & { memberName: string };

function TransactionList({ transactions, total, page, limit, accountId }: {
  transactions: LocalSavingsTransaction[];
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
              {["Date", "Type", "Reference", "Description", "Amount", "Balance After"].map(h => (
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
                <td className="px-4 py-3 capitalize text-gray-700">{t.transactionType.replace(/_/g, " ")}</td>
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
            {page > 1 && <Link href={`?accountId=${accountId}&page=${page - 1}`} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">← Prev</Link>}
            {page < totalPages && <Link href={`?accountId=${accountId}&page=${page + 1}`} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SavingsPage() {
  const session = getSession();
  const role = session?.role ?? "";
  const memberId = session?.memberId ?? null;
  const isOfficer = ["treasurer", "president", "secretary", "loan_officer", "superadmin"].includes(role);
  const searchParams = useSearchParams();
  const accountId = searchParams.get("accountId") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 25;

  const [accounts, setAccounts] = useState<AccountWithMember[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SelectedAccount | null>(null);
  const [transactions, setTransactions] = useState<LocalSavingsTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [myAccount, setMyAccount] = useState<LocalSavingsAccount | null>(null);

  const load = useCallback(() => {
    localDb.init();
    if (isOfficer) {
      const allAccounts = localDb.savingsAccounts.all();
      const members = localDb.members.all();
      const enriched: AccountWithMember[] = allAccounts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50)
        .map((a) => {
          const m = members.find((mm) => mm.id === a.memberId);
          return { ...a, memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown", memberNumber: m?.memberNumber ?? "" };
        });
      setAccounts(enriched);
      setTotalSavings(allAccounts.reduce((s, a) => s + a.balanceKobo, 0));

      if (accountId) {
        const acc = localDb.savingsAccounts.findUnique(accountId);
        if (acc) {
          const member = members.find((m) => m.id === acc.memberId);
          setSelectedAccount({ ...acc, memberName: member ? `${member.firstName} ${member.lastName}` : "" });
          const allTxns = localDb.savingsTransactions.findMany({ accountId } as never)
            .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
          setTxTotal(allTxns.length);
          setTransactions(allTxns.slice((page - 1) * limit, page * limit));
        } else {
          setSelectedAccount(null);
        }
      } else {
        setSelectedAccount(null);
      }
    } else if (memberId) {
      const acc = localDb.savingsAccounts.findFirst({ memberId } as never);
      setMyAccount(acc);
      if (acc) {
        const allTxns = localDb.savingsTransactions.findMany({ accountId: acc.id } as never)
          .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
        setTxTotal(allTxns.length);
        setTransactions(allTxns.slice((page - 1) * limit, page * limit));
      }
    }
  }, [isOfficer, memberId, accountId, page, limit]);

  useEffect(() => { load(); }, [load]);

  if (isOfficer) {
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
                      <p className="text-sm font-medium text-gray-800">{a.memberName}</p>
                      <p className="text-xs text-gray-400">{a.accountNumber}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-700">{formatNGN(a.balanceKobo)}</p>
                  </div>
                </Link>
              ))}
              {accounts.length === 0 && <p className="px-4 py-6 text-center text-gray-400 text-sm">No accounts.</p>}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedAccount ? (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedAccount.memberName}</h3>
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

  if (!memberId) return <div className="text-gray-600">No savings account linked.</div>;

  if (!myAccount) return (
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
        <p className="text-4xl font-bold text-green-700 mt-1">{formatNGN(myAccount.balanceKobo)}</p>
        <p className="text-xs text-gray-400 mt-1">{myAccount.accountNumber} · <StatusBadge status={myAccount.status} /></p>
      </div>
      <TransactionList transactions={transactions} total={txTotal} page={page} limit={limit} accountId={myAccount.id} />
    </div>
  );
}
