import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function main() {
  const connection = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const queue = new Queue('sync-queue', { connection });

  console.log('Inspecting prioritized jobs...');
  // Prioritized jobs are stored in zset `bull:sync-queue:prioritized`
  const prioritizedJobIds = await connection.zrange('bull:sync-queue:prioritized', 0, 10);
  console.log(`First 10 prioritized job IDs:`, prioritizedJobIds);

  for (const id of prioritizedJobIds) {
    const job = await queue.getJob(id);
    if (job) {
      console.log(`- Job ID: ${job.id}, Type: ${job.data?.type}, Status: ${await job.getState()}, Data:`, JSON.stringify(job.data?.data));
    } else {
      console.log(`- Job ID: ${id} not found in job hashes!`);
    }
  }

  connection.disconnect();
}

main().catch(console.error);
