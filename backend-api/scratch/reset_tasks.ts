import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const targetDateStr = '2026-06-16';
  const targetDate = new Date(targetDateStr);

  console.log(`Resetting ALL sync tasks for ${targetDateStr} back to PENDING...`);

  await prisma.syncTask.updateMany({
    where: {
      date: targetDate,
    },
    data: {
      status: 'PENDING',
      error_message: 'Full reset back to PENDING to rerun manual sync with new code updates',
      records_count: 0,
      customers_count: 0,
      appointments_count: 0,
      completed_details: 0,
      total_details: 0
    },
  });

  console.log('Reset completed!');
  
  const tasks = await prisma.syncTask.findMany({
    where: {
      date: targetDate,
    },
  });

  console.log('\nUpdated tasks state:');
  for (const t of tasks) {
    console.log(`- ID: ${t.id}, Branch: ${t.branch_name} (ID: ${t.branch_id}), Status: ${t.status}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
