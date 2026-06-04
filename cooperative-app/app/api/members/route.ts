import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { createMemberSchema } from "@/lib/validations/member";
import { generateReferenceNumber } from "@/lib/utils";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["loan_officer", "treasurer", "secretary", "president", "superadmin"].includes(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? undefined;

  const where = {
    deletedAt: null,
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { memberNumber: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        memberNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        membershipDate: true,
        savingsAccount: { select: { balanceKobo: true } },
      },
    }),
    prisma.member.count({ where }),
  ]);

  return Response.json({ members, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["treasurer", "secretary", "president", "superadmin"].includes(role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Generate member number
  const count = await prisma.member.count();
  const year = new Date().getFullYear();
  const memberNumber = `COOP-${year}-${String(count + 1).padStart(4, "0")}`;

  const member = await prisma.$transaction(async (tx) => {
    const newMember = await tx.member.create({
      data: {
        memberNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        occupation: data.occupation,
        employer: data.employer,
        bvn: data.bvn,
        nin: data.nin,
        addressStreet: data.addressStreet,
        addressCity: data.addressCity,
        addressState: data.addressState,
        addressLga: data.addressLga,
        nextOfKinName: data.nextOfKinName,
        nextOfKinPhone: data.nextOfKinPhone,
        nextOfKinRelationship: data.nextOfKinRelationship,
      },
    });

    // Create user account if email provided
    if (data.email) {
      const tempPassword = generateReferenceNumber("PWD");
      const hashedPassword = await bcrypt.hash(tempPassword, 12);
      await tx.user.create({
        data: {
          memberId: newMember.id,
          email: data.email,
          hashedPassword,
          role: "member",
        },
      });
    }

    return newMember;
  });

  await logAction({
    userId: session.user.id,
    action: "MEMBER_CREATED",
    entityType: "member",
    entityId: member.id,
    newValues: { memberNumber, firstName: data.firstName, lastName: data.lastName },
  });

  return Response.json({ member }, { status: 201 });
}
