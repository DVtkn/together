import { prisma } from '../src/lib/prisma'

async function main() {
  const sovaMsgs = await prisma.aIMessage.deleteMany({})
  const sovaConvs = await prisma.aIConversation.deleteMany({})
  const coupleMsgs = await prisma.coupleMessage.deleteMany({})
  console.log(JSON.stringify({
    aIMessagesDeleted: sovaMsgs.count,
    aIConversationsDeleted: sovaConvs.count,
    coupleMessagesDeleted: coupleMsgs.count,
  }, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())