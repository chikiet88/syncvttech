import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECTING 2026-01-01 TASK ===");
  const tasks = await prisma.syncTask.findMany({
    where: {
      date: new Date('2026-01-01T00:00:00.000Z')
    }
  });

  for (const t of tasks) {
    console.log(`Task ID: ${t.id}`);
    console.log(`- Date: ${t.date.toISOString().split('T')[0]}`);
    console.log(`- Branch: ${t.branch_name} (${t.branch_id})`);
    console.log(`- Status: ${t.status}`);
    console.log(`- Completed: ${t.completed_details}/${t.total_details}`);
    console.log(`- Updated At: ${t.updated_at.toISOString()}`);
    console.log(`- Error: ${t.error_message}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
