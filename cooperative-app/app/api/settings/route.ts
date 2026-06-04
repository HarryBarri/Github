import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  const settings = await prisma.cooperativeSetting.findMany({ orderBy: { key: "asc" } });
  return Response.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["president","superadmin"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as Record<string, string>;

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.cooperativeSetting.upsert({
        where: { key },
        update: { value, updatedBy: session.user.id, updatedAt: new Date() },
        create: { key, value, updatedBy: session.user.id },
      })
    )
  );

  return Response.json({ ok: true });
}
