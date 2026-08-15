import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { buildMessages, safeParseResponse, isValidContent, handleAIError } from "@/lib/ai/provider"
import { SYSTEM_PROMPT } from "@/lib/ai/prompt"

const OPENROUTER_API_BASE = process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1"
const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY

// Don't throw at module evaluation - check at runtime instead
const isAIDisabled = !apiKey

export async function GET(
  request: NextRequest
) {
  if (isAIDisabled) {
    return NextResponse.json({ error: "AI API не настроен" }, { status: 503 })
  }
  
  const rl = await rateLimit("ai", request.headers.get("x-forwarded-for") || "anon")
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }
  const conversations: unknown[] = []
  return NextResponse.json({ conversations })
}

export async function POST(
  request: NextRequest
) {
  if (isAIDisabled) {
    return NextResponse.json({ error: "AI API не настроен" }, { status: 503 })
  }
  
  let body: unknown
  try {
    const rl = await rateLimit("ai", request.headers.get("x-forwarded-for") || "anon")
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      )
    }

    const body = await request.json()
    if (!body || !body.message || typeof body.message !== "string") {
      return NextResponse.json({ error: "Сообщение не может быть пустым" }, { status: 400 })
    }

    const message = body.message.trim()
    if (message.length === 0) {
      return NextResponse.json({ error: "Сообщение не может быть пустым" }, { status: 400 })
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Сообщение слишком длинное" }, { status: 400 })
    }

    const conversationId = body.conversationId || "temp-" + Date.now()
    const messages = buildMessages(SYSTEM_PROMPT, [])

    const fetchParams = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "liquid/lfm-2.5-2.6b:free",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    }

    const response = await fetch(OPENROUTER_API_BASE + "/chat/completions", fetchParams)
    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      console.error("OpenRouter вернул не-JSON:", response.status, text.slice(0, 500))
      return NextResponse.json({ error: "Некорректный ответ от ИИ-провайдера" }, { status: 502 })
    }
    if (!response.ok) {
      console.error("OpenRouter API error:", response.status, text)
      return NextResponse.json({ error: `OpenRouter вернул ${response.status}` }, { status: response.status })
    }
    const parsed = safeParseResponse(data as never)

    if (!isValidContent(parsed.content)) {
      return NextResponse.json(
        { error: "Получен пустой ответ от ИИ" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      conversationId,
      choices: [{ index: 0, message: { role: "assistant", content: parsed.content }, finish_reason: "stop" }],
      usage: { prompt_tokens: parsed.usage.input || 0, completion_tokens: parsed.usage.output || 0, total_tokens: (parsed.usage.input || 0) + (parsed.usage.output || 0) },
    })
  } catch (error: unknown) {
    console.error("AI API error:", error)
    return NextResponse.json({ error: handleAIError(error as Error), conversationId: (body as { conversationId?: string }).conversationId || "temp-" + Date.now() }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
export const revalidate = 0
