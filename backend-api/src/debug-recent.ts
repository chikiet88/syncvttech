
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Finding Today\'s Synced Records ---');

  const latestDailyByCreated = await prisma.dailyCustomer.findMany({
    orderBy: { id: 'desc' },
    take: 10
  });
  console.log('Latest 10 Daily Customer Records:', JSON.stringify(latestDailyByCreated, null, 2));

  const latestRevenueBySynced = await prisma.revenueTransaction.findMany({
    orderBy: { synced_at: 'desc' },
    take: 10
  });
  console.log('Latest 10 Revenue Transaction Records:', JSON.stringify(latestRevenueBySynced, null, 2));
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const recentSyncTasks = await prisma.syncTask.findMany({
      where: { updated_at: { gte: today } },
      orderBy: { updated_at: 'desc' },
      take: 5
  });
  console.log('Recent Sync Tasks:', JSON.stringify(recentSyncTasks, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
