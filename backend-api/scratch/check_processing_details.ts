import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECTING PROCESSING TASKS ===");
  const processingTasks = await prisma.syncTask.findMany({
    where: {
      status: 'PROCESSING'
    },
    orderBy: [
      { updated_at: 'asc' }
    ]
  });

  console.log(`Total PROCESSING tasks: ${processingTasks.length}`);
  for (const t of processingTasks) {
    const dateStr = t.date.toISOString().split('T')[0];
    console.log(`- Task ID: ${t.id} | Date: ${dateStr} | Branch: ${t.branch_name} | Progress: ${t.completed_details}/${t.total_details} | Updated At: ${t.updated_at.toISOString()}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
