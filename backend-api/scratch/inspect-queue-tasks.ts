import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function inspect() {
  console.log('🔄 Connecting to Redis...');
  const redis = new IORedis({
    host: '100.111.97.70',
    port: 12004,
  });

  const queue = new Queue('sync-queue', { connection: redis });
  const counts = await queue.getJobCounts();
  console.log('Current Queue Counts:', counts);

  const jobs = await queue.getJobs(['prioritized'], 0, 5000);
  console.log(`Retrieved ${jobs.length} prioritized jobs.`);

  const parentTaskCounts: Record<string, number> = {};
  const jobTypes: Record<string, number> = {};

  for (const job of jobs) {
    const type = job.data?.type || 'unknown';
    jobTypes[type] = (jobTypes[type] || 0) + 1;

    if (type === 'sync-customer-detail') {
      const parentTaskId = job.data?.data?.parentTaskId || 'no-task-id';
      parentTaskCounts[parentTaskId] = (parentTaskCounts[parentTaskId] || 0) + 1;
    }
  }

  console.log('\nJob Types in prioritized queue:');
  console.log(jobTypes);

  console.log('\nPrioritized Jobs grouped by parentTaskId:');
  for (const [taskId, count] of Object.entries(parentTaskCounts)) {
    console.log(`- Task ID: ${taskId} | Pending jobs: ${count}`);
  }

  redis.disconnect();
}

inspect().catch(console.error);
