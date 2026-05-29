import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const createLeadSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  location: z.string().optional(),
  propertyType: z.enum(['LAND', 'APARTMENT', 'DUPLEX', 'BUNGALOW', 'COMMERCIAL']).optional(),
  timeline: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? undefined
    const score = searchParams.get('score') ?? undefined
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) where.status = status
    if (score) where.score = score

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { agent: { select: { name: true, email: true } } },
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({ leads, total, page, limit })
  } catch (error) {
    console.error('List leads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createLeadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const lead = await prisma.lead.create({ data: parsed.data })
    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error('Create lead error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
