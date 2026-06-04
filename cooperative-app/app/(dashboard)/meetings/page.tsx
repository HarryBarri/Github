import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

export default async function MeetingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  const canCreate = ["secretary","president","superadmin"].includes(role);

  const meetings = await prisma.meeting.findMany({
    orderBy: { scheduledDate: "desc" },
    include: { _count: { select: { attendance: true } } },
  });

  return (
    <div>
      <PageHeader title="Meetings" description="AGMs, EGMs, and board meetings"
        action={canCreate && (
          <Link href="/dashboard/meetings/new" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg">
            + Schedule Meeting
          </Link>
        )}
      />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50"><tr>
            {["Title","Type","Date","Venue","Attendance","Status",""].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {meetings.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{m.title}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{m.meetingType.replace(/_/g," ")}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(m.scheduledDate).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{m.venue}</td>
                <td className="px-4 py-3 text-gray-600">{m._count.attendance}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/meetings/${m.id}`} className="text-green-600 hover:underline text-xs">View →</Link>
                </td>
              </tr>
            ))}
            {meetings.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No meetings scheduled.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
