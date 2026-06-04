"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSession } from "@/lib/auth-local";
import { localDb, type LocalMember } from "@/lib/local-db";
import { formatNGN } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

export default function MembersPage() {
  const session = getSession();
  const role = session?.role ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const [members, setMembers] = useState<(LocalMember & { savingsBalance?: number })[]>([]);
  const [total, setTotal] = useState(0);

  const canCreate = ["treasurer", "secretary", "president", "superadmin"].includes(role);

  const load = useCallback(() => {
    localDb.init();
    const { items, total: t } = localDb.members.findManyFiltered({ search, status, page, limit });
    const accounts = localDb.savingsAccounts.all();
    const enriched = items.map((m) => {
      const acc = accounts.find((a) => a.memberId === m.id);
      return { ...m, savingsBalance: acc?.balanceKobo };
    });
    setMembers(enriched);
    setTotal(t);
  }, [search, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s = fd.get("search") as string;
    const st = fd.get("status") as string;
    router.push(`?search=${encodeURIComponent(s)}&status=${encodeURIComponent(st)}&page=1`);
  }

  return (
    <div>
      <PageHeader
        title="Members"
        description={`${total} member${total !== 1 ? "s" : ""} registered`}
        action={
          canCreate ? (
            <Link
              href="/dashboard/members/new"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
            >
              + Add Member
            </Link>
          ) : undefined
        }
      />

      <form onSubmit={handleSearch} className="flex gap-3 mb-5 flex-wrap">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search name, ID, phone…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          name="status"
          defaultValue={status}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="exited">Exited</option>
        </select>
        <button type="submit" className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800">
          Search
        </button>
        {(search || status) && (
          <Link href="/dashboard/members" className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 text-gray-600">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Member ID", "Name", "Phone", "Status", "Savings Balance", "Joined", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No members found.</td></tr>
            ) : members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.memberNumber}</td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {m.firstName} {m.lastName}
                  {m.email && <div className="text-xs text-gray-400 font-normal">{m.email}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">{m.phone}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 text-gray-700">
                  {m.savingsBalance != null ? formatNGN(m.savingsBalance) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {m.membershipDate ? new Date(m.membershipDate).toLocaleDateString("en-NG") : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/members/${m.id}`} className="text-green-600 hover:underline text-xs">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`?search=${search}&status=${status}&page=${page - 1}`}
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`?search=${search}&status=${status}&page=${page + 1}`}
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
