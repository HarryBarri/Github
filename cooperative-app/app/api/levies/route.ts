import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const isOfficer = ["treasurer","president","superadmin","secretary"].includes(role);

  if (!isOfficer) {
    const assignments = await prisma.levyAssignment.findMany({
      where: { memberId: session.user.memberId ?? "" },
      include: { levy: true, payments: true },
      orderBy: { dueDate: "desc" },
    });
    return Response.json({ assignments });
  }

  const levies = await prisma.levy.findMany({
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ levies });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["treasurer","president","superadmin"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, amountKobo, levyType, appliesTo, dueDate, penaltyRatePct } = body;

  if (!name || !amountKobo) {
    return Response.json({ error: "name and amountKobo are required" }, { status: 400 });
  }

  const levy = await prisma.levy.create({
    data: {
      name,
      description,
      amountKobo: BigInt(amountKobo),
      levyType: levyType ?? "fixed",
      appliesTo: appliesTo ?? "all_members",
      dueDate: dueDate ? new Date(dueDate) : null,
      penaltyRatePct: penaltyRatePct ?? 0,
      isActive: true,
      createdBy: session.user.id,
    },
  });

  await logAction({ userId: session.user.id, action: "LEVY_CREATED", entityType: "levy", entityId: levy.id });
  return Response.json({ levy: { ...levy, amountKobo: levy.amountKobo.toString() } }, { status: 201 });
}
