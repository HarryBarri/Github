"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth-local";
import { localDb, type LocalDividend, type LocalDividendAllocation } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

type DividendWithCount = LocalDividend & { allocationCount: number };
type AllocationWithDividend = LocalDividendAllocation & {
  financialYear: number;
  declarationDate: string;
  dividendStatus: string;
};

export default function DividendsPage() {
  const session = getSession();
  const role = session?.role ?? "";
  const memberId = session?.memberId ?? null;
  const isOfficer = ["treasurer", "president", "superadmin"].includes(role);

  const [dividends, setDividends] = useState<DividendWithCount[]>([]);
  const [myAllocations, setMyAllocations] = useState<AllocationWithDividend[]>([]);

  useEffect(() => {
    localDb.init();
    if (isOfficer) {
      const all = localDb.dividends.all().sort((a, b) => b.financialYear - a.financialYear);
      const allocations = localDb.dividendAllocations.all();
      setDividends(all.map(d => ({
        ...d,
        allocationCount: allocations.filter(a => a.dividendId === d.id).length,
      })));
    } else if (memberId) {
      const myAllocs = localDb.dividendAllocations.findMany({ memberId } as never);
      const all = localDb.dividends.all();
      const enriched: AllocationWithDividend[] = myAllocs.map(a => {
        const d = all.find(dd => dd.id === a.dividendId);
        return {
          ...a,
          financialYear: d?.financialYear ?? 0,
          declarationDate: d?.declarationDate ?? "",
          dividendStatus: d?.status ?? "",
        };
      }).sort((a, b) => b.financialYear - a.financialYear);
      setMyAllocations(enriched);
    }
  }, [isOfficer, memberId]);

  if (!isOfficer) {
    return (
      <div>
        <PageHeader title="My Dividends" />
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50"><tr>
              {["Year", "Declaration Date", "My Allocation", "Status"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {myAllocations.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{a.financialYear}</td>
                  <td className="px-4 py-3 text-gray-500">{a.declarationDate ? new Date(a.declarationDate).toLocaleDateString("en-NG") : "—"}</td>
                  <td className="px-4 py-3 font-bold text-green-700">{formatNGN(a.allocationAmountKobo)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
              {myAllocations.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No dividend records.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

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
            {["Year", "Declaration Date", "Total Profit", "Dividend Fund", "Rate", "Members", "Status", ""].map(h => (
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
                <td className="px-4 py-3 text-gray-600">{d.allocationCount}</td>
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
