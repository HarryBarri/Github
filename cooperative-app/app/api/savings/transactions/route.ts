import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { depositSchema, withdrawalSchema } from "@/lib/validations/savings";
import { generateReferenceNumber } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));

  if (!accountId) {
    return Response.json({ error: "accountId required" }, { status: 400 });
  }

  // Verify access: member can only see own account
  const role = session.user.role;
  const isOfficer = ["treasurer", "secretary", "loan_officer", "president", "superadmin"].includes(role);

  if (!isOfficer) {
    const account = await prisma.savingsAccount.findUnique({
      where: { id: accountId },
      select: { memberId: true },
    });
    if (!account || account.memberId !== session.user.memberId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.savingsTransaction.findMany({
      where: { accountId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { transactionDate: "desc" },
    }),
    prisma.savingsTransaction.count({ where: { accountId } }),
  ]);

  return Response.json({ transactions, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["treasurer", "president", "superadmin"].includes(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const isWithdrawal = body.type === "withdrawal";
  const parsed = isWithdrawal
    ? withdrawalSchema.safeParse(body)
    : depositSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const amountKobo = BigInt(data.amountKobo);

  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.savingsAccount.findUnique({
      where: { id: data.accountId },
      select: { id: true, balanceKobo: true, status: true },
    });

    if (!account) throw new Error("Account not found");
    if (account.status !== "active") throw new Error("Account is not active");

    if (isWithdrawal && account.balanceKobo < amountKobo) {
      throw new Error(
        `Insufficient balance. Available: ${account.balanceKobo} kobo`
      );
    }

    const newBalance = isWithdrawal
      ? account.balanceKobo - amountKobo
      : account.balanceKobo + amountKobo;

    await tx.savingsAccount.update({
      where: { id: data.accountId },
      data: { balanceKobo: newBalance },
    });

    const txn = await tx.savingsTransaction.create({
      data: {
        accountId: data.accountId,
        transactionType: isWithdrawal ? "withdrawal" : "deposit",
        amountKobo,
        direction: isWithdrawal ? "debit" : "credit",
        balanceAfterKobo: newBalance,
        referenceNumber: generateReferenceNumber(isWithdrawal ? "WTH" : "DEP"),
        description: (data as { description?: string }).description,
        paymentMethod: data.paymentMethod as never,
        transactionDate: new Date(data.transactionDate),
        processedBy: session.user.id,
      },
    });

    return txn;
  });

  await logAction({
    userId: session.user.id,
    action: isWithdrawal ? "SAVINGS_WITHDRAWAL" : "SAVINGS_DEPOSIT",
    entityType: "savings_transaction",
    entityId: result.id,
    newValues: { amountKobo: String(amountKobo), accountId: data.accountId },
  });

  return Response.json({ transaction: result }, { status: 201 });
}
