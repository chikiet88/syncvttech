import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@100.111.97.70:12003/db_tazagroup_vttech_sync"
    }
  }
});

async function main() {
  console.log("Checking sync tasks for recent days...");
  const start = new Date('2026-06-13T00:00:00.000Z');
  const end = new Date('2026-06-15T23:59:59.999Z');

  const tasks = await prisma.syncTask.findMany({
    where: {
      date: {
        gte: start,
        lte: end
      }
    },
    orderBy: [
      { date: 'desc' },
      { branch_id: 'asc' }
    ]
  });

  console.log(`Found ${tasks.length} sync tasks:`);
  for (const t of tasks) {
    const dateStr = t.date.toISOString().split('T')[0];
    console.log(`- Date: ${dateStr}, Branch: ${t.branch_id} (${t.branch_name}), Status: ${t.status}, Type: ${t.type}, Completed Details: ${t.completed_details}/${t.total_details}, Appointments Count: ${t.appointments_count}`);
  }

  // Count by status
  const statusCounts = await prisma.syncTask.groupBy({
    by: ['status'],
    _count: true
  });
  console.log("\nSyncTask Status summary (all time):", statusCounts);

  await prisma.$disconnect();
}

main().catch(console.error);
