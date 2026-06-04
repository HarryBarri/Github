import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await prisma.loanApplication.findUnique({
    where: { id },
    include: {
      loan: { select: { id: true, status: true, amountPaidKobo: true, totalPayableKobo: true } },
      product: true,
      member: { select: { firstName: true, lastName: true, memberNumber: true } },
      guarantors: { include: { guarantor: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!application) return Response.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  const isOfficer = ["loan_officer","treasurer","secretary","president","superadmin"].includes(role);
  if (!isOfficer && application.memberId !== session.user.memberId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return Response.json({ application, loan: application.loan });
}
