import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== CHECKING OLDEST INCOMPLETE SYNC TASKS ===");

  const incompleteTasks = await prisma.syncTask.findMany({
    where: {
      status: {
        not: 'SUCCESS'
      }
    },
    orderBy: [
      { date: 'asc' },
      { branch_name: 'asc' },
      { type: 'asc' }
    ],
    take: 20
  });

  console.log(`\nOldest 20 incomplete tasks:`);
  for (const t of incompleteTasks) {
    const dateStr = t.date.toISOString().split('T')[0];
    console.log(`- Date: ${dateStr} | Type: ${t.type} | Status: ${t.status} | Branch: ${t.branch_name || 'N/A'} (ID: ${t.branch_id || 'N/A'}) | Completed Details: ${t.completed_details || 0}/${t.total_details || 0} | Err: ${t.error_message || 'None'}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
