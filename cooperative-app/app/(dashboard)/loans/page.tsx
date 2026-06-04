import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatNGN } from "@/lib/utils";
import Link from "next/link";

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const role = session.user.role;
  const memberId = session.user.memberId;
  const isOfficer = ["loan_officer","treasurer","secretary","president","superadmin"].includes(role);
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const limit = 20;
  const status = sp.status ?? "";

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(!isOfficer ? { memberId: memberId ?? "" } : {}),
  };

  const [applications, total] = await Promise.all([
    prisma.loanApplication.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        member: { select: { firstName: true, lastName: true, memberNumber: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.loanApplication.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const statuses = ["submitted","under_review","approved","disbursed","rejected","completed","draft","withdrawn"];

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

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-5">
        <Link href="/dashboard/loans" className={`px-3 py-1 rounded-full text-xs font-medium transition ${!status ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>All</Link>
        {statuses.map(s => (
          <Link key={s} href={`?status=${s}`}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${status === s ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s.replace(/_/g," ")}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {isOfficer
                ? ["App Number","Member","Product","Amount","Tenure","Status","Submitted",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)
                : ["App Number","Product","Amount Requested","Tenure","Status","Date",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)
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
                    <span className="font-medium text-gray-800">{app.member.firstName} {app.member.lastName}</span>
                    <div className="text-xs text-gray-400">{app.member.memberNumber}</div>
                  </td>
                )}
                <td className="px-4 py-3 text-gray-700">{app.product.name}</td>
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
            {page > 1 && <Link href={`?status=${status}&page=${page-1}`} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">← Prev</Link>}
            {page < totalPages && <Link href={`?status=${status}&page=${page+1}`} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
