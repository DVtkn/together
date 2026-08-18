import { Resend } from 'resend'

export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY not set — email not sent')
    return false
  }
  const resend = new Resend(apiKey)
  const from = process.env.EMAIL_FROM || 'Loop <onboarding@resend.dev>'
  try {
    const { error } = await resend.emails.send({ from, to, subject, html })
    if (error) {
      console.error('Resend error:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('Email send failed:', e)
    return false
  }
}