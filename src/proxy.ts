import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

export default async function proxy(req: Request) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET })
  const isLoggedIn = !!token
  const url = new URL(req.url)
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