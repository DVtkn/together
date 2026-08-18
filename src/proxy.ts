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
  '/dashboard/rituals': '/dashboard/daily#challenges',
  '/dashboard/letters': '/dashboard/ai#letters',
  '/dashboard/venues': '/dashboard/date',
  '/pulse': '/dashboard/daily#pulse',
  '/challenges': '/dashboard/daily#challenges',
  '/partner': '/dashboard/daily#partner',
  '/report': '/dashboard/couple#report',
  '/assessments': '/dashboard/couple#tests',
  '/astro': '/dashboard/couple#synastry',
  '/memories': '/dashboard/date#memories',
  '/rituals': '/dashboard/daily#challenges',
  '/letters': '/dashboard/ai',
  '/chat': '/dashboard/ai',
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
