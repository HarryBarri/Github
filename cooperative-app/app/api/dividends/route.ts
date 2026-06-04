import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const isOfficer = ["treasurer","president","superadmin"].includes(role);

  if (!isOfficer) {
    const allocations = await prisma.dividendAllocation.findMany({
      where: { memberId: session.user.memberId ?? "" },
      include: { dividend: true },
      orderBy: { dividend: { financialYear: "desc" } },
    });
    return Response.json({ allocations });
  }

  const dividends = await prisma.dividend.findMany({
    include: { _count: { select: { allocations: true } } },
    orderBy: { financialYear: "desc" },
  });
  return Response.json({ dividends });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["treasurer","president","superadmin"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { financialYear, totalProfitKobo, dividendFundKobo, declarationDate, notes } = body;

  if (!financialYear || !totalProfitKobo || !dividendFundKobo || !declarationDate) {
    return Response.json({ error: "financialYear, totalProfitKobo, dividendFundKobo, declarationDate are required" }, { status: 400 });
  }

  const existing = await prisma.dividend.findFirst({ where: { financialYear: parseInt(financialYear) } });
  if (existing) return Response.json({ error: "Dividend for this year already exists" }, { status: 409 });

  const dividend = await prisma.dividend.create({
    data: {
      financialYear: parseInt(financialYear),
      totalProfitKobo: BigInt(totalProfitKobo),
      dividendFundKobo: BigInt(dividendFundKobo),
      declarationDate: new Date(declarationDate),
      notes,
      status: "draft",
    },
  });

  await logAction({ userId: session.user.id, action: "DIVIDEND_CREATED", entityType: "dividend", entityId: dividend.id });
  return Response.json({ dividend: { ...dividend, totalProfitKobo: dividend.totalProfitKobo.toString(), dividendFundKobo: dividend.dividendFundKobo.toString() } }, { status: 201 });
}
