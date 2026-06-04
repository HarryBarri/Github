"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormField, Input, Select, Textarea, Button } from "@/components/shared/FormField";
import { calculateFlatRate, calculateReducingBalance } from "@/lib/financial/loan-calculator";

interface Product {
  id: string; name: string; description: string | null;
  minAmountKobo: string; maxAmountKobo: string;
  interestRatePct: string; interestType: string;
  maxTenureMonths: number; minTenureMonths: number;
  processingFeePct: string; guarantorsRequired: number;
}

export default function LoanApplyPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ loanProductId: "", requestedAmountNaira: "", tenureMonths: "", purpose: "" });
  const [preview, setPreview] = useState<{ monthly: string; total: string; interest: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/loans/products").then(r => r.json()).then(d => setProducts(d.products ?? []));
  }, []);

  const selectedProduct = products.find(p => p.id === form.loanProductId);

  useEffect(() => {
    if (!selectedProduct || !form.requestedAmountNaira || !form.tenureMonths) {
      setPreview(null); return;
    }
    const amountKobo = BigInt(Math.round(parseFloat(form.requestedAmountNaira) * 100));
    const tenure = parseInt(form.tenureMonths);
    if (!amountKobo || !tenure) return;
    try {
      const calc = selectedProduct.interestType === "flat"
        ? calculateFlatRate(amountKobo, parseFloat(selectedProduct.interestRatePct), tenure, new Date(), parseFloat(selectedProduct.processingFeePct))
        : calculateReducingBalance(amountKobo, parseFloat(selectedProduct.interestRatePct), tenure, new Date(), parseFloat(selectedProduct.processingFeePct));
      setPreview({
        monthly: (Number(calc.monthlyInstallmentKobo) / 100).toLocaleString("en-NG", { style: "currency", currency: "NGN" }),
        total: (Number(calc.totalPayableKobo) / 100).toLocaleString("en-NG", { style: "currency", currency: "NGN" }),
        interest: (Number(calc.interestKobo) / 100).toLocaleString("en-NG", { style: "currency", currency: "NGN" }),
      });
    } catch { setPreview(null); }
  }, [form.requestedAmountNaira, form.tenureMonths, selectedProduct]);

  async function submit() {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/loans/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanProductId: form.loanProductId,
          requestedAmountKobo: Math.round(parseFloat(form.requestedAmountNaira) * 100),
          tenureMonths: parseInt(form.tenureMonths),
          purpose: form.purpose,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.formErrors?.[0] ?? d.error ?? "Submission failed");
      router.push(`/dashboard/loans/${d.application.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error occurred");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Apply for a Loan" description="Complete the form below to submit your loan application." />

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <FormField label="Loan Product" required>
          <Select value={form.loanProductId} onChange={e => setForm(f => ({...f, loanProductId: e.target.value}))}>
            <option value="">Select a loan product…</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          {selectedProduct && (
            <div className="mt-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-800 space-y-1">
              <p>{selectedProduct.description}</p>
              <p>Range: ₦{(Number(selectedProduct.minAmountKobo)/100).toLocaleString()} – ₦{(Number(selectedProduct.maxAmountKobo)/100).toLocaleString()}</p>
              <p>Rate: {selectedProduct.interestRatePct}% per annum ({selectedProduct.interestType.replace("_"," ")})</p>
              <p>Tenure: {selectedProduct.minTenureMonths}–{selectedProduct.maxTenureMonths} months · Guarantors required: {selectedProduct.guarantorsRequired}</p>
            </div>
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount Requested (₦)" required>
            <Input type="number" step="1000" min="0"
              value={form.requestedAmountNaira}
              onChange={e => setForm(f => ({...f, requestedAmountNaira: e.target.value}))}
              placeholder="50000"
            />
          </FormField>
          <FormField label="Tenure (months)" required>
            <Input type="number" min="1"
              value={form.tenureMonths}
              onChange={e => setForm(f => ({...f, tenureMonths: e.target.value}))}
              placeholder={selectedProduct ? String(selectedProduct.maxTenureMonths) : "12"}
            />
          </FormField>
        </div>

        {/* Repayment preview */}
        {preview && (
          <div className="bg-green-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-gray-500">Monthly Payment</p>
              <p className="text-lg font-bold text-green-700">{preview.monthly}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Interest</p>
              <p className="text-lg font-bold text-orange-600">{preview.interest}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Repayable</p>
              <p className="text-lg font-bold text-gray-800">{preview.total}</p>
            </div>
          </div>
        )}

        <FormField label="Purpose of Loan" required>
          <Textarea
            value={form.purpose}
            onChange={e => setForm(f => ({...f, purpose: e.target.value}))}
            placeholder="Describe what the loan will be used for (minimum 10 characters)…"
            rows={3}
          />
        </FormField>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !form.loanProductId || !form.requestedAmountNaira || !form.tenureMonths || !form.purpose}>
            {loading ? "Submitting…" : "Submit Application"}
          </Button>
        </div>
      </div>
    </div>
  );
}
