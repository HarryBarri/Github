"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getSession } from "@/lib/auth-local";
import { localDb, type LocalLoanApplication } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

type AppWithMeta = LocalLoanApplication & {
  memberName: string;
  memberNumber: string;
  productName: string;
};

export default function LoansPage() {
  const session = getSession();
  const role = session?.role ?? "";
  const memberId = session?.memberId ?? null;
  const isOfficer = ["loan_officer", "treasurer", "secretary", "president", "superadmin"].includes(role);
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const [applications, setApplications] = useState<AppWithMeta[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    localDb.init();
    const { items, total: t } = localDb.loanApplications.findManyFiltered({
      status: status || undefined,
      memberId: !isOfficer ? (memberId ?? undefined) : undefined,
      page,
      limit,
    });

    const members = localDb.members.all();
    const products = localDb.loanProducts.all();
    const enriched: AppWithMeta[] = items.map(app => {
      const m = members.find(mm => mm.id === app.memberId);
      const p = products.find(pp => pp.id === app.loanProductId);
      return {
        ...app,
        memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown",
        memberNumber: m?.memberNumber ?? "",
        productName: p?.name ?? "Unknown",
      };
    });
    setApplications(enriched);
    setTotal(t);
  }, [status, page, isOfficer, memberId]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);
  const statuses = ["submitted", "under_review", "approved", "disbursed", "rejected", "completed", "draft", "withdrawn"];

  return (
    <div>
      <PageHeader
        title={isOfficer ? "Loan Applications" : "My Loans"}
        description={`${total} application${total !== 1 ? "s" : ""}`}
        action={
          !isOfficer && (
            <Link href="/dashboard/loans/apply"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg">
              Apply for Loan
            </Link>
          )
        }
      />

      <div className="flex gap-2 flex-wrap mb-5">
        <Link href="/dashboard/loans" className={`px-3 py-1 rounded-full text-xs font-medium transition ${!status ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>All</Link>
        {statuses.map(s => (
          <Link key={s} href={`?status=${s}`}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${status === s ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {isOfficer
                ? ["App Number", "Member", "Product", "Amount", "Tenure", "Status", "Submitted", ""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)
                : ["App Number", "Product", "Amount Requested", "Tenure", "Status", "Date", ""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)
              }
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {applications.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No applications found.</td></tr>
            ) : applications.map(app => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{app.applicationNumber}</td>
                {isOfficer && (
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{app.memberName}</span>
                    <div className="text-xs text-gray-400">{app.memberNumber}</div>
                  </td>
                )}
                <td className="px-4 py-3 text-gray-700">{app.productName}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{formatNGN(app.requestedAmountKobo)}</td>
                <td className="px-4 py-3 text-gray-600">{app.tenureMonths} mo</td>
                <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("en-NG") : "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/loans/${app.id}`} className="text-green-600 hover:underline text-xs">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`?status=${status}&page=${page - 1}`} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">← Prev</Link>}
            {page < totalPages && <Link href={`?status=${status}&page=${page + 1}`} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
