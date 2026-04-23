
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.syncTask.findMany({
    where: {
      date: {
        gte: new Date('2019-06-01'),
        lte: new Date('2019-06-10'),
      }
    },
    orderBy: { date: 'asc' },
  });

  console.log('--- SYNC TASKS JUNE 2019 ---');
  tasks.forEach(t => {
    console.log(`ID: ${t.id} | Date: ${t.date.toISOString().split('T')[0]} | Branch: ${t.branch_id} | Status: ${t.status} | Records: ${t.records_count} | Rev: ${t.revenue_total}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
