import { prisma } from '@/lib/prisma'
import StatsCards from '@/components/admin/StatsCards'
import LeadTable from '@/components/admin/LeadTable'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [total, hot, warm, cold, recentLeads] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { score: 'HOT' } }),
    prisma.lead.count({ where: { score: 'WARM' } }),
    prisma.lead.count({ where: { score: 'COLD' } }),
    prisma.lead.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, phone: true, score: true,
        status: true, location: true, createdAt: true,
      },
    }),
  ])

  return { total, hot, warm, cold, unscored: total - hot - warm - cold, recentLeads }
}

export default async function AdminPage() {
  let stats
  try {
    stats = await getStats()
  } catch {
    stats = { total: 0, hot: 0, warm: 0, cold: 0, unscored: 0, recentLeads: [] }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">SW</div>
            <div>
              <h1 className="font-bold text-gray-900">Sales Wizard</h1>
              <p className="text-xs text-gray-500">Admin Dashboard</p>
            </div>
          </div>
          <Link href="/" className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
            ← View Site
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Overview</h2>
          <p className="text-gray-500 text-sm">Lead pipeline at a glance</p>
        </div>

        <StatsCards stats={stats} />

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Leads</h2>
          <LeadTable leads={stats.recentLeads as any} />
        </div>
      </main>
    </div>
  )
}
