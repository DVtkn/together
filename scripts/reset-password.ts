import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const username = process.argv[2]
const newPassword = process.argv[3]
if (!username || !newPassword) {
  console.error('usage: tsx scripts/reset-password.ts <username> <newPassword>')
  process.exit(1)
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  const u = await prisma.user.findUnique({ where: { username } })
  if (!u) {
    console.error('user not found:', username)
    process.exit(1)
  }
  const hash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash } })
  console.log('PASSWORD_RESET_OK for', username)
  await prisma.$disconnect()
  await pool.end()
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
