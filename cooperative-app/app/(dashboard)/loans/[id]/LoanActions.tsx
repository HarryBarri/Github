"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea, Select } from "@/components/shared/FormField";

interface Props {
  application: { id: string; status: string };
  role: string;
}

export function LoanActions({ application, role }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [disbMethod, setDisbMethod] = useState("bank_transfer");
  const [disbRef, setDisbRef] = useState("");

  async function action(endpoint: string, body: Record<string, unknown>) {
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/loans/applications/${application.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  const { status } = application;
  const canApprove = ["treasurer","president","superadmin"].includes(role);
  const canReview = ["loan_officer","treasurer","president","superadmin"].includes(role);
  const canDisburse = ["treasurer","president","superadmin"].includes(role);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-700">Actions</h3>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Review */}
      {(status === "submitted") && canReview && (
        <Button onClick={() => action("review", {})} disabled={loading} className="w-full">
          Mark as Under Review
        </Button>
      )}

      {/* Approve */}
      {(status === "under_review" || status === "submitted") && canApprove && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Approved Amount (₦)</label>
          <input type="number" value={approveAmount} onChange={e => setApproveAmount(e.target.value)}
            placeholder="Leave blank to approve as requested"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Approval notes (optional)" rows={2} />
          <Button onClick={() => action("approve", {
            approvedAmountKobo: approveAmount ? Math.round(parseFloat(approveAmount) * 100) : undefined,
            approvalNotes: notes,
          })} disabled={loading} className="w-full">
            ✓ Approve
          </Button>
        </div>
      )}

      {/* Reject */}
      {["submitted","under_review","approved"].includes(status) && canReview && (
        <div className="space-y-2">
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection…" rows={2} />
          <Button variant="danger" onClick={() => action("reject", { rejectionReason: rejectReason })} disabled={loading || !rejectReason} className="w-full">
            ✗ Reject
          </Button>
        </div>
      )}

      {/* Disburse */}
      {status === "approved" && canDisburse && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Disbursement Method</label>
          <Select value={disbMethod} onChange={e => setDisbMethod(e.target.value)}>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
          </Select>
          <input value={disbRef} onChange={e => setDisbRef(e.target.value)} placeholder="Transaction reference (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <Button onClick={() => action("disburse", { disbursementMethod: disbMethod, disbursementRef: disbRef })} disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            💸 Disburse Loan
          </Button>
        </div>
      )}

      {/* Record repayment */}
      {status === "disbursed" && canDisburse && (
        <RepaymentForm applicationId={application.id} />
      )}
    </div>
  );
}

function RepaymentForm({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true); setError("");
    // First get the loan id from the application
    try {
      const appR = await fetch(`/api/loans/applications/${applicationId}`);
      const appD = await appR.json();
      const loanId = appD.loan?.id;
      if (!loanId) throw new Error("Loan not found");
      const r = await fetch(`/api/loans/${loanId}/repayments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKobo: Math.round(parseFloat(amount) * 100), paymentMethod: method, paymentDate: date }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setAmount(""); router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold text-gray-600">Record Repayment</p>
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₦)"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      <Select value={method} onChange={e => setMethod(e.target.value)}>
        <option value="cash">Cash</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="salary_deduction">Salary Deduction</option>
        <option value="savings_deduction">Savings Deduction</option>
      </Select>
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <Button onClick={submit} disabled={loading || !amount} className="w-full">
        {loading ? "Processing…" : "Record Payment"}
      </Button>
    </div>
  );
}
