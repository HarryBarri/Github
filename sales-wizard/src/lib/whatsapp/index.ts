export interface WhatsAppProvider {
  send(to: string, body: string): Promise<{ id: string; status: string }>
}

export type MessageTemplate = 'HOT' | 'WARM' | 'COLD'

export function getMessageTemplate(band: MessageTemplate, leadName: string | null): string {
  const name = leadName ?? 'there'

  const templates = {
    HOT: `Hi ${name}! 🔥 Great news — our sales team has identified perfect properties matching your requirements. You're very close to finding your dream home! Please call us NOW at 08012345678 or reply to this message to speak with an agent today. Limited units available!`,
    WARM: `Hi ${name}! 😊 Thank you for your interest in our properties. We've curated some amazing options in your preferred location that match your budget. Check out our latest listings and let us know if you'd like to schedule a viewing. We're here to help you find the perfect home!`,
    COLD: `Hi ${name}! 👋 We noticed you were exploring property options with us. Whether you're planning to buy now or in the future, we're here to guide you every step of the way. Did you know property prices in Lagos have grown 15% this year? Reply to learn more about smart property investment in Nigeria!`,
  }

  return templates[band]
}

export async function getProvider(): Promise<WhatsAppProvider> {
  const providerName = process.env.WHATSAPP_PROVIDER ?? 'mock'

  if (providerName === 'mock') {
    const { MockWhatsAppProvider } = await import('./providers/mock')
    return new MockWhatsAppProvider()
  }

  throw new Error(`Unknown WhatsApp provider: ${providerName}. Supported: mock`)
}
