"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormField, Input, Select, Button } from "@/components/shared/FormField";
import { localDb } from "@/lib/local-db";

export default function NewLevyPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", amountNaira: "", levyType: "fixed", appliesTo: "all_members", dueDate: "", penaltyRatePct: "0" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function submit() {
    setLoading(true); setError("");
    try {
      localDb.levies.createLevy({
        name: form.name,
        description: form.description || undefined,
        amountKobo: Math.round(parseFloat(form.amountNaira) * 100),
        levyType: form.levyType,
        appliesTo: form.appliesTo,
        dueDate: form.dueDate || undefined,
        penaltyRatePct: parseFloat(form.penaltyRatePct),
      });
      router.push("/dashboard/levies");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Create Levy" />
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <FormField label="Levy Name" required>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Development Levy 2025" />
        </FormField>
        <FormField label="Description">
          <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount (₦)" required>
            <Input type="number" step="100" value={form.amountNaira} onChange={e => setForm(f => ({ ...f, amountNaira: e.target.value }))} placeholder="5000" />
          </FormField>
          <FormField label="Levy Type">
            <Select value={form.levyType} onChange={e => setForm(f => ({ ...f, levyType: e.target.value }))}>
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Applies To">
          <Select value={form.appliesTo} onChange={e => setForm(f => ({ ...f, appliesTo: e.target.value }))}>
            <option value="all_members">All Members</option>
            <option value="active_members">Active Members Only</option>
            <option value="custom">Custom Selection</option>
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Due Date">
            <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </FormField>
          <FormField label="Late Penalty (%)">
            <Input type="number" step="0.5" value={form.penaltyRatePct} onChange={e => setForm(f => ({ ...f, penaltyRatePct: e.target.value }))} />
          </FormField>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !form.name || !form.amountNaira}>{loading ? "Saving…" : "Create Levy"}</Button>
        </div>
      </div>
    </div>
  );
}
