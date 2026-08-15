import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { getApiContext, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { buildMessages, safeParseResponse, isValidContent, handleAIError } from "@/lib/ai/provider"
import { SYSTEM_PROMPT } from "@/lib/ai/prompt"

const OPENROUTER_API_BASE = process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1"
const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error("AI API key not configured. Set OPENROUTER_API_KEY in .env.local")
}

// Основная модель + резервная на случай rate-limit (429) на free-модели
const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free"
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || "liquid/lfm-2.5-2.6b:free"

interface AIProviderResult {
  ok: boolean
  status: number
  content?: string
  usage?: { input: number; output: number }
}

async function callProvider(model: string, messages: unknown[]): Promise<AIProviderResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(OPENROUTER_API_BASE + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    })

    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, status: response.status }
    }

    if (!response.ok) {
      return { ok: false, status: response.status }
    }

    const parsed = safeParseResponse(data as never)
    if (!isValidContent(parsed.content)) {
      return { ok: false, status: 500 }
    }

    return { ok: true, status: response.status, content: parsed.content, usage: parsed.usage }
  } catch {
    return { ok: false, status: 0 }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest) {
  const rl = await rateLimit("ai", request.headers.get("x-forwarded-for") || "anon")
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  const ctx = await getApiContext()
  if (!ctx) return unauthorized()

  if (!ctx.couple) {
    return NextResponse.json({ conversations: [] })
  }

  const conversations = await prisma.aIConversation.findMany({
    where: { coupleId: ctx.couple.id },
    include: { AIMessage: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 30,
  })

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title || "Новый диалог",
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: c.AIMessage[0]?.content || "",
    })),
  })
}

export async function POST(request: NextRequest) {
  let body: { message?: string; conversationId?: string } = {}
  try {
    const rl = await rateLimit("ai", request.headers.get("x-forwarded-for") || "anon")
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      )
    }

    const ctx = await getApiContext()
    if (!ctx) return unauthorized()

    body = await request.json()
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

    const couple = ctx.couple
    if (!couple) {
      return NextResponse.json({ error: "Чтобы общаться с ИИ, нужно быть в паре" }, { status: 400 })
    }

    // Найти или создать беседу
    let conversationId = body.conversationId || null
    if (conversationId) {
      const existing = await prisma.aIConversation.findUnique({ where: { id: conversationId } })
      if (!existing || existing.coupleId !== couple.id) conversationId = null
    }
    if (!conversationId) {
      const created = await prisma.aIConversation.create({
        data: {
          id: `ai_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          coupleId: couple.id,
          title: message.slice(0, 60),
          updatedAt: new Date(),
        },
      })
      conversationId = created.id
    }

    // Сразу сохраняем сообщение пользователя — переписка не потеряется,
    // даже если ИИ не ответит (rate-limit, сеть и т.п.)
    await prisma.aIMessage.create({
      data: {
        id: `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        conversationId,
        userId: ctx.user.id,
        role: "USER",
        content: message,
        model: PRIMARY_MODEL,
      },
    })

    // История беседы (до 40 сообщений)
    const history = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 40,
    })

    const chatMessages = history.map((m) => ({
      role: m.role === "USER" ? "user" : m.role === "ASSISTANT" ? "assistant" : "system",
      content: m.content,
    }))

    const messages = buildMessages(SYSTEM_PROMPT, [...chatMessages, { role: "user", content: message }])

    // Пробуем основную модель, при 429 (rate-limit free-пула) — резервную
    let result = await callProvider(PRIMARY_MODEL, messages)
    if (!result.ok && result.status === 429) {
      console.log("Primary model rate-limited, falling back to", FALLBACK_MODEL)
      result = await callProvider(FALLBACK_MODEL, messages)
    }

    if (!result.ok || !result.content) {
      const isRateLimit = result.status === 429
      return NextResponse.json(
        {
          error: isRateLimit
            ? "ИИ временно перегружен (бесплатный лимит). Попробуйте через минуту."
            : result.status === 0
              ? "Нет ответа от ИИ. Проверьте соединение."
              : "ИИ не смог сформировать ответ. Попробуйте ещё раз.",
          conversationId,
        },
        { status: isRateLimit ? 429 : 502 }
      )
    }

    await prisma.$transaction([
      prisma.aIMessage.create({
        data: {
          id: `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          conversationId,
          role: "ASSISTANT",
          content: result.content,
          tokensInput: result.usage?.input,
          tokensOutput: result.usage?.output,
          model: PRIMARY_MODEL,
        },
      }),
      prisma.aIConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ])

    return NextResponse.json({
      conversationId,
      choices: [{ index: 0, message: { role: "assistant", content: result.content }, finish_reason: "stop" }],
      usage: { prompt_tokens: result.usage?.input || 0, completion_tokens: result.usage?.output || 0, total_tokens: (result.usage?.input || 0) + (result.usage?.output || 0) },
    })
  } catch (error: unknown) {
    console.error("AI API error:", error)
    return NextResponse.json({ error: handleAIError(error as Error), conversationId: (body as { conversationId?: string }).conversationId || "temp-" + Date.now() }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
export const revalidate = 0