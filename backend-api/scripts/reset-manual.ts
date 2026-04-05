import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function reset() {
  const prisma = new PrismaClient();
  
  console.log('🔄 Đang kết nối Redis...');
  const redis = new IORedis({
    host: 'localhost',
    port: 12004,
  });

  try {
    console.log('🔄 Đang xóa hàng đợi BullMQ (sync-queue)...');
    const queue = new Queue('sync-queue', { connection: redis });
    await queue.drain(true);
    await queue.clean(0, 1000, 'active');
    await queue.clean(0, 1000, 'wait');
    await queue.clean(0, 1000, 'delayed');
    await queue.clean(0, 1000, 'failed');
    await queue.close();
    console.log('✅ Đã xóa các Job trong BullMQ');
  } catch (e) {
    console.error('⚠️ Lỗi khi xóa BullMQ:', e.message);
  }

  try {
    console.log('🔄 Đang xóa SyncTasks trong Database...');
    const deleted = await prisma.syncTask.deleteMany({});
    console.log(`✅ Đã xóa ${deleted.count} task trong Database`);
    
    // Cũng xóa CrawlLog nếu cần (tùy ý)
    // await prisma.crawlLog.deleteMany({});
  } catch (e) {
    console.error('⚠️ Lỗi khi xóa SyncTasks:', e.message);
  }

  await prisma.$disconnect();
  redis.disconnect();
  console.log('✨ Đã hoàn thành Reset toàn bộ hệ thống.');
  process.exit(0);
}

reset();
