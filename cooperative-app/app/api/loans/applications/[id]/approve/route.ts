import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { loanApprovalSchema } from "@/lib/validations/loan";
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

  const { id } = await params;
  const body = await req.json();
  const parsed = loanApprovalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const application = await prisma.loanApplication.findUnique({
    where: { id },
  });

  if (!application) {
    return Response.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.status !== "under_review" && application.status !== "submitted") {
    return Response.json(
      { error: `Cannot approve application in '${application.status}' status` },
      { status: 400 }
    );
  }

  const updated = await prisma.loanApplication.update({
    where: { id },
    data: {
      status: "approved",
      approvedAmountKobo: BigInt(parsed.data.approvedAmountKobo),
      approvedBy: session.user.id,
      approvedAt: new Date(),
      approvalNotes: parsed.data.approvalNotes,
    },
  });

  await logAction({
    userId: session.user.id,
    action: "LOAN_APPROVED",
    entityType: "loan_application",
    entityId: id,
    oldValues: { status: application.status },
    newValues: { status: "approved", approvedAmountKobo: String(parsed.data.approvedAmountKobo) },
  });

  return Response.json({ application: updated });
}
