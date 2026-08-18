'use client'

import { useEffect, useState } from 'react'
import { relationshipParts, formatTogether } from '@/lib/dates'

export function TogetherCounter({ from }: { from: Date }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const anchor = new Date(from)
  anchor.setFullYear(now.getFullYear(), now.getMonth(), now.getDate())
  let rem = now.getTime() - anchor.getTime()
  if (rem < 0) rem += 86400000
  const p = (v: number) => String(v).padStart(2, '0')
  const clock = `${p(Math.floor(rem / 36e5))}:${p(Math.floor(rem / 6e4) % 60)}:${p(Math.floor(rem / 1e3) % 60)}`

  const datePart = formatTogether(relationshipParts(from, now))

  return (
    <div className="together-num">
      <b>{datePart}</b>
      <span className="tick">{clock}</span>
    </div>
  )
}