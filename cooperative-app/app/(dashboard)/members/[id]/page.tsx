"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession } from "@/lib/auth-local";
import { localDb, type LocalMember, type LocalSavingsAccount, type LocalSavingsTransaction, type LocalLoanApplication, type LocalLoan, type LocalShare } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

interface MemberDetail {
  member: LocalMember;
  savingsAccount: (LocalSavingsAccount & { transactions: LocalSavingsTransaction[] }) | null;
  loanApplications: Array<LocalLoanApplication & { productName: string }>;
  loans: LocalLoan[];
  totalShares: number;
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = getSession();
  const role = session?.role ?? "";
  const isOfficer = ["loan_officer", "treasurer", "secretary", "president", "superadmin"].includes(role);

  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    localDb.init();
    if (!isOfficer && session?.memberId !== id) {
      router.replace("/dashboard");
      return;
    }

    const member = localDb.members.findUnique(id);
    if (!member || member.deletedAt) {
      setNotFound(true);
      return;
    }

    const acc = localDb.savingsAccounts.findFirst({ memberId: id } as never);
    let savingsAccount: (LocalSavingsAccount & { transactions: LocalSavingsTransaction[] }) | null = null;
    if (acc) {
      const allTxns = localDb.savingsTransactions.findMany({ accountId: acc.id } as never);
      const transactions = allTxns
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
        .slice(0, 5);
      savingsAccount = { ...acc, transactions };
    }

    const allApps = localDb.loanApplications.findMany({ memberId: id } as never);
    const loanApplications = allApps
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((app) => {
        const product = localDb.loanProducts.findUnique(app.loanProductId);
        return { ...app, productName: product?.name ?? "Unknown" };
      });

    const loans = localDb.loans.findMany({ memberId: id, status: "active" } as never).slice(0, 3);
    const shares = localDb.shares.findMany({ memberId: id } as never);
    const totalShares = shares.reduce((s, sc) => s + sc.sharesOwned, 0);

    setDetail({ member, savingsAccount, loanApplications, loans, totalShares });
  }, [id, isOfficer, session?.memberId, router]);

  if (notFound) return <div className="text-gray-500 p-6">Member not found.</div>;
  if (!detail) return <div className="p-6 text-gray-400">Loading…</div>;

  const { member, savingsAccount, loanApplications, loans, totalShares } = detail;

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
        action={isOfficer && <StatusBadge status={member.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Personal Information</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {([
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
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide">{k}</dt>
                  <dd className="font-medium text-gray-700 mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

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

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">KYC Documents</h3>
            <p className="text-sm text-gray-400">No documents uploaded.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Savings Account</h3>
            {savingsAccount ? (
              <>
                <p className="text-2xl font-bold text-green-700">
                  {formatNGN(savingsAccount.balanceKobo)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{savingsAccount.accountNumber}</p>
                <div className="mt-3 space-y-1">
                  {savingsAccount.transactions.map((t) => (
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

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Active Loans</h3>
            {loans.length === 0 ? (
              <p className="text-sm text-gray-400">No active loans.</p>
            ) : loans.map((loan) => (
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

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-1">Share Capital</h3>
            <p className="text-2xl font-bold text-gray-800">{totalShares} <span className="text-sm font-normal text-gray-400">shares</span></p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Loan History</h3>
            {loanApplications.length === 0 ? (
              <p className="text-sm text-gray-400">No loan applications.</p>
            ) : loanApplications.map((app) => (
              <div key={app.id} className="flex justify-between items-center text-xs mb-2">
                <div>
                  <p className="text-gray-700">{app.productName}</p>
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
