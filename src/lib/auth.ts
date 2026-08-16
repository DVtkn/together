import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Логин', type: 'text' },
        password: { label: 'Пароль', type: 'password' },
      },
      authorize: async (credentials) => {
        const login = String(credentials?.username ?? '').trim().toLowerCase()
        const password = String(credentials?.password ?? '')

        if (!login || !password) return null

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: login, mode: 'insensitive' } },
              ...(login.includes('@') ? ([{ email: { equals: login, mode: 'insensitive' as const } }] as const) : []),
            ],
          },
        })

        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, username: user.username, name: user.name, email: user.email, image: user.image }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        if (user.username) token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id
      if (token.username) session.user.username = token.username
      return session
    },
  },
})

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
  interface User {
    id: string
    username: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username?: string
  }
}