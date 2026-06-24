import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function main() {
  const connection = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const queue = new Queue('sync-queue', { connection });
  console.log("=== PRIORITIZED JOBS BREAKDOWN ===");

  const prioritized = await queue.getJobs(['prioritized']);
  console.log(`Total prioritized jobs: ${prioritized.length}`);

  const types: Record<string, number> = {};
  prioritized.forEach(j => {
    const type = j.data.type || 'unknown';
    types[type] = (types[type] || 0) + 1;
  });

  console.log("Breakdown by job data type:");
  for (const [type, count] of Object.entries(types)) {
    console.log(`- ${type}: ${count} jobs`);
  }

  // Print first 5 sync-task jobs if they exist
  const syncTaskJobs = prioritized.filter(j => j.data.type === 'sync-task');
  console.log(`\nSync task jobs in queue: ${syncTaskJobs.length}`);
  syncTaskJobs.slice(0, 5).forEach(j => {
    console.log(`- Job ID: ${j.id} | TaskID: ${j.data.data.taskId}`);
  });

  connection.disconnect();
}

main().catch(console.error);
