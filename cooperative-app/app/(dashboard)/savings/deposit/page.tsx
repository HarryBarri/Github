"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormField, Input, Select, Button } from "@/components/shared/FormField";
import { localDb, type LocalMember, type LocalSavingsAccount } from "@/lib/local-db";

type MemberWithAccount = LocalMember & { savingsAccount: LocalSavingsAccount | null };

export default function DepositPage() {
  const router = useRouter();
  const [allMembers, setAllMembers] = useState<MemberWithAccount[]>([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<MemberWithAccount[]>([]);
  const [selected, setSelected] = useState<MemberWithAccount | null>(null);
  const [form, setForm] = useState({ amountNaira: "", paymentMethod: "cash", transactionDate: new Date().toISOString().slice(0, 10), description: "", type: "deposit" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    localDb.init();
    const members = localDb.members.all().filter(m => !m.deletedAt);
    const accounts = localDb.savingsAccounts.all();
    const enriched = members.map(m => ({
      ...m,
      savingsAccount: accounts.find(a => a.memberId === m.id) ?? null,
    }));
    setAllMembers(enriched);
  }, []);

  useEffect(() => {
    if (search.length < 2) { setFiltered([]); return; }
    const q = search.toLowerCase();
    setFiltered(allMembers.filter(m =>
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      m.memberNumber.toLowerCase().includes(q) ||
      m.phone.includes(q)
    ).slice(0, 10));
  }, [search, allMembers]);

  function submit() {
    if (!selected?.savingsAccount) return setError("Select a member with a savings account.");
    const amountKobo = Math.round(parseFloat(form.amountNaira) * 100);
    if (!amountKobo || amountKobo <= 0) return setError("Enter a valid amount.");
    setLoading(true); setError(""); setSuccess("");
    try {
      const txn = localDb.savingsTransactions.recordTransaction({
        accountId: selected.savingsAccount.id,
        type: form.type,
        amountKobo,
        paymentMethod: form.paymentMethod,
        transactionDate: form.transactionDate,
        description: form.description || undefined,
      });
      setSuccess(`${form.type === "deposit" ? "Deposit" : "Withdrawal"} recorded. Ref: ${txn.referenceNumber}`);
      setForm(f => ({ ...f, amountNaira: "", description: "" }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error occurred");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Record Savings Transaction" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          {["deposit", "withdrawal"].map(t => (
            <button key={t} type="button"
              onClick={() => setForm(f => ({ ...f, type: t }))}
              className={`flex-1 py-2 text-sm font-medium transition capitalize ${form.type === t ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              {t}
            </button>
          ))}
        </div>

        <FormField label="Search Member" required>
          <Input value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} placeholder="Type name, phone, or member ID…" />
          {filtered.length > 0 && !selected && (
            <div className="border border-gray-200 rounded-lg mt-1 shadow-sm max-h-40 overflow-y-auto">
              {filtered.map(m => (
                <button key={m.id} type="button" onClick={() => { setSelected(m); setSearch(`${m.firstName} ${m.lastName}`); setFiltered([]); }}
                  className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm">
                  <span className="font-medium">{m.firstName} {m.lastName}</span>
                  <span className="text-gray-400 ml-2 text-xs">{m.memberNumber}</span>
                  {m.savingsAccount && <span className="text-green-600 ml-2 text-xs">{m.savingsAccount.accountNumber}</span>}
                </button>
              ))}
            </div>
          )}
        </FormField>

        {selected?.savingsAccount && (
          <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800">
            Account: <strong>{selected.savingsAccount.accountNumber}</strong> · Balance: <strong>{(selected.savingsAccount.balanceKobo / 100).toLocaleString("en-NG", { style: "currency", currency: "NGN" })}</strong>
          </div>
        )}

        <FormField label="Amount (₦)" required>
          <Input type="number" step="0.01" min="0" value={form.amountNaira} onChange={e => setForm(f => ({ ...f, amountNaira: e.target.value }))} placeholder="5000.00" />
        </FormField>

        <FormField label="Payment Method" required>
          <Select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="standing_order">Standing Order</option>
            {form.type !== "withdrawal" && <option value="salary_deduction">Salary Deduction</option>}
          </Select>
        </FormField>

        <FormField label="Transaction Date" required>
          <Input type="date" value={form.transactionDate} onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))} />
        </FormField>

        <FormField label="Description">
          <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional note" />
        </FormField>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm font-medium">{success}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Processing…" : "Record Transaction"}</Button>
        </div>
      </div>
    </div>
  );
}
