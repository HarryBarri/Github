import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { loanRepaymentSchema } from "@/lib/validations/loan";
import { generateReferenceNumber } from "@/lib/utils";
import { NextRequest } from "next/server";

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

  const { id: loanId } = await params;
  const body = await req.json();
  const parsed = loanRepaymentSchema.safeParse({ ...body, loanId });
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const amountKobo = BigInt(parsed.data.amountKobo);

  const repayment = await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      select: { id: true, amountPaidKobo: true, totalPayableKobo: true, status: true, memberId: true },
    });

    if (!loan) throw new Error("Loan not found");
    if (loan.status !== "active") throw new Error("Loan is not active");

    const outstanding = loan.totalPayableKobo - loan.amountPaidKobo;
    const actualAmount = amountKobo > outstanding ? outstanding : amountKobo;
    const newPaid = loan.amountPaidKobo + actualAmount;
    const isCompleted = newPaid >= loan.totalPayableKobo;

    await tx.loan.update({
      where: { id: loanId },
      data: {
        amountPaidKobo: newPaid,
        status: isCompleted ? "completed" : "active",
      },
    });

    // Mark schedule items as paid
    if (parsed.data.scheduleId) {
      await tx.loanRepaymentSchedule.update({
        where: { id: parsed.data.scheduleId },
        data: {
          amountPaidKobo: { increment: actualAmount },
          isPaid: true,
          paidAt: new Date(),
        },
      });
    }

    return tx.loanRepayment.create({
      data: {
        loanId,
        scheduleId: parsed.data.scheduleId,
        amountKobo: actualAmount,
        paymentDate: new Date(parsed.data.paymentDate),
        paymentMethod: parsed.data.paymentMethod as never,
        referenceNumber: generateReferenceNumber("RPY"),
        processedBy: session.user.id,
        notes: parsed.data.notes,
      },
    });
  });

  await logAction({
    userId: session.user.id,
    action: "LOAN_REPAYMENT_RECORDED",
    entityType: "loan_repayment",
    entityId: repayment.id,
    newValues: { loanId, amountKobo: String(amountKobo) },
  });

  return Response.json({ repayment }, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: loanId } = await params;

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { memberId: true },
  });
  if (!loan) return Response.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  const isOfficer = ["loan_officer", "treasurer", "secretary", "president", "superadmin"].includes(role);
  if (!isOfficer && loan.memberId !== session.user.memberId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [repayments, schedule] = await Promise.all([
    prisma.loanRepayment.findMany({
      where: { loanId },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.loanRepaymentSchedule.findMany({
      where: { loanId },
      orderBy: { installmentNumber: "asc" },
    }),
  ]);

  return Response.json({ repayments, schedule });
}
