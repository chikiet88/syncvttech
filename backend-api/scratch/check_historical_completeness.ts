import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetDate = new Date('2026-06-23T23:59:59.000Z');
  console.log(`=== CHECKING COMPLETENESS FOR DATES <= 2026-06-23 ===`);

  const incompleteTasks = await prisma.syncTask.findMany({
    where: {
      date: {
        lte: targetDate
      },
      status: {
        not: 'SUCCESS'
      }
    },
    orderBy: [
      { date: 'asc' },
      { branch_name: 'asc' }
    ]
  });

  console.log(`Total incomplete tasks before or on 2026-06-23: ${incompleteTasks.length}`);

  if (incompleteTasks.length > 0) {
    console.log("\nIncomplete tasks list (before or on 2026-06-23):");
    incompleteTasks.forEach(t => {
      console.log(`- Date: ${t.date.toISOString().split('T')[0]} | Branch: ${t.branch_name} | Status: ${t.status} | Progress: ${t.completed_details}/${t.total_details}`);
    });
  } else {
    console.log("\n🎉 All historical tasks up to 2026-06-23 are 100% SUCCESS!");
    console.log("No more new historical data will insert, and sheet rows before 2026-06-23 are fully stabilized.");
  }

  await prisma.$disconnect();
}

main().catch(console.error);
