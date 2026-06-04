"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { localDb, type LocalMeeting, type LocalMeetingAttendance } from "@/lib/local-db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

type AttendanceWithMember = LocalMeetingAttendance & { memberName: string; memberNumber: string };

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<LocalMeeting | null>(null);
  const [attendance, setAttendance] = useState<AttendanceWithMember[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    localDb.init();
    const m = localDb.meetings.findUnique(id);
    if (!m) { setNotFound(true); return; }
    setMeeting(m);

    const records = localDb.meetingAttendance.findMany({ meetingId: id } as never);
    const members = localDb.members.all();
    setAttendance(records.map(a => {
      const member = members.find(mm => mm.id === a.memberId);
      return { ...a, memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown", memberNumber: member?.memberNumber ?? "" };
    }));
  }, [id]);

  if (notFound) return <div className="text-gray-500 p-6">Meeting not found.</div>;
  if (!meeting) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-4"><Link href="/dashboard/meetings" className="text-sm text-gray-500 hover:text-gray-700">← Meetings</Link></div>
      <PageHeader title={meeting.title} action={<StatusBadge status={meeting.status} />} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {[
          { label: "Type", value: meeting.meetingType.toUpperCase() },
          { label: "Date", value: new Date(meeting.scheduledDate).toLocaleString("en-NG") },
          { label: "Venue", value: meeting.venue },
          { label: "Attendance", value: String(attendance.length) + (meeting.quorumRequired ? ` / ${meeting.quorumRequired} quorum` : "") },
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
        <h3 className="font-semibold text-gray-700 mb-3">Attendance Register ({attendance.length})</h3>
        {attendance.length === 0 ? (
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
                {attendance.map(a => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">{a.memberName}</td>
                    <td className="px-4 py-3 text-gray-500">{a.memberNumber}</td>
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
