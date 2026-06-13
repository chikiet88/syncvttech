import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('--- 📋 LIST OF ALL TASKS FOR 2026-06-01 ---');
  
  const start = new Date('2026-06-01T00:00:00.000Z');
  const end = new Date('2026-06-01T23:59:59.999Z');

  const tasks = await prisma.syncTask.findMany({
    where: {
      date: { gte: start, lte: end }
    },
    orderBy: { branch_id: 'asc' }
  });

  console.log(`Found ${tasks.length} tasks for 2026-06-01:`);
  tasks.forEach(t => {
    console.log(`- Branch ID: ${t.branch_id} (${t.branch_name || 'N/A'}), Type: ${t.type}, Status: ${t.status}, total_details: ${t.total_details}, completed_details: ${t.completed_details}`);
  });

  await prisma.$disconnect();
}

check();
