'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function RedirectPage({ href }: { href: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(href)
  }, [router, href])
  return <div className="loading-screen"><div className="loading-icon">💜</div></div>
}