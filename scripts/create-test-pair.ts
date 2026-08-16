import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const a = process.argv[2]
const b = process.argv[3]
if (!a || !b) {
  console.error('usage: tsx scripts/create-test-pair.ts <userA> <userB>')
  process.exit(1)
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  const hash = await bcrypt.hash('1234', 12)
  for (const username of [a, b]) {
    const existing = await prisma.user.findUnique({ where: { username } })
    if (!existing) {
      await prisma.user.create({
        data: {
          id: `u_${username}_${Math.random().toString(36).slice(2, 8)}`,
          username,
          name: username,
          passwordHash: hash,
        },
      })
      console.log('created', username)
    } else {
      console.log('exists', username)
    }
  }

  const ua = await prisma.user.findUnique({ where: { username: a } })
  const ub = await prisma.user.findUnique({ where: { username: b } })
  const couple = await prisma.couple.create({
    data: {
      id: `cp_${Math.random().toString(36).slice(2, 14)}`,
      status: 'ACTIVE',
      partnerAId: ua!.id,
      partnerBId: ub!.id,
      updatedAt: new Date(),
    },
  })
  console.log('couple', couple.id)

  await prisma.$disconnect()
  await pool.end()
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })