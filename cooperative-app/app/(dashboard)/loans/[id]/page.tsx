"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession } from "@/lib/auth-local";
import { localDb, type LocalLoanApplication, type LocalLoanProduct, type LocalLoan, type LocalLoanSchedule, type LocalRepayment } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";
import { LoanActions } from "./LoanActions";

interface DetailData {
  app: LocalLoanApplication & { memberName: string; memberNumber: string; memberId: string };
  product: LocalLoanProduct;
  loan: (LocalLoan & { schedule: LocalLoanSchedule[]; repayments: LocalRepayment[] }) | null;
}

function Row({ label, value, className, bold, extra }: {
  label: string; value: string; className?: string; bold?: boolean; extra?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${className ?? "text-gray-800"}`}>
        {extra ?? value}
      </span>
    </div>
  );
}

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = getSession();
  const role = session?.role ?? "";
  const isOfficer = ["loan_officer", "treasurer", "secretary", "president", "superadmin"].includes(role);

  const [detail, setDetail] = useState<DetailData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    localDb.init();
    const app = localDb.loanApplications.findUnique(id);
    if (!app) { setNotFound(true); return; }

    if (!isOfficer && app.memberId !== session?.memberId) {
      router.replace("/dashboard");
      return;
    }

    const product = localDb.loanProducts.findUnique(app.loanProductId);
    if (!product) { setNotFound(true); return; }

    const member = localDb.members.findUnique(app.memberId);

    let loan: (LocalLoan & { schedule: LocalLoanSchedule[]; repayments: LocalRepayment[] }) | null = null;
    const rawLoan = localDb.loans.findFirst({ applicationId: id } as never);
    if (rawLoan) {
      const schedule = localDb.loanSchedule.findMany({ loanId: rawLoan.id } as never)
        .sort((a, b) => a.installmentNumber - b.installmentNumber);
      const repayments = localDb.repayments.findMany({ loanId: rawLoan.id } as never)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
        .slice(0, 10);
      loan = { ...rawLoan, schedule, repayments };
    }

    setDetail({
      app: {
        ...app,
        memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown",
        memberNumber: member?.memberNumber ?? "",
      },
      product,
      loan,
    });
  }, [id, isOfficer, session?.memberId, router, refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  if (notFound) return <div className="text-gray-500 p-6">Loan application not found.</div>;
  if (!detail) return <div className="p-6 text-gray-400">Loading…</div>;

  const { app, product, loan } = detail;

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/loans" className="text-sm text-gray-500 hover:text-gray-700">← Loans</Link>
      </div>

      <PageHeader
        title={`Loan ${app.applicationNumber}`}
        description={`${product.name} · ${app.memberName}`}
        action={<StatusBadge status={app.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Application Details</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {([
                ["Member", `${app.memberName} (${app.memberNumber})`],
                ["Product", product.name],
                ["Requested", formatNGN(app.requestedAmountKobo)],
                ["Approved", app.approvedAmountKobo != null ? formatNGN(app.approvedAmountKobo) : "—"],
                ["Tenure", `${app.tenureMonths} months`],
                ["Interest Type", product.interestType.replace("_", " ")],
                ["Interest Rate", `${product.interestRatePct}% p.a.`],
                ["Processing Fee", `${product.processingFeePct}%`],
                ["Purpose", app.purpose],
                ["Submitted", app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("en-NG") : "—"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide">{k}</dt>
                  <dd className="font-medium text-gray-700 mt-0.5 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {loan && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Repayment Schedule</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-100">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase">
                      {["#", "Due Date", "Principal", "Interest", "Total", "Paid", "Status"].map(h => <th key={h} className="py-2 pr-4 text-left font-semibold">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loan.schedule.map(s => (
                      <tr key={s.id} className={s.isPaid ? "opacity-60" : ""}>
                        <td className="py-2 pr-4 text-gray-500">{s.installmentNumber}</td>
                        <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{new Date(s.dueDate).toLocaleDateString("en-NG")}</td>
                        <td className="py-2 pr-4">{formatNGN(s.principalDueKobo)}</td>
                        <td className="py-2 pr-4 text-orange-600">{formatNGN(s.interestDueKobo)}</td>
                        <td className="py-2 pr-4 font-medium">{formatNGN(s.totalDueKobo)}</td>
                        <td className="py-2 pr-4 text-green-600">{formatNGN(s.amountPaidKobo)}</td>
                        <td className="py-2 pr-4">{s.isPaid ? <span className="text-green-600 text-xs font-medium">✓ Paid</span> : <span className="text-gray-400 text-xs">Pending</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loan && loan.repayments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Payment History</h3>
              <div className="space-y-2">
                {loan.repayments.map(r => (
                  <div key={r.id} className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-700 font-medium">{formatNGN(r.amountKobo)}</span>
                      <span className="text-gray-400 ml-2 text-xs">{r.paymentMethod.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-gray-400 text-xs">{new Date(r.paymentDate).toLocaleDateString("en-NG")} · {r.referenceNumber}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {loan && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Loan Summary</h3>
              <div className="space-y-3 text-sm">
                <Row label="Principal" value={formatNGN(loan.principalKobo)} />
                <Row label="Total Interest" value={formatNGN(loan.interestKobo)} className="text-orange-600" />
                <Row label="Processing Fee" value={formatNGN(loan.processingFeeKobo)} />
                <div className="border-t border-gray-100 pt-2">
                  <Row label="Total Payable" value={formatNGN(loan.totalPayableKobo)} bold />
                  <Row label="Amount Paid" value={formatNGN(loan.amountPaidKobo)} className="text-green-600" />
                  <Row label="Outstanding" value={formatNGN(loan.totalPayableKobo - loan.amountPaidKobo)} className="text-red-600" bold />
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <Row label="Disbursed" value={new Date(loan.disbursementDate).toLocaleDateString("en-NG")} />
                  <Row label="Maturity" value={new Date(loan.maturityDate).toLocaleDateString("en-NG")} />
                  <Row label="Status" value="" extra={<StatusBadge status={loan.status} />} />
                </div>
              </div>
            </div>
          )}

          {isOfficer && (
            <LoanActions application={{ id: app.id, status: app.status }} role={role} onRefresh={refresh} />
          )}
        </div>
      </div>
    </div>
  );
}
