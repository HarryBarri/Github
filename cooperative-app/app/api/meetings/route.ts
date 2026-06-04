import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const meetings = await prisma.meeting.findMany({
    include: { _count: { select: { attendance: true } } },
    orderBy: { scheduledDate: "desc" },
  });
  return Response.json({ meetings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["secretary","president","superadmin"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, meetingType, scheduledDate, venue, agenda, quorumRequired } = body;

  if (!title || !meetingType || !scheduledDate || !venue) {
    return Response.json({ error: "title, meetingType, scheduledDate, venue are required" }, { status: 400 });
  }

  const meeting = await prisma.meeting.create({
    data: {
      title,
      meetingType,
      scheduledDate: new Date(scheduledDate),
      venue,
      agenda,
      quorumRequired: quorumRequired ? parseInt(quorumRequired) : null,
      status: "scheduled",
      createdBy: session.user.id,
    },
  });

  await logAction({ userId: session.user.id, action: "MEETING_CREATED", entityType: "meeting", entityId: meeting.id });
  return Response.json({ meeting }, { status: 201 });
}
