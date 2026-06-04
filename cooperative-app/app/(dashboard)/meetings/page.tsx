"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth-local";
import { localDb, type LocalMeeting } from "@/lib/local-db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

type MeetingWithCount = LocalMeeting & { attendanceCount: number };

export default function MeetingsPage() {
  const session = getSession();
  const role = session?.role ?? "";
  const canCreate = ["secretary", "president", "superadmin"].includes(role);

  const [meetings, setMeetings] = useState<MeetingWithCount[]>([]);

  useEffect(() => {
    localDb.init();
    const all = localDb.meetings.all().sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
    const attendance = localDb.meetingAttendance.all();
    setMeetings(all.map(m => ({
      ...m,
      attendanceCount: attendance.filter(a => a.meetingId === m.id).length,
    })));
  }, []);

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
            {["Title", "Type", "Date", "Venue", "Attendance", "Status", ""].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {meetings.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{m.title}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{m.meetingType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(m.scheduledDate).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{m.venue}</td>
                <td className="px-4 py-3 text-gray-600">{m.attendanceCount}</td>
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
