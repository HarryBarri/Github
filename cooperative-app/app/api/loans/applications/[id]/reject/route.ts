import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { loanRejectionSchema } from "@/lib/validations/loan";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["loan_officer","treasurer","president","superadmin"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = loanRejectionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const application = await prisma.loanApplication.findUnique({ where: { id } });
  if (!application) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.loanApplication.update({
    where: { id },
    data: { status: "rejected", rejectedAt: new Date(), rejectionReason: parsed.data.rejectionReason },
  });

  await logAction({
    userId: session.user.id, action: "LOAN_REJECTED", entityType: "loan_application", entityId: id,
    oldValues: { status: application.status }, newValues: { status: "rejected" },
  });

  return Response.json({ application: updated });
}
