import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { generateReferenceNumber } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const isOfficer = ["treasurer","president","superadmin","loan_officer","secretary"].includes(role);

  if (!isOfficer) {
    const shares = await prisma.shareCapital.findMany({
      where: { memberId: session.user.memberId ?? "" },
    });
    return Response.json({ shares });
  }

  const shares = await prisma.shareCapital.findMany({
    include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
    orderBy: { acquiredDate: "desc" },
  });
  return Response.json({ shares });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["treasurer","president","superadmin"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { memberId, sharesQuantity, pricePerShareKobo, transactionType = "purchase", notes } = body;

  if (!memberId || !sharesQuantity || !pricePerShareKobo) {
    return Response.json({ error: "memberId, sharesQuantity, pricePerShareKobo are required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.shareCapital.findFirst({ where: { memberId } });
    const sharesValueKobo = BigInt(pricePerShareKobo);
    const qty = parseInt(sharesQuantity);

    if (existing) {
      await tx.shareCapital.update({
        where: { id: existing.id },
        data: { sharesOwned: existing.sharesOwned + qty },
      });
    } else {
      await tx.shareCapital.create({
        data: { memberId, sharesOwned: qty, shareValueKobo: sharesValueKobo, acquiredDate: new Date() },
      });
    }

    return tx.shareTransaction.create({
      data: {
        memberId,
        transactionType,
        sharesQuantity: qty,
        pricePerShareKobo: sharesValueKobo,
        totalAmountKobo: sharesValueKobo * BigInt(qty),
        referenceNumber: generateReferenceNumber("SHR"),
        processedBy: session.user.id,
        transactionDate: new Date(),
        notes,
      },
    });
  });

  await logAction({ userId: session.user.id, action: "SHARE_PURCHASE", entityType: "share_capital", entityId: memberId });
  return Response.json({ transaction: result }, { status: 201 });
}
