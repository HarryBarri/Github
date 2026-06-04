"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession } from "@/lib/auth-local";
import { localDb, type LocalLevy, type LocalLevyAssignment, type LocalLevyPayment } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

type AssignWithPayments = LocalLevyAssignment & {
  memberName: string;
  memberNumber: string;
  payments: LocalLevyPayment[];
};

export default function LevyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = getSession();
  const role = session?.role ?? "";

  const [levy, setLevy] = useState<LocalLevy | null>(null);
  const [assignments, setAssignments] = useState<AssignWithPayments[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!["treasurer", "president", "superadmin", "secretary"].includes(role)) {
      router.replace("/dashboard");
      return;
    }
    localDb.init();
    const l = localDb.levies.findUnique(id);
    if (!l) { setNotFound(true); return; }
    setLevy(l);

    const allAssigns = localDb.levyAssignments.findMany({ levyId: id } as never)
      .sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""));
    const allPayments = localDb.levyPayments.all();
    const members = localDb.members.all();

    setAssignments(allAssigns.map(a => {
      const m = members.find(mm => mm.id === a.memberId);
      const payments = allPayments.filter(p => p.assignmentId === a.id);
      return { ...a, memberName: m ? `${m.firstName} ${m.lastName}` : "Unknown", memberNumber: m?.memberNumber ?? "", payments };
    }));
  }, [id, role, router]);

  if (notFound) return <div className="text-gray-500 p-6">Levy not found.</div>;
  if (!levy) return <div className="p-6 text-gray-400">Loading…</div>;

  const totalCollected = assignments.reduce((s, a) => s + a.payments.reduce((ps, p) => ps + p.amountKobo, 0), 0);

  return (
    <div>
      <div className="mb-4"><Link href="/dashboard/levies" className="text-sm text-gray-500 hover:text-gray-700">← Levies</Link></div>
      <PageHeader title={levy.name} action={<StatusBadge status={levy.isActive ? "active" : "inactive"} />} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Amount", value: formatNGN(levy.amountKobo) },
          { label: "Type", value: levy.levyType },
          { label: "Applies To", value: levy.appliesTo.replace("_", " ") },
          { label: "Collected", value: formatNGN(totalCollected) },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase">{k.label}</p>
            <p className="text-lg font-semibold text-gray-800 mt-1 capitalize">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Assignments ({assignments.length})</h3>
        {assignments.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No assignments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50"><tr>
                {["Member", "Amount Due", "Amount Paid", "Balance", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map(a => {
                  const paid = a.payments.reduce((s, p) => s + p.amountKobo, 0);
                  const balance = a.amountDueKobo - paid;
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {a.memberName}
                        <div className="text-xs text-gray-400">{a.memberNumber}</div>
                      </td>
                      <td className="px-4 py-3">{formatNGN(a.amountDueKobo)}</td>
                      <td className="px-4 py-3 text-green-700">{formatNGN(paid)}</td>
                      <td className="px-4 py-3 text-red-600">{formatNGN(balance)}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
