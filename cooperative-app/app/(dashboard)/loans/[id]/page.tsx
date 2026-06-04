import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatNGN } from "@/lib/utils";
import Link from "next/link";
import { LoanActions } from "./LoanActions";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const role = session.user.role;
  const isOfficer = ["loan_officer","treasurer","secretary","president","superadmin"].includes(role);

  const application = await prisma.loanApplication.findUnique({
    where: { id },
    include: {
      member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } },
      product: true,
      guarantors: { include: { guarantor: { select: { firstName: true, lastName: true, memberNumber: true } } } },
      loan: {
        include: {
          schedule: { orderBy: { installmentNumber: "asc" } },
          repayments: { orderBy: { paymentDate: "desc" }, take: 10 },
        },
      },
    },
  });

  if (!application) notFound();

  // Access control
  if (!isOfficer && application.memberId !== session.user.memberId) redirect("/dashboard");

  const loan = application.loan;

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/loans" className="text-sm text-gray-500 hover:text-gray-700">← Loans</Link>
      </div>

      <PageHeader
        title={`Loan ${application.applicationNumber}`}
        description={`${application.product.name} · ${application.member.firstName} ${application.member.lastName}`}
        action={<StatusBadge status={application.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Application details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Application Details</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Member", `${application.member.firstName} ${application.member.lastName} (${application.member.memberNumber})`],
                ["Product", application.product.name],
                ["Requested", formatNGN(application.requestedAmountKobo)],
                ["Approved", application.approvedAmountKobo ? formatNGN(application.approvedAmountKobo) : "—"],
                ["Tenure", `${application.tenureMonths} months`],
                ["Interest Type", application.product.interestType.replace("_"," ")],
                ["Interest Rate", `${application.product.interestRatePct}% p.a.`],
                ["Processing Fee", `${application.product.processingFeePct}%`],
                ["Purpose", application.purpose],
                ["Submitted", application.submittedAt ? new Date(application.submittedAt).toLocaleDateString("en-NG") : "—"],
              ].map(([k,v]) => (
                <div key={k}>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide">{k}</dt>
                  <dd className="font-medium text-gray-700 mt-0.5 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Guarantors */}
          {application.guarantors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Guarantors</h3>
              <div className="space-y-2">
                {application.guarantors.map(g => (
                  <div key={g.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{g.guarantor.firstName} {g.guarantor.lastName} <span className="text-gray-400 text-xs">({g.guarantor.memberNumber})</span></span>
                    <StatusBadge status={g.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repayment schedule */}
          {loan && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Repayment Schedule</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-100">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase">
                      {["#","Due Date","Principal","Interest","Total","Paid","Status"].map(h => <th key={h} className="py-2 pr-4 text-left font-semibold">{h}</th>)}
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

          {/* Repayment history */}
          {loan && loan.repayments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Payment History</h3>
              <div className="space-y-2">
                {loan.repayments.map(r => (
                  <div key={r.id} className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-700 font-medium">{formatNGN(r.amountKobo)}</span>
                      <span className="text-gray-400 ml-2 text-xs">{r.paymentMethod.replace(/_/g," ")}</span>
                    </div>
                    <span className="text-gray-400 text-xs">{new Date(r.paymentDate).toLocaleDateString("en-NG")} · {r.referenceNumber}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
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

          {/* Officer actions */}
          {isOfficer && (
            <LoanActions application={{ id: application.id, status: application.status }} role={role} />
          )}
        </div>
      </div>
    </div>
  );
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
