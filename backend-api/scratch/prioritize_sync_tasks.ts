import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function main() {
  const connection = new IORedis({
    host: '100.111.97.70',
    port: 26380,
  });

  const queue = new Queue('sync-queue', { connection });
  console.log("=== PRIORITIZING DAILY HEADER SYNC TASKS ===");

  const prioritized = await queue.getJobs(['prioritized']);
  console.log(`Total prioritized jobs in queue: ${prioritized.length}`);

  let changedCount = 0;
  for (const job of prioritized) {
    if (job.data.type === 'sync-task') {
      try {
        // In BullMQ, we can change priority using changePriority
        // We set it to 1 (lower value = higher priority)
        await job.changePriority({ priority: 1 });
        changedCount++;
        if (changedCount <= 5) {
          console.log(`- Changed job ${job.id} (Task ${job.data.data.taskId}) priority to 1.`);
        }
      } catch (err: any) {
        console.error(`Failed to change priority for job ${job.id}: ${err.message}`);
      }
    }
  }

  console.log(`\nSuccessfully prioritized ${changedCount} 'sync-task' jobs to priority 1!`);
  
  // Verify counts
  const newPrioritized = await queue.getJobs(['prioritized']);
  console.log(`Remaining jobs in prioritized queue: ${newPrioritized.length}`);

  connection.disconnect();
}

main().catch(console.error);
