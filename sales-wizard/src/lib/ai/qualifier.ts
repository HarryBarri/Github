import Anthropic from '@anthropic-ai/sdk'
import type { QualificationFields, QualificationResult, ChatMessage } from '@/lib/types'
import { buildSystemPrompt } from './prompts'
import { scoreLead } from '@/lib/scoring/leadScorer'

const HISTORY_LIMIT = 20

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
  return new Anthropic({ apiKey })
}

function parseAIResponse(content: string): { reply: string; extracted: QualificationFields | null } {
  try {
    const cleaned = content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(cleaned)
    if (typeof parsed.reply !== 'string') throw new Error('Invalid reply field')

    const extracted: QualificationFields = {}
    const e = parsed.extracted || {}

    if (e.name && typeof e.name === 'string') extracted.name = e.name
    if (e.phone && typeof e.phone === 'string') extracted.phone = e.phone
    if (e.email && typeof e.email === 'string') extracted.email = e.email
    if (e.budgetMin && typeof e.budgetMin === 'number') extracted.budgetMin = e.budgetMin
    if (e.budgetMax && typeof e.budgetMax === 'number') extracted.budgetMax = e.budgetMax
    if (e.location && typeof e.location === 'string') extracted.location = e.location
    if (e.propertyType && typeof e.propertyType === 'string') extracted.propertyType = e.propertyType
    if (e.timeline && typeof e.timeline === 'string') extracted.timeline = e.timeline
    if (typeof e.readyToBuy === 'boolean') extracted.readyToBuy = e.readyToBuy

    return { reply: parsed.reply, extracted: Object.keys(extracted).length > 0 ? extracted : null }
  } catch {
    return { reply: content, extracted: null }
  }
}

export async function runQualification(
  history: ChatMessage[],
  userMessage: string
): Promise<QualificationResult> {
  const client = getClient()
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'

  const limitedHistory = history.slice(-HISTORY_LIMIT)

  const messages: Anthropic.MessageParam[] = [
    ...limitedHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 512,
      system: buildSystemPrompt(),
      messages,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const rawContent = textBlock?.type === 'text' ? textBlock.text : ''

    const { reply, extracted } = parseAIResponse(rawContent)
    const { score, scoreReason } = scoreLead(extracted ?? {})

    return { reply, extracted, score, scoreReason }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('AI qualification error:', errMsg)

    return {
      reply: "I'm sorry, I'm having a little trouble right now. Could you tell me what type of property you're looking for?",
      extracted: null,
      score: 'COLD',
      scoreReason: 'AI error - no data extracted',
    }
  }
}
