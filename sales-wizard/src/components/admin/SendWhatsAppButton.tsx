'use client'

import { useState } from 'react'

export default function SendWhatsAppButton({ leadId, hasPhone }: { leadId: string; hasPhone: boolean }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSend() {
    if (!hasPhone) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, message: 'WhatsApp message sent successfully!' })
      } else {
        setResult({ success: false, message: data.error ?? 'Failed to send message' })
      }
    } catch {
      setResult({ success: false, message: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSend}
        disabled={loading || !hasPhone}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sending...' : '📱 Send WhatsApp Follow-up'}
      </button>
      {!hasPhone && <p className="text-xs text-gray-500">No phone number available</p>}
      {result && (
        <p className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}
