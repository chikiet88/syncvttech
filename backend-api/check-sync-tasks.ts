import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function check() {
  console.log('--- 📋 KIỂM TRA DETAIL SYNC TASKS CHO HÔM QUA (2026-06-01) ---');
  
  const start = new Date('2026-06-01T00:00:00.000Z');
  const end = new Date('2026-06-01T23:59:59.999Z');

  const tasks = await prisma.syncTask.findMany({
    where: {
      type: 'DETAIL',
      date: { gte: start, lte: end }
    },
    orderBy: { date: 'desc' }
  });

  console.log(`Found ${tasks.length} DETAIL tasks for 2026-06-01:`);
  tasks.forEach(t => {
    console.log(`- ID: ${t.id}, Status: ${t.status}, Mode: ${t.mode}, TotalCustomers: ${t.total_customers}, CompletedDetails: ${t.completed_details}/${t.total_details_tasks}`);
  });

  await prisma.$disconnect();
}

check();
