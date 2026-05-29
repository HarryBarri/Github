import type { QualificationFields, ScoreBand } from '@/lib/types'

export function scoreLead(fields: QualificationFields): {
  score: ScoreBand
  scoreReason: string
} {
  let points = 0
  const signals: string[] = []

  if (fields.budgetMin && fields.budgetMin > 0) {
    points += 30
    signals.push('budget confirmed')
  }

  if (fields.location && fields.location.trim().length > 2) {
    points += 20
    signals.push('location specified')
  }

  if (fields.propertyType) {
    points += 15
    signals.push('property type specified')
  }

  if (fields.timeline) {
    const t = fields.timeline.toLowerCase()
    if (t.includes('immediately') || t.includes('now') || t.includes('asap') || t.includes('1 month') || t.includes('2 month') || t.includes('3 month')) {
      points += 25
      signals.push('timeline ≤3 months')
    } else if (t.includes('6 month') || t.includes('4 month') || t.includes('5 month')) {
      points += 12
      signals.push('timeline 3-6 months')
    } else if (t.includes('year') || t.includes('12 month')) {
      points += 5
      signals.push('timeline ~1 year')
    }
  }

  if (fields.readyToBuy === true) {
    points += 10
    signals.push('expressed readiness')
  }

  let score: ScoreBand
  if (points >= 65) score = 'HOT'
  else if (points >= 35) score = 'WARM'
  else score = 'COLD'

  const scoreReason = signals.length > 0 ? signals.join(', ') : 'insufficient data'

  return { score, scoreReason }
}
