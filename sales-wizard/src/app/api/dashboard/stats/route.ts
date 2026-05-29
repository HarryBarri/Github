import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const [total, hot, warm, cold, byStatus, recentLeads] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { score: 'HOT' } }),
      prisma.lead.count({ where: { score: 'WARM' } }),
      prisma.lead.count({ where: { score: 'COLD' } }),
      prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.lead.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, phone: true, score: true,
          status: true, location: true, createdAt: true,
        },
      }),
    ])

    const byStatusMap: Record<string, number> = {}
    byStatus.forEach(item => {
      byStatusMap[item.status] = item._count._all
    })

    return NextResponse.json({
      total,
      hot,
      warm,
      cold,
      unscored: total - hot - warm - cold,
      byStatus: byStatusMap,
      recentLeads,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
