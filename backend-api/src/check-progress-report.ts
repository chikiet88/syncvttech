
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestSuccess = await prisma.syncTask.findFirst({
    where: { status: 'SUCCESS', date: { lt: new Date('2026-01-01') } },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  });

  const totalTasks = await prisma.syncTask.count({
    where: { date: { lt: new Date('2026-01-01') } }
  });
  
  const successTasks = await prisma.syncTask.count({
    where: { status: 'SUCCESS', date: { lt: new Date('2026-01-01') } }
  });

  console.log('--- SYNC PROGRESS REPORT ---');
  if (latestSuccess) {
    console.log(`Latest Success Date: ${latestSuccess.date.toISOString().split('T')[0]}`);
    console.log(`Last Updated At: ${latestSuccess.updated_at}`);
  } else {
    console.log('No successful historical tasks found.');
  }
  console.log(`Progress: ${successTasks} / ${totalTasks} tasks (${((successTasks/totalTasks)*100).toFixed(2)}%)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
