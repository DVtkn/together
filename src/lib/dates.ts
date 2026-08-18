export function parseRuDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return null
  const day = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const year = parseInt(m[3], 10)
  if (month < 1 || month > 12) return null
  const d = new Date(year, month - 1, day)
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null
  }
  return d
}

export function toRuDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

export function relationshipParts(from: Date, now: Date): { y: number; m: number; d: number } {
  let y = now.getFullYear() - from.getFullYear()
  let m = now.getMonth() - from.getMonth()
  let d = now.getDate() - from.getDate()
  if (d < 0) {
    m--
    d += new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  }
  if (m < 0) {
    y--
    m += 12
  }
  return { y, m, d }
}

export function formatTogether(parts: { y: number; m: number; d: number }): string {
  const { y, m, d } = parts
  if (y > 0) return `${y} г ${m} мес ${d} дн`
  if (m > 0) return `${m} мес ${d} дн`
  return `${d} дн`
}
