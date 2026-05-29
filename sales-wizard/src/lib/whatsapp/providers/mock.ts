import type { WhatsAppProvider } from '../index'

export class MockWhatsAppProvider implements WhatsAppProvider {
  async send(to: string, body: string): Promise<{ id: string; status: string }> {
    const id = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log(`[WhatsApp Mock] Sending to ${to}:`, body.substring(0, 50) + '...')
    return { id, status: 'sent' }
  }
}
