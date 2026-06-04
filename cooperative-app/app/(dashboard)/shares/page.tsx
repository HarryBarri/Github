import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatNGN } from "@/lib/utils";

export default async function SharesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const memberId = session.user.memberId;
  const isOfficer = ["treasurer","president","superadmin","loan_officer","secretary"].includes(role);

  if (isOfficer) {
    const [shares, totalTx] = await Promise.all([
      prisma.shareCapital.findMany({
        orderBy: { createdAt: "desc" },
        include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
      }),
      prisma.shareTransaction.findMany({ orderBy: { transactionDate: "desc" }, take: 20,
        include: { member: { select: { firstName: true, lastName: true } } } }),
    ]);

    const totalShares = shares.reduce((s, sc) => s + sc.sharesOwned, 0);
    const shareValue = await prisma.cooperativeSetting.findUnique({ where: { key: "share_value_kobo" } });
    const shareValueKobo = shareValue ? BigInt(shareValue.value) : 10000n;
    const totalCapital = BigInt(totalShares) * shareValueKobo;

    return (
      <div>
        <PageHeader title="Share Capital" description={`${totalShares.toLocaleString()} total shares · ${formatNGN(totalCapital)} total capital`} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Member Shareholding</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50"><tr>
                  {["Member","Shares","Value"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {shares.map(sc => (
                    <tr key={sc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{sc.member.firstName} {sc.member.lastName}</p>
                        <p className="text-xs text-gray-400">{sc.member.memberNumber}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{sc.sharesOwned.toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-700">{formatNGN(BigInt(sc.sharesOwned) * shareValueKobo)}</td>
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
              {totalTx.map(tx => (
                <div key={tx.id} className="px-4 py-3 flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{tx.member.firstName} {tx.member.lastName}</p>
                    <p className="text-xs text-gray-400 capitalize">{tx.transactionType.replace(/_/g," ")} · {new Date(tx.transactionDate).toLocaleDateString("en-NG")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{tx.sharesQuantity > 0 ? "+" : ""}{tx.sharesQuantity} shares</p>
                    <p className="text-xs text-gray-500">{formatNGN(tx.totalAmountKobo)}</p>
                  </div>
                </div>
              ))}
              {totalTx.length === 0 && <p className="px-4 py-6 text-center text-gray-400 text-sm">No transactions.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Member view
  const myShares = memberId ? await prisma.shareCapital.findMany({
    where: { memberId }, include: { member: { select: { firstName: true, lastName: true } } },
  }) : [];

  const totalMyShares = myShares.reduce((s, sc) => s + sc.sharesOwned, 0);

  return (
    <div>
      <PageHeader title="My Shares" />
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Total Shares Owned</p>
        <p className="text-4xl font-bold text-gray-800 mt-1">{totalMyShares.toLocaleString()}</p>
        {myShares.length === 0 && <p className="text-sm text-gray-400 mt-4">No share capital records found.</p>}
      </div>
    </div>
  );
}
