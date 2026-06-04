import { z } from "zod";

export const createLoanProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  minAmountKobo: z.number().int().positive(),
  maxAmountKobo: z.number().int().positive(),
  interestRatePct: z.number().positive().max(100),
  interestType: z.enum(["flat", "reducing_balance"]),
  maxTenureMonths: z.number().int().positive().max(360),
  minTenureMonths: z.number().int().min(1).default(1),
  processingFeePct: z.number().min(0).max(20).default(0),
  insuranceFeePct: z.number().min(0).max(20).default(0),
  guarantorsRequired: z.number().int().min(0).max(5).default(2),
  collateralRequired: z.boolean().default(false),
  minMembershipMonths: z.number().int().min(0).default(6),
  savingsMultiplier: z.number().positive().default(2.0),
});

export const loanApplicationSchema = z.object({
  loanProductId: z.string().uuid(),
  requestedAmountKobo: z.number().int().positive(),
  tenureMonths: z.number().int().positive(),
  purpose: z.string().min(10).max(1000),
  guarantorMemberIds: z.array(z.string().uuid()).optional(),
});

export const loanApprovalSchema = z.object({
  approvedAmountKobo: z.number().int().positive(),
  approvalNotes: z.string().max(1000).optional(),
});

export const loanRejectionSchema = z.object({
  rejectionReason: z.string().min(10).max(1000),
});

export const loanDisbursementSchema = z.object({
  disbursementMethod: z.enum(["cash", "bank_transfer"]),
  disbursementRef: z.string().max(100).optional(),
});

export const loanRepaymentSchema = z.object({
  loanId: z.string().uuid(),
  scheduleId: z.string().uuid().optional(),
  amountKobo: z.number().int().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum([
    "cash",
    "bank_transfer",
    "salary_deduction",
    "savings_deduction",
  ]),
  notes: z.string().max(500).optional(),
});

export type CreateLoanProductInput = z.infer<typeof createLoanProductSchema>;
export type LoanApplicationInput = z.infer<typeof loanApplicationSchema>;
export type LoanApprovalInput = z.infer<typeof loanApprovalSchema>;
export type LoanRejectionInput = z.infer<typeof loanRejectionSchema>;
export type LoanDisbursementInput = z.infer<typeof loanDisbursementSchema>;
export type LoanRepaymentInput = z.infer<typeof loanRepaymentSchema>;
