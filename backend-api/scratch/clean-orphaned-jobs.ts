import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

async function clean() {
  console.log('🔄 Connecting to Redis and Postgres...');
  const redis = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const prisma = new PrismaClient();

  const queue = new Queue('sync-queue', { connection: redis });
  const counts = await queue.getJobCounts();
  console.log('Current Queue Counts:', counts);

  console.log('Fetching active tasks from Database...');
  const activeTasks = await prisma.syncTask.findMany({
    select: { id: true }
  });
  const activeTaskIds = new Set(activeTasks.map(t => t.id));
  console.log(`Found ${activeTaskIds.size} active tasks in Database.`);

  console.log('Fetching prioritized jobs from Redis...');
  const jobs = await queue.getJobs(['prioritized'], 0, 5000);
  console.log(`Retrieved ${jobs.length} prioritized jobs.`);

  let removedCount = 0;
  let keepCount = 0;

  for (const job of jobs) {
    const type = job.data?.type || 'unknown';
    if (type === 'sync-customer-detail') {
      const parentTaskId = job.data?.data?.parentTaskId;
      if (!parentTaskId) {
        // No task ID? Keep or remove? Let's keep just in case, or check.
        keepCount++;
        continue;
      }

      if (!activeTaskIds.has(parentTaskId)) {
        // Orphaned job! Remove it.
        try {
          await job.remove();
          removedCount++;
          if (removedCount % 100 === 0) {
            console.log(`🗑️ Removed ${removedCount} orphaned jobs...`);
          }
        } catch (removeErr: any) {
          console.warn(`⚠️ Could not remove job ${job.id}: ${removeErr.message}`);
          keepCount++;
        }
      } else {
        keepCount++;
      }
    } else {
      keepCount++;
    }
  }

  console.log(`\n✅ Queue Cleanup Completed.`);
  console.log(`- Removed: ${removedCount} orphaned jobs`);
  console.log(`- Kept: ${keepCount} valid jobs`);

  const finalCounts = await queue.getJobCounts();
  console.log('Final Queue Counts:', finalCounts);

  redis.disconnect();
  await prisma.$disconnect();
}

clean().catch(console.error);
