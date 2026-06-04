"use client";

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const map: Record<string, string> = {
    // member
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    suspended: "bg-red-100 text-red-700",
    exited: "bg-gray-100 text-gray-600",
    // loan
    submitted: "bg-blue-100 text-blue-700",
    under_review: "bg-purple-100 text-purple-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    disbursed: "bg-teal-100 text-teal-700",
    draft: "bg-gray-100 text-gray-600",
    withdrawn: "bg-gray-100 text-gray-600",
    completed: "bg-green-100 text-green-700",
    defaulted: "bg-red-100 text-red-700",
    written_off: "bg-gray-100 text-gray-600",
    // kyc / levy
    unpaid: "bg-red-100 text-red-700",
    partial: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    waived: "bg-gray-100 text-gray-600",
    // meeting
    scheduled: "bg-blue-100 text-blue-700",
    ongoing: "bg-purple-100 text-purple-700",
    cancelled: "bg-red-100 text-red-700",
    // dividend
    disbursed_div: "bg-teal-100 text-teal-700",
  };

  const cls = map[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
