"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth-local";
import { localDb, type LocalShare, type LocalShareTransaction } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";

type ShareWithMember = LocalShare & { memberName: string; memberNumber: string };
type TxWithMember = LocalShareTransaction & { memberName: string };

export default function SharesPage() {
  const session = getSession();
  const role = session?.role ?? "";
  const memberId = session?.memberId ?? null;
  const isOfficer = ["treasurer", "president", "superadmin", "loan_officer", "secretary"].includes(role);

  const [shares, setShares] = useState<ShareWithMember[]>([]);
  const [transactions, setTransactions] = useState<TxWithMember[]>([]);
  const [shareValueKobo, setShareValueKobo] = useState(10000);
  const [myShares, setMyShares] = useState(0);

  useEffect(() => {
    localDb.init();
    const val = localDb.settings.get("share_value_kobo");
    if (val) setShareValueKobo(parseInt(val));

    const members = localDb.members.all();

    if (isOfficer) {
      const allShares = localDb.shares.all();
      const enriched: ShareWithMember[] = allShares.map(s => {
        const m = members.find(mm => mm.id === s.memberId);
        return { ...s, memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown", memberNumber: m?.memberNumber ?? "" };
      });
      setShares(enriched);

      const allTx = localDb.shareTransactions.all()
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
        .slice(0, 20);
      const enrichedTx: TxWithMember[] = allTx.map(tx => {
        const m = members.find(mm => mm.id === tx.memberId);
        return { ...tx, memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown" };
      });
      setTransactions(enrichedTx);
    } else if (memberId) {
      const myShareRecords = localDb.shares.findMany({ memberId } as never);
      setMyShares(myShareRecords.reduce((s, sc) => s + sc.sharesOwned, 0));
    }
  }, [isOfficer, memberId]);

  const totalShares = shares.reduce((s, sc) => s + sc.sharesOwned, 0);
  const totalCapital = totalShares * shareValueKobo;

  if (isOfficer) {
    return (
      <div>
        <PageHeader title="Share Capital" description={`${totalShares.toLocaleString()} total shares · ${formatNGN(totalCapital)} total capital`} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Member Shareholding</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50"><tr>
                  {["Member", "Shares", "Value"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {shares.map(sc => (
                    <tr key={sc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{sc.memberName}</p>
                        <p className="text-xs text-gray-400">{sc.memberNumber}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{sc.sharesOwned.toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-700">{formatNGN(sc.sharesOwned * shareValueKobo)}</td>
                    </tr>
                  ))}
                  {shares.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No share records.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Recent Transactions</h3>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {transactions.map(tx => (
                <div key={tx.id} className="px-4 py-3 flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{tx.memberName}</p>
                    <p className="text-xs text-gray-400 capitalize">{tx.transactionType.replace(/_/g, " ")} · {new Date(tx.transactionDate).toLocaleDateString("en-NG")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{tx.sharesQuantity > 0 ? "+" : ""}{tx.sharesQuantity} shares</p>
                    <p className="text-xs text-gray-500">{formatNGN(tx.totalAmountKobo)}</p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && <p className="px-4 py-6 text-center text-gray-400 text-sm">No transactions.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Shares" />
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Total Shares Owned</p>
        <p className="text-4xl font-bold text-gray-800 mt-1">{myShares.toLocaleString()}</p>
        {myShares === 0 && <p className="text-sm text-gray-400 mt-4">No share capital records found.</p>}
      </div>
    </div>
  );
}
