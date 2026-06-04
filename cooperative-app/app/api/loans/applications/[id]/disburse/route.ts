import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { loanDisbursementSchema } from "@/lib/validations/loan";
import { calculateFlatRate, calculateReducingBalance } from "@/lib/financial/loan-calculator";
import { NextRequest } from "next/server";
import { addMonths } from "date-fns";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["treasurer", "president", "superadmin"].includes(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = loanDisbursementSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const application = await prisma.loanApplication.findUnique({
    where: { id },
    include: { product: true },
  });

  if (!application) return Response.json({ error: "Not found" }, { status: 404 });
  if (application.status !== "approved") {
    return Response.json({ error: "Application must be approved before disbursement" }, { status: 400 });
  }

  const principalKobo = application.approvedAmountKobo!;
  const product = application.product;
  const disbursementDate = new Date();
  const maturityDate = addMonths(disbursementDate, application.tenureMonths);

  const calc =
    product.interestType === "flat"
      ? calculateFlatRate(
          principalKobo,
          Number(product.interestRatePct),
          application.tenureMonths,
          disbursementDate,
          Number(product.processingFeePct),
          Number(product.insuranceFeePct)
        )
      : calculateReducingBalance(
          principalKobo,
          Number(product.interestRatePct),
          application.tenureMonths,
          disbursementDate,
          Number(product.processingFeePct),
          Number(product.insuranceFeePct)
        );

  const loan = await prisma.$transaction(async (tx) => {
    // Update application status
    await tx.loanApplication.update({
      where: { id },
      data: {
        status: "disbursed",
        disbursedAt: disbursementDate,
        disbursedBy: session.user.id,
        disbursementMethod: parsed.data.disbursementMethod as never,
        disbursementRef: parsed.data.disbursementRef,
      },
    });

    // Create loan ledger
    const newLoan = await tx.loan.create({
      data: {
        loanApplicationId: id,
        memberId: application.memberId,
        principalKobo: calc.principalKobo,
        interestKobo: calc.interestKobo,
        processingFeeKobo: calc.processingFeeKobo,
        insuranceFeeKobo: calc.insuranceFeeKobo,
        totalPayableKobo: calc.totalPayableKobo,
        disbursementDate,
        maturityDate,
      },
    });

    // Create repayment schedule
    await tx.loanRepaymentSchedule.createMany({
      data: calc.schedule.map((s) => ({
        loanId: newLoan.id,
        installmentNumber: s.installmentNumber,
        dueDate: s.dueDate,
        principalDueKobo: s.principalDueKobo,
        interestDueKobo: s.interestDueKobo,
        totalDueKobo: s.totalDueKobo,
      })),
    });

    // Deduct processing fee from savings if applicable
    if (calc.processingFeeKobo > 0n) {
      const savingsAccount = await tx.savingsAccount.findUnique({
        where: { memberId: application.memberId },
      });
      if (savingsAccount && savingsAccount.balanceKobo >= calc.processingFeeKobo) {
        const newBalance = savingsAccount.balanceKobo - calc.processingFeeKobo;
        await tx.savingsAccount.update({
          where: { id: savingsAccount.id },
          data: { balanceKobo: newBalance },
        });
        await tx.savingsTransaction.create({
          data: {
            accountId: savingsAccount.id,
            transactionType: "loan_deduction",
            amountKobo: calc.processingFeeKobo,
            direction: "debit",
            balanceAfterKobo: newBalance,
            referenceNumber: `FEE-${newLoan.id.slice(0, 8).toUpperCase()}`,
            description: `Processing fee for loan ${id.slice(0, 8)}`,
            processedBy: session.user.id,
            transactionDate: disbursementDate,
          },
        });
      }
    }

    return newLoan;
  });

  await logAction({
    userId: session.user.id,
    action: "LOAN_DISBURSED",
    entityType: "loan",
    entityId: loan.id,
    newValues: {
      principalKobo: String(calc.principalKobo),
      totalPayableKobo: String(calc.totalPayableKobo),
    },
  });

  return Response.json({ loan }, { status: 201 });
}
