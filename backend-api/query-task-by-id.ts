import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const ids = [18, 35, 283338, 283339, 283340, 283341];
  console.log('--- 📋 INSPECT TASKS BY ID ---');
  
  const tasks = await prisma.syncTask.findMany({
    where: {
      id: { in: ids }
    }
  });

  tasks.forEach(t => {
    console.log(`- Task ID: ${t.id} | Date: ${t.date.toISOString().split('T')[0]} | Branch: ${t.branch_name} (${t.branch_id}) | Type: ${t.type} | Status: ${t.status} | Completed: ${t.completed_details}/${t.total_details}`);
  });

  await prisma.$disconnect();
}

check();
