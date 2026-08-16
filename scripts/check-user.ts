import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  const u = await prisma.user.findUnique({ where: { username: 'vtkn' } })
  console.log('FOUND:', !!u)
  if (u) console.log(JSON.stringify({ id: u.id, username: u.username, name: u.name, email: u.email, hasPwd: !!u.passwordHash, coupleId: u.coupleId }))
  await prisma.$disconnect()
  await pool.end()
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
