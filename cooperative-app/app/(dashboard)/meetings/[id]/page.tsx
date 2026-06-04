import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      attendance: {
        include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
      },
    },
  });
  if (!meeting) notFound();

  return (
    <div>
      <div className="mb-4"><Link href="/dashboard/meetings" className="text-sm text-gray-500 hover:text-gray-700">← Meetings</Link></div>
      <PageHeader title={meeting.title} action={<StatusBadge status={meeting.status} />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {[
          { label: "Type", value: meeting.meetingType.toUpperCase() },
          { label: "Date", value: new Date(meeting.scheduledDate).toLocaleString("en-NG") },
          { label: "Venue", value: meeting.venue },
          { label: "Attendance", value: String(meeting.attendance.length) + (meeting.quorumRequired ? ` / ${meeting.quorumRequired} quorum` : "") },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 uppercase">{k.label}</p>
            <p className="text-lg font-semibold text-gray-800 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {meeting.agenda && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="font-semibold text-gray-700 mb-2">Agenda</h3>
          <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">{meeting.agenda}</pre>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Attendance Register ({meeting.attendance.length})</h3>
        {meeting.attendance.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No attendance recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50"><tr>
                {["Member", "Member No.", "Checked In", "Attended"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {meeting.attendance.map(a => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">{a.member.firstName} {a.member.lastName}</td>
                    <td className="px-4 py-3 text-gray-500">{a.member.memberNumber}</td>
                    <td className="px-4 py-3">{a.checkedInAt ? new Date(a.checkedInAt).toLocaleTimeString("en-NG") : "—"}</td>
                    <td className="px-4 py-3">{a.attended ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
