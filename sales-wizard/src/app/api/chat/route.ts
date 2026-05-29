import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { runQualification } from '@/lib/ai/qualifier'

export const runtime = 'nodejs'

const chatSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(2000),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = chatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { message } = parsed.data
    let { conversationId } = parsed.data

    // Create or load conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      })
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
    } else {
      conversation = await prisma.conversation.create({
        data: { channel: 'web' },
        include: { messages: true },
      })
      conversationId = conversation.id
    }

    // Build history for AI
    const history = conversation.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Save user message
    await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
      },
    })

    // Run AI qualification
    const result = await runQualification(history, message)

    // Save assistant reply
    await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: result.reply,
      },
    })

    // Upsert lead if we have extracted data
    let leadId = conversation.leadId
    if (result.extracted && Object.keys(result.extracted).length > 0) {
      const leadData = {
        name: result.extracted.name ?? undefined,
        phone: result.extracted.phone ?? undefined,
        email: result.extracted.email ?? undefined,
        budgetMin: result.extracted.budgetMin ?? undefined,
        budgetMax: result.extracted.budgetMax ?? undefined,
        location: result.extracted.location ?? undefined,
        propertyType: (result.extracted.propertyType as any) ?? undefined,
        timeline: result.extracted.timeline ?? undefined,
        score: result.score as any,
        scoreReason: result.scoreReason,
        status: result.score === 'HOT' ? ('QUALIFIED' as const) : ('QUALIFYING' as const),
      }

      if (leadId) {
        await prisma.lead.update({ where: { id: leadId }, data: leadData })
      } else {
        const lead = await prisma.lead.create({ data: leadData })
        leadId = lead.id
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { leadId },
        })
      }
    }

    return NextResponse.json({
      conversationId,
      leadId,
      reply: result.reply,
      score: result.score,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
