import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

const REDIRECTS: Record<string, string> = {
  '/dashboard/chat': '/dashboard/ai',
  '/dashboard/pulse': '/dashboard/daily#pulse',
  '/dashboard/challenges': '/dashboard/daily#challenges',
  '/dashboard/partner': '/dashboard/daily#partner',
  '/dashboard/report': '/dashboard/couple#report',
  '/dashboard/assessments': '/dashboard/couple#tests',
  '/dashboard/astro': '/dashboard/couple#synastry',
  '/dashboard/memories': '/dashboard/date#memories',
  '/dashboard/rituals': '/dashboard/daily#rituals',
  '/dashboard/letters': '/dashboard/ai#letters',
  '/dashboard/venues': '/dashboard/date',
}

export default async function proxy(req: NextRequest) {
  const url = new URL(req.url)
  const redirect = REDIRECTS[url.pathname]
  if (redirect) {
    const [path, hash] = redirect.split('#')
    const target = new URL(url.href)
    target.pathname = path
    target.search = ''
    if (hash) target.hash = hash
    return NextResponse.redirect(target, 301)
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: url.protocol === 'https:',
  })
  const isLoggedIn = !!token
  const isOnDashboard = url.pathname.startsWith('/dashboard')
  const isOnAuth = url.pathname === '/signin' || url.pathname === '/register'

  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/signin', url))
  }

  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/signin', '/register'],
}
