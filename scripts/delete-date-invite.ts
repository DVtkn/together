import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const inviteId = process.argv[2]
if (!inviteId) {
  console.error('usage: tsx scripts/delete-date-invite.ts <inviteId>')
  process.exit(1)
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  const res = await prisma.dateInvite.deleteMany({ where: { id: inviteId } })
  console.log('DELETED_INVITES', res.count)
  await prisma.$disconnect()
  await pool.end()
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
