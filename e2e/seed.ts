import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { E2E_USERNAME, E2E_PARTNER, E2E_PASSWORD } from './seed-constants'

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10)

  // Удаляем предыдущих тестовых юзеров (каскадом по coupleId)
  const prev = await prisma.user.findMany({
    where: { username: { in: [E2E_USERNAME, E2E_PARTNER] } },
    select: { id: true, coupleId: true },
  })
  const coupleIds = [...new Set(prev.map((u) => u.coupleId).filter(Boolean))]
  if (coupleIds.length) {
    await prisma.couple.deleteMany({ where: { id: { in: coupleIds as string[] } } })
  }
  await prisma.user.deleteMany({ where: { username: { in: [E2E_USERNAME, E2E_PARTNER] } } })

  const userA = await prisma.user.create({
    data: { id: 'usr_e2e_a', username: E2E_USERNAME, name: 'E2E Дим', passwordHash },
  })
  const userB = await prisma.user.create({
    data: { id: 'usr_e2e_b', username: E2E_PARTNER, name: 'E2E Аня', passwordHash },
  })

  const couple = await prisma.couple.create({
    data: {
      id: 'cp_e2e',
      partnerAId: userA.id,
      partnerBId: userB.id,
      status: 'ACTIVE',
      startedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  await prisma.user.updateMany({
    where: { id: { in: [userA.id, userB.id] } },
    data: { coupleId: couple.id },
  })

  console.log(`E2E seed done: ${E2E_USERNAME} + ${E2E_PARTNER} linked`)
  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})