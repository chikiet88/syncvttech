
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetTasks() {
  console.log('🔄 Đang reset các task gần đây...');
  
  const result = await prisma.syncTask.updateMany({
    where: {
      date: new Date('2026-06-01T00:00:00.000Z')
    },
    data: {
      status: 'PENDING',
      completed_details: 0,
      total_details: 0,
      error_message: null
    }
  });
  
  console.log(`✅ Đã reset ${result.count} tasks.`);
  await prisma.$disconnect();
}

resetTasks();
