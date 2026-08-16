// AI provider for Groq - text only
// Uses fetch directly to avoid openai npm package type issues

export const GROQ_API_BASE = "https://api.groq.com/openai/v1"
export const API_BASE = GROQ_API_BASE
const apiKey = process.env.GROQ_API_KEY

if (!apiKey) {
  throw new Error("Groq API key not configured. Set GROQ_API_KEY in .env.local")
}

// Model chain: primary → fallback → OpenRouter free
const CHAIN = [
  process.env.AI_MODEL || "openai/gpt-oss-120b",
  process.env.AI_FALLBACK_MODEL || "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
]

export interface AIResponse {
  content: string
  usage: { input: number; output: number }
}

export async function getAIResponse(messages: Array<{role: string; content: string}>): Promise<AIResponse> {
  // Keep Unicode (Cyrillic) — only strip control characters and trim
  const safeMessages = messages.map((m) => ({
    role: String(m.role),
    content: String(m.content).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").trim(),
  }))

  // Try each model in the chain until one works
  for (let i = 0; i < CHAIN.length; i++) {
    const model = CHAIN[i]
    try {
      const response = await fetch(API_BASE + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey,
        },
        body: JSON.stringify({
          model,
          messages: safeMessages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error(`[groq] model=${model} → ${response.status} err=${errText.substring(0, 100)}`)
        continue // try next model
      }

      const data = await response.json()
      const choices = data.choices || []
      
      if (choices.length === 0) {
        console.error(`[groq] model=${model} no choices`)
        continue // try next model
      }

      const msg = choices[0]?.message || {}
      const rawContent = msg?.content || msg?.reasoning || ""
      
      // Preserve Cyrillic — only strip control characters and trim
      const cleanContent = rawContent.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").trim()
      
      const usage = data.usage || { input: 0, output: 0 }
      return { content: cleanContent, usage }
    } catch (e) {
      console.error(`[groq] model=${model} exception`, e)
      continue // try next model
    }
  }

  // All models failed - return offline fallback
  return { content: "Сова не может подключиться к ИИ в данный момент. Пожалуйста, попробуйте позже.", usage: { input: 0, output: 0 } }
}

export function buildMessages(systemPrompt: string, messages: Array<{role: string; content: string}>) {
  return [
    { role: 'system' as const, content: String(systemPrompt) },
    ...messages.map((m) => ({
      role: String(m.role),
      content: String(m.content).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").trim(),
    })),
  ]
}

export function safeParseResponse(response: {choices?: Array<{ message?: { content?: string | null; reasoning?: string } }>; usage?: { input?: number; output?: number }}): string {
  try {
    const choices = response.choices || []
    if (choices.length === 0) return "ИИ не ответил."
    const msg = choices[0]?.message || {}
    return (msg?.content || msg?.reasoning || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").trim()
  } catch {
    return "ИИ не смог сформировать ответ."
  }
}

export function isValidContent(content: string): boolean {
  return content !== "" && content.length > 0 && content.length < 2000
}

export function handleAIError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return "Неизвестная ошибка"
}

export const SYSTEM_PROMPT = "Ты — психолог-консультант для пар. Отвечай очень кратко (до 80 слов), по-русски, поддерживающе и эмпатично. Твоя задача — помогать парам понимать друг друга, разрешать конфликты и укреплять близость. Давай практический совет или вопрос, а не длинный текст."