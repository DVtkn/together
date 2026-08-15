import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

let redis: Redis | null = null
if (upstashUrl && upstashToken) {
  try {
    redis = new Redis({ url: upstashUrl, token: upstashToken })
  } catch {
    redis = null
  }
}

interface LimitRule {
  limit: number
  window: number // seconds
}

const RULES: Record<string, LimitRule> = {
  ai: { limit: 20, window: 60 },
  auth: { limit: 10, window: 900 }, // 10 за 15 мин
  register: { limit: 5, window: 900 },
  assessments: { limit: 60, window: 60 },
  couples: { limit: 10, window: 60 },
  default: { limit: 120, window: 60 },
}

// In-memory fallback (single-instance dev)
const mem = new Map<string, { count: number; resetAt: number }>()

export function getRule(group: keyof typeof RULES): LimitRule {
  return RULES[group] || RULES.default
}

export async function rateLimit(group: keyof typeof RULES, identifier: string) {
  const rule = getRule(group)

  if (redis) {
    try {
      const rl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(rule.limit, `${rule.window} s`),
      })
      const res = await rl.limit(identifier)
      return {
        ok: res.success,
        remaining: res.remaining,
        retryAfter: res.reset ? Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) : rule.window,
      }
    } catch {
      // fallback to memory
    }
  }

  const now = Date.now()
  const key = `${group}:${identifier}`
  const entry = mem.get(key)

  if (!entry || entry.resetAt < now) {
    mem.set(key, { count: 1, resetAt: now + rule.window * 1000 })
    return { ok: true, remaining: rule.limit - 1, retryAfter: rule.window }
  }

  entry.count += 1
  if (entry.count > rule.limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  return { ok: true, remaining: rule.limit - entry.count, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
}