import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatNGN } from "@/lib/utils";
import Link from "next/link";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const role = session.user.role;
  const isOfficer = ["loan_officer","treasurer","secretary","president","superadmin"].includes(role);

  // Members can only view own profile
  if (!isOfficer && session.user.memberId !== id) redirect("/dashboard");

  const member = await prisma.member.findUnique({
    where: { id, deletedAt: null },
    include: {
      savingsAccount: {
        include: {
          transactions: { take: 5, orderBy: { transactionDate: "desc" } },
        },
      },
      loanApplications: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true } } },
      },
      loans: { where: { status: "active" }, take: 3 },
      kycDocuments: true,
      shareCapital: true,
    },
  });

  if (!member) notFound();

  const totalShares = member.shareCapital.reduce((s, sc) => s + sc.sharesOwned, 0);

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/members" className="text-sm text-gray-500 hover:text-gray-700">
          ← Members
        </Link>
      </div>

      <PageHeader
        title={`${member.firstName} ${member.lastName}`}
        description={member.memberNumber}
        action={
          isOfficer && (
            <StatusBadge status={member.status} />
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Personal Information</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Member Number", member.memberNumber],
                ["Phone", member.phone],
                ["Email", member.email ?? "—"],
                ["Gender", member.gender ?? "—"],
                ["Date of Birth", member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString("en-NG") : "—"],
                ["Occupation", member.occupation ?? "—"],
                ["Employer", member.employer ?? "—"],
                ["BVN", member.bvn ? "••••••" + member.bvn.slice(-3) : "—"],
                ["NIN", member.nin ? "••••••" + member.nin.slice(-3) : "—"],
                ["Membership Date", member.membershipDate ? new Date(member.membershipDate).toLocaleDateString("en-NG") : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide">{k}</dt>
                  <dd className="font-medium text-gray-700 mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Address</h3>
            <p className="text-sm text-gray-600">
              {[member.addressStreet, member.addressCity, member.addressLga, member.addressState]
                .filter(Boolean)
                .join(", ") || "Not provided"}
            </p>
            {member.nextOfKinName && (
              <div className="mt-4">
                <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-1">Next of Kin</h4>
                <p className="text-sm text-gray-700">
                  {member.nextOfKinName} ({member.nextOfKinRelationship}) — {member.nextOfKinPhone}
                </p>
              </div>
            )}
          </div>

          {/* KYC */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">KYC Documents</h3>
            {member.kycDocuments.length === 0 ? (
              <p className="text-sm text-gray-400">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {member.kycDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 capitalize">{doc.documentType.replace(/_/g, " ")}</span>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side cards */}
        <div className="space-y-4">
          {/* Savings */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Savings Account</h3>
            {member.savingsAccount ? (
              <>
                <p className="text-2xl font-bold text-green-700">
                  {formatNGN(member.savingsAccount.balanceKobo)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{member.savingsAccount.accountNumber}</p>
                <div className="mt-3 space-y-1">
                  {member.savingsAccount.transactions.map((t) => (
                    <div key={t.id} className="flex justify-between text-xs text-gray-500">
                      <span>{t.transactionType.replace(/_/g, " ")}</span>
                      <span className={t.direction === "credit" ? "text-green-600" : "text-red-600"}>
                        {t.direction === "credit" ? "+" : "-"}{formatNGN(t.amountKobo)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">No savings account.</p>
            )}
          </div>

          {/* Loans */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Active Loans</h3>
            {member.loans.length === 0 ? (
              <p className="text-sm text-gray-400">No active loans.</p>
            ) : member.loans.map((loan) => (
              <div key={loan.id} className="text-sm mb-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Outstanding</span>
                  <span className="font-medium text-red-600">
                    {formatNGN(loan.totalPayableKobo - loan.amountPaidKobo)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Shares */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-1">Share Capital</h3>
            <p className="text-2xl font-bold text-gray-800">{totalShares} <span className="text-sm font-normal text-gray-400">shares</span></p>
          </div>

          {/* Recent loan applications */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Loan History</h3>
            {member.loanApplications.length === 0 ? (
              <p className="text-sm text-gray-400">No loan applications.</p>
            ) : member.loanApplications.map((app) => (
              <div key={app.id} className="flex justify-between items-center text-xs mb-2">
                <div>
                  <p className="text-gray-700">{app.product.name}</p>
                  <p className="text-gray-400">{formatNGN(app.requestedAmountKobo)}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
