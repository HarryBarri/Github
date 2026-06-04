"use client";

import { useState } from "react";
import { localDb } from "@/lib/local-db";
import { calculateFlatRate, calculateReducingBalance } from "@/lib/financial/loan-calculator";
import { Button, Textarea, Select } from "@/components/shared/FormField";

interface Props {
  application: { id: string; status: string };
  role: string;
  onRefresh: () => void;
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function LoanActions({ application, role, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [disbMethod, setDisbMethod] = useState("bank_transfer");
  const [disbRef, setDisbRef] = useState("");

  function doAction(fn: () => void) {
    setLoading(true); setError("");
    try {
      fn();
      onRefresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  function markReview() {
    doAction(() => {
      localDb.loanApplications.update(application.id, { status: "under_review", updatedAt: new Date().toISOString() });
    });
  }

  function approve() {
    doAction(() => {
      const approved = approveAmount ? Math.round(parseFloat(approveAmount) * 100) : undefined;
      localDb.loanApplications.update(application.id, {
        status: "approved",
        approvedAmountKobo: approved,
        approvalNotes: notes || undefined,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  function reject() {
    doAction(() => {
      localDb.loanApplications.update(application.id, {
        status: "rejected",
        rejectionReason: rejectReason,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  function disburse() {
    doAction(() => {
      const app = localDb.loanApplications.findUnique(application.id);
      if (!app) throw new Error("Application not found");
      const product = localDb.loanProducts.findUnique(app.loanProductId);
      if (!product) throw new Error("Product not found");

      const principal = BigInt(app.approvedAmountKobo ?? app.requestedAmountKobo);
      const calc = product.interestType === "flat"
        ? calculateFlatRate(principal, product.interestRatePct, app.tenureMonths, new Date(), product.processingFeePct)
        : calculateReducingBalance(principal, product.interestRatePct, app.tenureMonths, new Date(), product.processingFeePct);

      const disbDate = new Date();
      const maturityDate = new Date(disbDate);
      maturityDate.setMonth(maturityDate.getMonth() + app.tenureMonths);

      const loanId = uid();
      const loan = {
        id: loanId,
        applicationId: app.id,
        memberId: app.memberId,
        principalKobo: Number(calc.principalKobo),
        interestKobo: Number(calc.interestKobo),
        processingFeeKobo: Number(calc.processingFeeKobo),
        totalPayableKobo: Number(calc.totalPayableKobo),
        amountPaidKobo: 0,
        disbursementDate: disbDate.toISOString(),
        maturityDate: maturityDate.toISOString(),
        disbursementMethod: disbMethod,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      localDb.loans.create(loan);

      // Create schedule
      calc.schedule.forEach(s => {
        localDb.loanSchedule.create({
          id: uid(),
          loanId,
          installmentNumber: s.installmentNumber,
          dueDate: s.dueDate.toISOString(),
          principalDueKobo: Number(s.principalDueKobo),
          interestDueKobo: Number(s.interestDueKobo),
          totalDueKobo: Number(s.totalDueKobo),
          amountPaidKobo: 0,
          isPaid: false,
        });
      });

      localDb.loanApplications.update(application.id, {
        status: "disbursed",
        updatedAt: new Date().toISOString(),
      });
    });
  }

  const { status } = application;
  const canApprove = ["treasurer", "president", "superadmin"].includes(role);
  const canReview = ["loan_officer", "treasurer", "president", "superadmin"].includes(role);
  const canDisburse = ["treasurer", "president", "superadmin"].includes(role);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-700">Actions</h3>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {status === "submitted" && canReview && (
        <Button onClick={markReview} disabled={loading} className="w-full">
          Mark as Under Review
        </Button>
      )}

      {(status === "under_review" || status === "submitted") && canApprove && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Approved Amount (₦)</label>
          <input type="number" value={approveAmount} onChange={e => setApproveAmount(e.target.value)}
            placeholder="Leave blank to approve as requested"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Approval notes (optional)" rows={2} />
          <Button onClick={approve} disabled={loading} className="w-full">
            ✓ Approve
          </Button>
        </div>
      )}

      {["submitted", "under_review", "approved"].includes(status) && canReview && (
        <div className="space-y-2">
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection…" rows={2} />
          <Button variant="danger" onClick={reject} disabled={loading || !rejectReason} className="w-full">
            ✗ Reject
          </Button>
        </div>
      )}

      {status === "approved" && canDisburse && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Disbursement Method</label>
          <Select value={disbMethod} onChange={e => setDisbMethod(e.target.value)}>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
          </Select>
          <input value={disbRef} onChange={e => setDisbRef(e.target.value)} placeholder="Transaction reference (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <Button onClick={disburse} disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            💸 Disburse Loan
          </Button>
        </div>
      )}

      {status === "disbursed" && canDisburse && (
        <RepaymentForm applicationId={application.id} onRefresh={onRefresh} />
      )}
    </div>
  );
}

function RepaymentForm({ applicationId, onRefresh }: { applicationId: string; onRefresh: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function submit() {
    setLoading(true); setError("");
    try {
      const loan = localDb.loans.findFirst({ applicationId } as never);
      if (!loan) throw new Error("Loan not found");
      const amountKobo = Math.round(parseFloat(amount) * 100);

      // Record repayment
      const ref = `RPY-${Date.now().toString(36).toUpperCase()}`;
      localDb.repayments.create({
        id: uid(),
        loanId: loan.id,
        amountKobo,
        paymentMethod: method,
        paymentDate: date,
        referenceNumber: ref,
        createdAt: new Date().toISOString(),
      });

      // Update loan
      const newPaid = loan.amountPaidKobo + amountKobo;
      const isFullyPaid = newPaid >= loan.totalPayableKobo;
      localDb.loans.update(loan.id, {
        amountPaidKobo: newPaid,
        status: isFullyPaid ? "completed" : "active",
      });

      if (isFullyPaid) {
        localDb.loanApplications.update(applicationId, { status: "completed", updatedAt: new Date().toISOString() });
      }

      setAmount("");
      onRefresh();
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
