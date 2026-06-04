import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { loanApplicationSchema } from "@/lib/validations/loan";
import { NextRequest } from "next/server";
import { differenceInMonths } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const status = searchParams.get("status") ?? undefined;
  const role = session.user.role;
  const isOfficer = ["loan_officer", "treasurer", "secretary", "president", "superadmin"].includes(role);

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(!isOfficer ? { memberId: session.user.memberId } : {}),
  };

  const [applications, total] = await Promise.all([
    prisma.loanApplication.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        member: { select: { firstName: true, lastName: true, memberNumber: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.loanApplication.count({ where }),
  ]);

  return Response.json({ applications, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = session.user.memberId;
  if (!memberId) {
    return Response.json({ error: "No member profile linked" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = loanApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Eligibility checks
  const [member, product, existingActiveLoan, savingsAccount] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId } }),
    prisma.loanProduct.findUnique({ where: { id: data.loanProductId } }),
    prisma.loan.findFirst({ where: { memberId, status: "active" } }),
    prisma.savingsAccount.findUnique({ where: { memberId } }),
  ]);

  if (!member || member.status !== "active") {
    return Response.json({ error: "Member account is not active" }, { status: 400 });
  }
  if (!product || !product.isActive) {
    return Response.json({ error: "Loan product not available" }, { status: 400 });
  }
  if (existingActiveLoan) {
    return Response.json({ error: "You have an existing active loan" }, { status: 400 });
  }

  // Check membership duration
  if (member.membershipDate) {
    const monthsAsMember = differenceInMonths(new Date(), member.membershipDate);
    if (monthsAsMember < product.minMembershipMonths) {
      return Response.json(
        { error: `Must be a member for at least ${product.minMembershipMonths} months` },
        { status: 400 }
      );
    }
  }

  // Check savings multiplier limit
  const savingsBalance = savingsAccount?.balanceKobo ?? 0n;
  const maxLoan = BigInt(
    Math.floor(Number(savingsBalance) * Number(product.savingsMultiplier))
  );
  if (BigInt(data.requestedAmountKobo) > maxLoan) {
    return Response.json(
      { error: `Maximum loan amount is ${maxLoan} kobo based on your savings` },
      { status: 400 }
    );
  }

  // Check product limits
  const requestedKobo = BigInt(data.requestedAmountKobo);
  if (requestedKobo < product.minAmountKobo || requestedKobo > product.maxAmountKobo) {
    return Response.json({ error: "Requested amount outside product limits" }, { status: 400 });
  }

  const count = await prisma.loanApplication.count();
  const year = new Date().getFullYear();
  const applicationNumber = `LOAN-${year}-${String(count + 1).padStart(5, "0")}`;

  const application = await prisma.$transaction(async (tx) => {
    const app = await tx.loanApplication.create({
      data: {
        applicationNumber,
        memberId,
        loanProductId: data.loanProductId,
        requestedAmountKobo: requestedKobo,
        tenureMonths: data.tenureMonths,
        purpose: data.purpose,
        status: "submitted",
        submittedAt: new Date(),
      },
    });

    // Add guarantors if provided
    if (data.guarantorMemberIds?.length) {
      await tx.loanGuarantor.createMany({
        data: data.guarantorMemberIds.map((gId) => ({
          loanApplicationId: app.id,
          guarantorMemberId: gId,
        })),
      });
    }

    return app;
  });

  await logAction({
    userId: session.user.id,
    action: "LOAN_APPLICATION_SUBMITTED",
    entityType: "loan_application",
    entityId: application.id,
    newValues: { applicationNumber, requestedAmountKobo: String(requestedKobo) },
  });

  return Response.json({ application }, { status: 201 });
}
