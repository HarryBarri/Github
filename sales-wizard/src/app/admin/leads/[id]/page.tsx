import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SendWhatsAppButton from '@/components/admin/SendWhatsAppButton'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  let lead
  try {
    lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        agent: true,
        conversations: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        },
        followUpLogs: { orderBy: { createdAt: 'desc' } },
      },
    })
  } catch {
    lead = null
  }

  if (!lead) notFound()

  const scoreBg: Record<string, string> = {
    HOT: 'bg-red-100 text-red-700',
    WARM: 'bg-orange-100 text-orange-700',
    COLD: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="text-emerald-600 hover:text-emerald-800 font-medium text-sm">← Back to Dashboard</Link>
          <span className="text-sm text-gray-500">Lead Detail</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Lead Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{lead.name ?? 'Unknown'}</h1>
              <p className="text-gray-500 text-sm">{lead.email ?? lead.phone ?? 'No contact info'}</p>
            </div>
            <div className="flex items-center gap-2">
              {lead.score && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${scoreBg[lead.score] ?? 'bg-gray-100 text-gray-600'}`}>
                  {lead.score}
                </span>
              )}
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">{lead.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-500 mb-1">Budget</div>
              <div className="font-medium">
                {lead.budgetMin ? `₦${(lead.budgetMin / 1000000).toFixed(0)}M` : '—'}
                {lead.budgetMax ? ` – ₦${(lead.budgetMax / 1000000).toFixed(0)}M` : ''}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-500 mb-1">Location</div>
              <div className="font-medium">{lead.location ?? '—'}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-500 mb-1">Property Type</div>
              <div className="font-medium">{lead.propertyType ?? '—'}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-gray-500 mb-1">Timeline</div>
              <div className="font-medium">{lead.timeline ?? '—'}</div>
            </div>
          </div>

          {lead.scoreReason && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-sm text-yellow-700">
              <strong>Score Reason:</strong> {lead.scoreReason}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <SendWhatsAppButton leadId={lead.id} hasPhone={!!lead.phone} />
        </div>

        {/* Conversations */}
        {lead.conversations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Conversation History</h2>
            {lead.conversations.map(conv => (
              <div key={conv.id} className="space-y-3">
                {conv.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className="text-xs text-gray-400 mb-1">{msg.role === 'user' ? 'Lead' : 'Sade (AI)'}</div>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Follow-up Logs */}
        {lead.followUpLogs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Follow-up History</h2>
            <div className="space-y-2">
              {lead.followUpLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-500">{new Date(log.createdAt).toLocaleString('en-NG')}</span>
                  <span className="text-gray-400">·</span>
                  <span className="capitalize text-gray-600">{log.channel}</span>
                  <span className="text-gray-400">·</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {log.status}
                  </span>
                  <span className="text-gray-500 truncate flex-1">{log.body.substring(0, 60)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
