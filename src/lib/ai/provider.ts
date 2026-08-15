// AI provider for OpenRouter API
// Uses fetch directly to avoid openai npm package type issues

export const OPENROUTER_API_BASE = process.env.AI_API_BASE || process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1'
export const OPENROUTER_MODEL = process.env.AI_MODEL || process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free'

export interface AIResponse {
  content: string
  usage: { input: number; output: number }
}

export async function getAIResponse(messages: Array<{role: string; content: string}>): Promise<AIResponse> {
  const apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return { content: 'AI API key not configured. Set OPENROUTER_API_KEY in .env.local', usage: { input: 0, output: 0 } }
  }

  try {
    const response = await fetch(OPENROUTER_API_BASE + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 700,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { content: 'Ошибка ИИ: ' + err.slice(0, 200), usage: { input: 0, output: 0 } }
    }

    const json: {
      choices?: Array<{ message?: { content?: string | null; reasoning?: string } }>
      usage?: { input?: number; output?: number }
    } = await response.json()
    const choices = json.choices || []
    let content = ''
    let usage: { input: number; output: number } = { input: 0, output: 0 }
    if (choices.length > 0 && json.usage) {
      const firstChoice = choices[0]
      const msg = firstChoice.message
      content = msg?.content ?? msg?.reasoning ?? ''
      const usageData = json.usage
      if (usageData.input !== undefined && usageData.output !== undefined) {
        usage = { input: usageData.input, output: usageData.output }
      }
    }
    return { content, usage }
  } catch (error: unknown) {
    return { content: 'Ошибка соединения с ИИ', usage: { input: 0, output: 0 } }
  }
}

export function buildMessages(systemPrompt: string, messages: Array<{role: string; content: string}>) {
  return [
    { role: 'system' as const, content: systemPrompt },
    ...messages,
  ]
}

export function extractContent(response: {choices?: Array<{ message?: { content?: string | null; reasoning?: string } }>; usage?: { input?: number; output?: number }}): string {
  try {
    const choices = response.choices || []
    if (choices.length === 0) return ''
    const firstChoice = choices[0]
    const msg = firstChoice.message
    if (!msg) return ''
    return (msg.content ?? msg.reasoning ?? '').trim()
  } catch {
    return ''
  }
}

export function safeParseResponse(response: {choices?: Array<{ message?: { content?: string | null; reasoning?: string } }>; usage?: { input?: number; output?: number }}): AIResponse {
  try {
    const content = extractContent(response)
    const rawUsage = response.usage || { input: 0, output: 0 }; const usage: { input: number; output: number } = { input: rawUsage.input ?? 0, output: rawUsage.output ?? 0 }
    return { content, usage }
  } catch {
    return { content: '', usage: { input: 0, output: 0 } }
  }
}

export function isValidContent(content: string): boolean {
  return content !== '' && content.length > 0 && content.length < 10000
}

export function handleAIError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('rate limit')) return 'Слишком много запросов'
    if (msg.includes('quota')) return 'Превышен лимит'
    if (msg.includes('authentication')) return 'Ошибка авторизации'
    if (msg.includes('timeout')) return 'Время ответа истекло'
    return error.message
  }
  return 'Произошла неизвестная ошибка'
}
