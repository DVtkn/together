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

const PUBLIC_PATHS = [
  '/',
  '/signin',
  '/register',
  '/reset-password',
  '/privacy',
  '/terms',
  '/api/auth',
  '/api/crisis-resources',
  '/icons',
  '/manifest.webmanifest',
  '/sw.js',
  '/favicon.ico',
  '/og-image.png',
  '/robots.txt',
  '/sitemap.xml',
]

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))
}

export default async function middleware(request: NextRequest) {
  const { pathname, search, hash } = request.nextUrl
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    if (origin && host && !origin.endsWith(host)) {
      return NextResponse.json(
        { error: 'bad origin' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  if (pathname === '/dashboard/daily' || pathname.startsWith('/dashboard/daily/')) {
    const anchor = DAILY_ANCHORS[hash.replace(/^#/, '')]
    const target = new URL(request.url)
    target.pathname = '/dashboard'
    target.search = ''
    target.hash = anchor ? `#${anchor}` : ''
    return NextResponse.redirect(target, 301)
  }

  const redirect = REDIRECTS[pathname]
  if (redirect) {
    const [path, h] = redirect.split('#')
    const target = new URL(request.url)
    target.pathname = path
    target.search = ''
    if (h) target.hash = h
    return NextResponse.redirect(target, 301)
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: request.nextUrl.protocol === 'https:',
  })
  const isLoggedIn = !!token
  const isOnDashboard = pathname.startsWith('/dashboard')
  const isOnAuth = pathname === '/signin' || pathname === '/register'

  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const response = NextResponse.next()

  if (!isPublicPath(pathname)) {
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|robots.txt|sitemap.xml).*)',
  ],
}