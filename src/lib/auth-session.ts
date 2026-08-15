import { auth } from '@/lib/auth'

export async function getCurrentUserSession() {
  const session = await auth()
  return session
}
