import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { buildMessages, safeParseResponse, isValidContent, handleAIError } from "@/lib/ai/provider"
import { SYSTEM_PROMPT } from "@/lib/ai/prompt"

const NVIDIA_API_BASE = process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1"
const apiKey = process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error("AI API key not configured. Set NVIDIA_API_KEY in .env.local")
}

export async function GET(
  request: NextRequest
) {
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
        "Authorization": "Bearer " + process.env.NVIDIA_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.NVIDIA_MODEL_PRIMARY || "meta/llama-4-maverick",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    }

    const response = await fetch(NVIDIA_API_BASE + "chat/completions", fetchParams)
    const data = await response.json()
    const parsed = safeParseResponse(data)

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
