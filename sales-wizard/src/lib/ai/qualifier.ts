import type { QualificationFields, QualificationResult, ChatMessage } from '@/lib/types'
import { scoreLead } from '@/lib/scoring/leadScorer'

// Conversation steps in order
const STEPS = ['name', 'phone', 'budget', 'location', 'propertyType', 'timeline', 'readyToBuy'] as const
type Step = typeof STEPS[number]

const QUESTIONS: Record<Step, string> = {
  name: "Welcome! 👋 I'm Sade, your personal property concierge. I'm here to help you find your dream property in Nigeria. Could I start with your name?",
  phone: "Wonderful! Could I get your phone number so our team can reach you with the best available properties?",
  budget: "Great, thanks! What's your budget range in Naira? For example, ₦50M–₦100M.",
  location: "Perfect! Which area are you looking to buy in? (e.g., Lekki, Victoria Island, Ajah, Abuja)",
  propertyType: "Lovely choice! What type of property are you interested in — Apartment, Duplex, Bungalow, Land, or Commercial?",
  timeline: "Almost there! When are you looking to make this purchase — within 3 months, 6 months, or about a year?",
  readyToBuy: "That's great! Are you ready to buy once we find the right property, or are you still exploring your options?",
}

function extractFromMessage(msg: string, step: Step): Partial<QualificationFields> {
  const text = msg.trim()
  const lower = text.toLowerCase()

  switch (step) {
    case 'name':
      return { name: text }

    case 'phone': {
      const digits = text.replace(/\D/g, '')
      if (digits.length >= 7) return { phone: text }
      return {}
    }

    case 'budget': {
      const millions = text.match(/(\d+(?:\.\d+)?)\s*[Mm]/g)
      const numbers = text.match(/\d[\d,]*/g)?.map(n => parseInt(n.replace(/,/g, ''), 10)).filter(n => n > 0) ?? []
      if (millions && millions.length >= 2) {
        const vals = millions.map(m => parseFloat(m) * 1_000_000)
        return { budgetMin: Math.min(...vals), budgetMax: Math.max(...vals) }
      }
      if (millions && millions.length === 1) {
        const val = parseFloat(millions[0]) * 1_000_000
        return { budgetMin: val, budgetMax: val }
      }
      if (numbers.length >= 2) return { budgetMin: Math.min(...numbers), budgetMax: Math.max(...numbers) }
      if (numbers.length === 1) return { budgetMin: numbers[0], budgetMax: numbers[0] }
      return {}
    }

    case 'location':
      return { location: text }

    case 'propertyType': {
      if (lower.includes('apart')) return { propertyType: 'APARTMENT' }
      if (lower.includes('duplex')) return { propertyType: 'DUPLEX' }
      if (lower.includes('bungal')) return { propertyType: 'BUNGALOW' }
      if (lower.includes('land')) return { propertyType: 'LAND' }
      if (lower.includes('commerc')) return { propertyType: 'COMMERCIAL' }
      return { propertyType: text }
    }

    case 'timeline':
      return { timeline: text }

    case 'readyToBuy': {
      const ready = lower.includes('yes') || lower.includes('ready') || lower.includes('now') || lower.includes('sure')
      return { readyToBuy: ready }
    }

    default:
      return {}
  }
}

function getCurrentStep(history: ChatMessage[]): Step {
  // Count how many assistant questions have been asked
  const assistantTurns = history.filter(m => m.role === 'assistant').length
  return STEPS[Math.min(assistantTurns, STEPS.length - 1)]
}

function buildReply(step: Step, nextStep: Step | null, extracted: Partial<QualificationFields>): string {
  const affirmations = ["Got it!", "Thank you!", "Perfect!", "Wonderful!", "Great, noted!"]
  const affirmation = affirmations[Math.floor(Math.random() * affirmations.length)]

  if (nextStep === null) {
    return `${affirmation} I have everything I need. Our team will be in touch with you shortly with the best property options matching your needs. 🏡`
  }

  return `${affirmation} ${QUESTIONS[nextStep]}`
}

export async function runQualification(
  history: ChatMessage[],
  userMessage: string
): Promise<QualificationResult> {
  const currentStep = getCurrentStep(history)
  const stepIndex = STEPS.indexOf(currentStep)
  const nextStep = stepIndex < STEPS.length - 1 ? STEPS[stepIndex + 1] : null

  // Extract data from this user message
  const extracted = extractFromMessage(userMessage, currentStep)

  // Merge all previously extracted data from history
  const allExtracted: QualificationFields = {}
  for (const msg of history) {
    if (msg.role === 'user') {
      const msgStep = STEPS[Math.min(
        history.filter(m => m.role === 'assistant' && history.indexOf(m) < history.indexOf(msg)).length,
        STEPS.length - 1
      )]
      Object.assign(allExtracted, extractFromMessage(msg.content, msgStep))
    }
  }
  Object.assign(allExtracted, extracted)

  const reply = buildReply(currentStep, nextStep, allExtracted)
  const { score, scoreReason } = scoreLead(allExtracted)

  return {
    reply,
    extracted: Object.keys(extracted).length > 0 ? extracted : null,
    score,
    scoreReason,
  }
}
