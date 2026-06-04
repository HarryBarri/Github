import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["loan_officer","treasurer","president","superadmin"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const application = await prisma.loanApplication.findUnique({ where: { id } });
  if (!application) return Response.json({ error: "Not found" }, { status: 404 });
  if (application.status !== "submitted") {
    return Response.json({ error: "Application must be in submitted status" }, { status: 400 });
  }

  const updated = await prisma.loanApplication.update({
    where: { id },
    data: { status: "under_review", reviewedBy: session.user.id, reviewedAt: new Date() },
  });

  await logAction({
    userId: session.user.id, action: "LOAN_REVIEW_STARTED", entityType: "loan_application", entityId: id,
  });

  return Response.json({ application: updated });
}
