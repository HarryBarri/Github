import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLoanProductSchema } from "@/lib/validations/loan";
import { NextRequest } from "next/server";

export async function GET() {
  const products = await prisma.loanProduct.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["president","superadmin"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = createLoanProductSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const product = await prisma.loanProduct.create({
    data: {
      ...parsed.data,
      minAmountKobo: BigInt(parsed.data.minAmountKobo),
      maxAmountKobo: BigInt(parsed.data.maxAmountKobo),
    },
  });
  return Response.json({ product }, { status: 201 });
}
