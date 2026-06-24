import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const taskId = 311940;
  console.log(`=== INSPECT TASK ID: ${taskId} ===`);
  const t = await prisma.syncTask.findUnique({
    where: { id: taskId }
  });

  if (t) {
    console.log(`- Task ID: ${t.id}`);
    console.log(`- Date: ${t.date.toISOString().split('T')[0]}`);
    console.log(`- Branch: ${t.branch_name} (${t.branch_id})`);
    console.log(`- Type: ${t.type}`);
    console.log(`- Status: ${t.status}`);
    console.log(`- Mode: ${t.mode}`);
    console.log(`- Completed Details: ${t.completed_details || 0}/${t.total_details || 0}`);
    console.log(`- Error Message: ${t.error_message || 'None'}`);
  } else {
    console.log(`Task ID ${taskId} not found in database.`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
