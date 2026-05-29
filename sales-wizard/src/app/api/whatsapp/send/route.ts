import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getProvider, getMessageTemplate } from '@/lib/whatsapp'

export const runtime = 'nodejs'

const sendSchema = z.object({
  leadId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = sendSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id: parsed.data.leadId } })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.phone) {
      return NextResponse.json({ error: 'Lead has no phone number' }, { status: 422 })
    }

    const band = (lead.score ?? 'COLD') as 'HOT' | 'WARM' | 'COLD'
    const messageBody = getMessageTemplate(band, lead.name)

    // Create pending log first
    const log = await prisma.followUpLog.create({
      data: {
        leadId: lead.id,
        channel: 'whatsapp',
        template: band,
        body: messageBody,
        status: 'pending',
      },
    })

    // Send message
    const provider = await getProvider()
    const result = await provider.send(lead.phone, messageBody)

    // Update log with result
    await prisma.followUpLog.update({
      where: { id: log.id },
      data: { status: result.status, sentAt: new Date() },
    })

    return NextResponse.json({ success: true, messageId: result.id, status: result.status })
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
