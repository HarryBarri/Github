import { z } from "zod";

export const depositSchema = z.object({
  accountId: z.string().uuid(),
  amountKobo: z.number().int().positive(),
  paymentMethod: z.enum([
    "cash",
    "bank_transfer",
    "standing_order",
    "mobile_money",
    "salary_deduction",
  ]),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).optional(),
  paymentProofUrl: z.string().url().optional(),
});

export const withdrawalSchema = z.object({
  accountId: z.string().uuid(),
  amountKobo: z.number().int().positive(),
  paymentMethod: z.enum(["cash", "bank_transfer"]),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).optional(),
});

export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
