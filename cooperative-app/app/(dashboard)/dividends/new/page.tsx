"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormField, Input, Button } from "@/components/shared/FormField";
import { localDb } from "@/lib/local-db";

export default function NewDividendPage() {
  const router = useRouter();
  const [form, setForm] = useState({ financialYear: String(new Date().getFullYear()), totalProfitNaira: "", dividendFundNaira: "", declarationDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function submit() {
    setLoading(true); setError("");
    try {
      const dividend = localDb.dividends.create({
        id: crypto.randomUUID(),
        financialYear: parseInt(form.financialYear),
        totalProfitKobo: Math.round(parseFloat(form.totalProfitNaira) * 100),
        dividendFundKobo: Math.round(parseFloat(form.dividendFundNaira) * 100),
        declarationDate: form.declarationDate,
        status: "draft",
        notes: form.notes || undefined,
        createdAt: new Date().toISOString(),
      });
      router.push(`/dashboard/dividends/${dividend.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Declare Dividend" description="Record year-end profit sharing" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <FormField label="Financial Year" required>
          <Input type="number" value={form.financialYear} onChange={e => setForm(f => ({ ...f, financialYear: e.target.value }))} />
        </FormField>
        <FormField label="Total Net Profit (₦)" required>
          <Input type="number" step="1000" value={form.totalProfitNaira} onChange={e => setForm(f => ({ ...f, totalProfitNaira: e.target.value }))} placeholder="1000000" />
        </FormField>
        <FormField label="Dividend Fund (₦)" required>
          <Input type="number" step="1000" value={form.dividendFundNaira} onChange={e => setForm(f => ({ ...f, dividendFundNaira: e.target.value }))} placeholder="Amount allocated for dividends" />
        </FormField>
        <FormField label="Declaration Date" required>
          <Input type="date" value={form.declarationDate} onChange={e => setForm(f => ({ ...f, declarationDate: e.target.value }))} />
        </FormField>
        <FormField label="Notes">
          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
        </FormField>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>{loading ? "Saving…" : "Create Dividend"}</Button>
        </div>
      </div>
    </div>
  );
}
