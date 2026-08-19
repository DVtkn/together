import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

const REDIRECTS: Record<string, string> = {
  '/dashboard/chat': '/dashboard/ai',
  '/dashboard/pulse': '/dashboard#pulse',
  '/dashboard/challenges': '/dashboard#challenges',
  '/dashboard/partner': '/dashboard#partner',
  '/dashboard/report': '/dashboard/couple#report',
  '/dashboard/assessments': '/dashboard/couple#tests',
  '/dashboard/astro': '/dashboard/couple#synastry',
  '/dashboard/memories': '/dashboard/date#memories',
  '/dashboard/rituals': '/dashboard#challenges',
  '/dashboard/letters': '/dashboard/ai#letters',
  '/dashboard/venues': '/dashboard/date',
  '/pulse': '/dashboard#pulse',
  '/challenges': '/dashboard#challenges',
  '/partner': '/dashboard#partner',
  '/report': '/dashboard/couple#report',
  '/assessments': '/dashboard/couple#tests',
  '/astro': '/dashboard/couple#synastry',
  '/memories': '/dashboard/date#memories',
  '/rituals': '/dashboard#challenges',
  '/letters': '/dashboard/ai',
  '/chat': '/dashboard/ai',
}

const DAILY_ANCHORS: Record<string, string> = {
  mood: 'mood',
  pulse: 'pulse',
  challenges: 'challenges',
  partner: 'partner',
  warmth: 'partner',
  rituals: 'challenges',
}

export default async function proxy(req: NextRequest) {
  const url = new URL(req.url)
  if (url.pathname === '/dashboard/daily' || url.pathname.startsWith('/dashboard/daily/')) {
    const anchor = DAILY_ANCHORS[url.hash.replace(/^#/, '')]
    const target = new URL(url.href)
    target.pathname = '/dashboard'
    target.search = ''
    target.hash = anchor ? `#${anchor}` : ''
    return NextResponse.redirect(target, 301)
  }
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
  matcher: [
    '/dashboard/:path*',
    '/signin',
    '/register',
    '/pulse/:path*',
    '/challenges/:path*',
    '/partner/:path*',
    '/report/:path*',
    '/assessments/:path*',
    '/astro/:path*',
    '/memories/:path*',
    '/rituals/:path*',
    '/letters/:path*',
    '/chat/:path*',
  ],
}
