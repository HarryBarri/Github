import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        agent: true,
        conversations: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        followUpLogs: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Get lead error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
