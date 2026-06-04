"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession } from "@/lib/auth-local";
import { localDb, type LocalDividend, type LocalDividendAllocation } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

type AllocWithMember = LocalDividendAllocation & { memberName: string; memberNumber: string };

export default function DividendDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = getSession();
  const role = session?.role ?? "";

  const [dividend, setDividend] = useState<LocalDividend | null>(null);
  const [allocations, setAllocations] = useState<AllocWithMember[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!["treasurer", "president", "superadmin"].includes(role)) {
      router.replace("/dashboard");
      return;
    }
    localDb.init();
    const d = localDb.dividends.findUnique(id);
    if (!d) { setNotFound(true); return; }
    setDividend(d);

    const allocs = localDb.dividendAllocations.findMany({ dividendId: id } as never);
    const members = localDb.members.all();
    const enriched: AllocWithMember[] = allocs
      .sort((a, b) => b.allocationAmountKobo - a.allocationAmountKobo)
      .map(a => {
        const m = members.find(mm => mm.id === a.memberId);
        return { ...a, memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown", memberNumber: m?.memberNumber ?? "" };
      });
    setAllocations(enriched);
  }, [id, role, router]);

  if (notFound) return <div className="text-gray-500 p-6">Dividend not found.</div>;
  if (!dividend) return <div className="p-6 text-gray-400">Loading…</div>;

  const totalAllocated = allocations.reduce((s, a) => s + a.allocationAmountKobo, 0);

  return (
    <div>
      <div className="mb-4"><Link href="/dashboard/dividends" className="text-sm text-gray-500 hover:text-gray-700">← Dividends</Link></div>
      <PageHeader title={`${dividend.financialYear} Dividend`} action={<StatusBadge status={dividend.status} />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {[
          { label: "Total Profit", value: formatNGN(dividend.totalProfitKobo) },
          { label: "Dividend Fund", value: formatNGN(dividend.dividendFundKobo) },
          { label: "Allocated", value: formatNGN(totalAllocated) },
          { label: "Members", value: String(allocations.length) },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase">{k.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Member Allocations ({allocations.length})</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50"><tr>
              {["Member", "Shares Held", "Savings Balance", "Allocation", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {allocations.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{a.memberName}<div className="text-xs text-gray-400">{a.memberNumber}</div></td>
                  <td className="px-4 py-3">{a.sharesHeld.toLocaleString()}</td>
                  <td className="px-4 py-3">{formatNGN(a.savingsBalanceKobo)}</td>
                  <td className="px-4 py-3 font-bold text-green-700">{formatNGN(a.allocationAmountKobo)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No allocations computed yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
