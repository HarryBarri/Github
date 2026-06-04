import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const isOfficer = ["treasurer","president","superadmin","loan_officer","secretary"].includes(role);

  if (!isOfficer) {
    const account = await prisma.savingsAccount.findUnique({
      where: { memberId: session.user.memberId ?? "" },
    });
    return Response.json({ accounts: account ? [account] : [] });
  }

  const accounts = await prisma.savingsAccount.findMany({
    include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ accounts });
}
