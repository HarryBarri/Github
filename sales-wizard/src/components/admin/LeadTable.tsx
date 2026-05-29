'use client'

import Link from 'next/link'

interface Lead {
  id: string
  name: string | null
  phone: string | null
  score: string | null
  status: string
  location: string | null
  createdAt: string | Date
}

interface Props {
  leads: Lead[]
}

const scoreBadge: Record<string, string> = {
  HOT: 'bg-red-100 text-red-700 border-red-200',
  WARM: 'bg-orange-100 text-orange-700 border-orange-200',
  COLD: 'bg-blue-100 text-blue-700 border-blue-200',
}

const statusBadge: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-600',
  QUALIFYING: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-emerald-100 text-emerald-700',
  CONTACTED: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

export default function LeadTable({ leads }: Props) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No leads yet. Start a conversation on the landing page!
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-gray-600 font-medium">Name</th>
            <th className="px-4 py-3 text-left text-gray-600 font-medium">Phone</th>
            <th className="px-4 py-3 text-left text-gray-600 font-medium">Location</th>
            <th className="px-4 py-3 text-left text-gray-600 font-medium">Score</th>
            <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
            <th className="px-4 py-3 text-left text-gray-600 font-medium">Date</th>
            <th className="px-4 py-3 text-left text-gray-600 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map(lead => (
            <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{lead.name ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{lead.phone ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{lead.location ?? '—'}</td>
              <td className="px-4 py-3">
                {lead.score ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${scoreBadge[lead.score] ?? 'bg-gray-100 text-gray-600'}`}>
                    {lead.score}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {lead.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(lead.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/leads/${lead.id}`} className="text-emerald-600 hover:text-emerald-800 font-medium">
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
