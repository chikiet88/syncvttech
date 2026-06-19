import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.syncTask.findMany({
    where: {
      date: new Date('2026-06-16')
    },
    orderBy: {
      branch_id: 'asc'
    }
  });

  console.log(`=== SYNC TASKS FOR 2026-06-16 ===`);
  for (const t of tasks) {
    console.log(`ID: ${t.id}, Branch: ${t.branch_name} (ID: ${t.branch_id}), Status: ${t.status}, Cust/App/Recs: ${t.customers_count}/${t.appointments_count}/${t.records_count}, Details Comp/Total: ${t.completed_details}/${t.total_details}, Updated: ${t.updated_at.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
