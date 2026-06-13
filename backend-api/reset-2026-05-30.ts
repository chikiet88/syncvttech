import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reset() {
  const targetDate = new Date('2026-05-30T00:00:00.000Z');
  console.log('🔄 Đang đặt lại trạng thái các task cho ngày 2026-05-30...');
  
  const result = await prisma.syncTask.updateMany({
    where: {
      date: targetDate
    },
    data: {
      status: 'PENDING',
      completed_details: 0,
      total_details: 0,
      error_message: null
    }
  });
  
  console.log(`✅ Đã đặt lại ${result.count} tasks thành PENDING.`);
  await prisma.$disconnect();
}

reset();
